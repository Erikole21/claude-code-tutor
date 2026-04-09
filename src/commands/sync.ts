import type { Command } from 'commander'
import { SKILLS_REGISTRY, mergeWithDiscovered, type SkillDefinition } from '../config/skills-registry.js'
import { loadConfig } from '../config/loader.js'
import { fetchDoc } from '../core/fetcher.js'
import { transformSkill } from '../core/transformer.js'
import { install, pruneManagedSkills } from '../core/installer.js'
import { discoverSkills, LLMS_TXT_URL } from '../core/discovery.js'
import { generateSkillIndex } from '../core/skill-index.js'
import {
  readMeta,
  writeMeta,
  isStale,
  loadDiscoveredSkills,
  persistDiscoveredSkills,
} from '../core/meta.js'
import { ensurePermissions } from '../core/hook-manager.js'
import { log, warn, setSilent } from '../utils/logger.js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

interface SyncOptions {
  force?: boolean
  ifStale?: string
  silent?: boolean
  skills?: string[]
  bundledOnly?: boolean
}

interface SyncResult {
  id: string
  action: 'updated' | 'skipped' | 'failed'
  transformer?: string
  error?: string
}

function getSkillsFallbackDir(): string {
  const thisFile = fileURLToPath(import.meta.url)
  const root = join(dirname(thisFile), '..')
  return join(root, 'skills-fallback')
}

function loadStaticSkillContent(skillId: string): string {
  const fallbackDir = getSkillsFallbackDir()
  const skillPath = join(fallbackDir, skillId, 'SKILL.md')
  return readFileSync(skillPath, 'utf-8')
}

function injectSkillIndex(content: string, discovered: SkillDefinition[]): string {
  const dynamicIndex = generateSkillIndex(SKILLS_REGISTRY, discovered).trimEnd()
  if (content.includes('## Skills disponibles')) {
    return content.replace(/## Skills disponibles[\s\S]*$/m, dynamicIndex)
  }
  return `${content.trimEnd()}\n\n${dynamicIndex}\n`
}

export async function syncCore(options: SyncOptions): Promise<SyncResult[]> {
  if (options.silent) {
    setSilent(true)
  }

  const config = await loadConfig()

  // Staleness check
  if (options.ifStale) {
    const maxAge = parseInt(options.ifStale, 10)
    if (!isNaN(maxAge) && !isStale(maxAge)) {
      setSilent(false)
      return []
    }
  }

  const meta = readMeta()
  let discoveredSkills = options.bundledOnly ? [] : loadDiscoveredSkills(meta)
  const registryWithDiscovered = options.bundledOnly
    ? SKILLS_REGISTRY
    : mergeWithDiscovered(discoveredSkills)

  // Filter skills
  let skills: SkillDefinition[]
  if (options.skills && options.skills.length > 0) {
    skills = registryWithDiscovered.filter((s) => options.skills!.includes(s.id))
  } else {
    const priorities = config.skills ?? ['critical', 'high']
    skills = registryWithDiscovered.filter((s) =>
      priorities.includes(s.priority) || priorities.includes('all'),
    )
  }

  const results: SyncResult[] = []
  let hasErrors = false

  if (options.force) {
    const allowedIds = new Set(skills.map((s) => s.id))
    const removedIds = pruneManagedSkills(allowedIds)
    for (const id of removedIds) {
      delete meta.skills[id]
      log(`  ✓ ${id} removed (obsolete managed skill)`)
    }
  }

  log('Syncing skills...')

  for (const skill of skills) {
    try {
      if (skill.static || options.bundledOnly) {
        // Install from bundled fallback content
        const fallbackIds = skill.manualSections
          ? skill.manualSections.map((s) => s.id)
          : [skill.id]
        for (const fid of fallbackIds) {
          try {
            let content = loadStaticSkillContent(fid)
            if (fid === 'pulse') {
              content = injectSkillIndex(content, discoveredSkills)
            }
            install([{ id: fid, content }])
            meta.skills[fid] = {
              syncedAt: new Date().toISOString(),
              transformedWith: 'fixed',
            }
          } catch {
            // No fallback available for this id
          }
        }
        results.push({ id: skill.id, action: 'updated', transformer: 'fixed' })
        log(`  ✓ ${skill.id} (bundled)`)
        continue
      }

      if (!skill.sourceUrl) {
        results.push({ id: skill.id, action: 'skipped' })
        continue
      }

      // Fetch with ETag
      const etag = options.force ? undefined : meta.etags[skill.sourceUrl]
      const fetchResult = await fetchDoc(skill.sourceUrl, etag)

      if (!fetchResult.changed) {
        results.push({ id: skill.id, action: 'skipped', transformer: meta.skills[skill.id]?.transformedWith })
        log(`  · ${skill.id} unchanged (304)`)
        continue
      }

      // Update ETag
      if (fetchResult.etag) {
        meta.etags[skill.sourceUrl] = fetchResult.etag
      }

      // Transform
      let transformed = await transformSkill(skill, fetchResult.content)

      // If manual split produced no results, fall back to bundled skills
      if (transformed.length === 0 && skill.manualSections && skill.manualSections.length > 0) {
        warn(`  ⚠ Split failed for ${skill.id}, using bundled fallback`)
        for (const section of skill.manualSections) {
          try {
            let fallbackContent = loadStaticSkillContent(section.id)
            if (section.id === 'pulse') {
              fallbackContent = injectSkillIndex(fallbackContent, discoveredSkills)
            }
            transformed.push({
              id: section.id,
              filename: `.claude/skills/${section.id}/SKILL.md`,
              content: fallbackContent,
              transformedWith: 'fixed',
            })
          } catch {
            warn(`  ✗ No fallback found for ${section.id}`)
          }
        }
      }

      // Install
      install(transformed.map((t) => ({ id: t.id, content: t.content })))

      // Update per-skill meta
      for (const t of transformed) {
        meta.skills[t.id] = {
          syncedAt: new Date().toISOString(),
          transformedWith: t.transformedWith,
          etag: fetchResult.etag,
        }
      }

      results.push({ id: skill.id, action: 'updated', transformer: transformed[0]?.transformedWith })
      log(`  ✓ ${skill.id} updated`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)

      // Try bundled fallback before giving up
      const fallbackIds = skill.manualSections
        ? skill.manualSections.map((s) => s.id)
        : [skill.id]
      let recovered = false

      for (const fid of fallbackIds) {
        try {
          let fallbackContent = loadStaticSkillContent(fid)
          if (fid === 'pulse') {
            fallbackContent = injectSkillIndex(fallbackContent, discoveredSkills)
          }
          install([{ id: fid, content: fallbackContent }])
          meta.skills[fid] = {
            syncedAt: new Date().toISOString(),
            transformedWith: 'fixed',
          }
          recovered = true
        } catch {
          // No fallback available for this id
        }
      }

      if (recovered) {
        warn(`  ⚠ ${skill.id} fetch failed, installed from bundled fallback`)
        results.push({ id: skill.id, action: 'updated', transformer: 'fixed' })
      } else {
        hasErrors = true
        warn(`  ✗ ${skill.id} failed: ${msg}`)
        results.push({ id: skill.id, action: 'failed', error: msg })
      }
    }
  }

  if (!options.bundledOnly && (!options.skills || options.skills.length === 0)) {
    const knownDiscoveredIds = new Set(discoveredSkills.map((skill) => skill.id))
    const previousDiscoveryEtag = meta.etags[LLMS_TXT_URL]

    try {
      const latestDiscovered = await discoverSkills(SKILLS_REGISTRY, meta)
      const discoveryChanged = previousDiscoveryEtag !== meta.etags[LLMS_TXT_URL]

      if (latestDiscovered.length > 0 || discoveryChanged) {
        persistDiscoveredSkills(meta, latestDiscovered)
        discoveredSkills = latestDiscovered
      }

      const newlyDiscovered = latestDiscovered.filter((skill) => !knownDiscoveredIds.has(skill.id))
      for (const skill of newlyDiscovered) {
        try {
          if (!skill.sourceUrl) {
            continue
          }

          const etag = options.force ? undefined : meta.etags[skill.sourceUrl]
          const fetchResult = await fetchDoc(skill.sourceUrl, etag)
          if (!fetchResult.changed) {
            results.push({
              id: skill.id,
              action: 'skipped',
              transformer: meta.skills[skill.id]?.transformedWith,
            })
            log(`  · ${skill.id} unchanged (304)`)
            continue
          }

          if (fetchResult.etag) {
            meta.etags[skill.sourceUrl] = fetchResult.etag
          }

          const transformed = await transformSkill(skill, fetchResult.content)
          install(transformed.map((t) => ({ id: t.id, content: t.content })))

          for (const t of transformed) {
            meta.skills[t.id] = {
              syncedAt: new Date().toISOString(),
              transformedWith: t.transformedWith,
              etag: fetchResult.etag,
            }
          }

          results.push({
            id: skill.id,
            action: 'updated',
            transformer: transformed[0]?.transformedWith,
          })
          log(`  ✓ ${skill.id} discovered and installed`)
        } catch (error) {
          hasErrors = true
          const message = error instanceof Error ? error.message : String(error)
          warn(`  ! discovered skill ${skill.id} failed: ${message}`)
          results.push({ id: skill.id, action: 'failed', error: message })
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      warn(`  ! Discovery failed but sync will continue: ${message}`)
    }
  }

  // Ensure permissions are up-to-date on every sync
  ensurePermissions()

  // Update meta
  meta.version = (await import('../core/meta.js')).readMeta().version
  meta.lastSync = new Date().toISOString()
  meta.lastSyncStatus = hasErrors
    ? (results.some((r) => r.action === 'updated') ? 'partial' : 'failed')
    : 'success'
  if (hasErrors) {
    const errors = results.filter((r) => r.action === 'failed').map((r) => r.error)
    meta.lastSyncError = errors.join('; ')
  } else {
    delete meta.lastSyncError
  }
  writeMeta(meta)

  // Show change table
  if (!options.silent && results.length > 0) {
    log('')
    log('  Skill ID                Action     Transformer')
    log('  ' + '─'.repeat(50))
    for (const r of results) {
      const id = r.id.padEnd(22)
      const action = r.action.padEnd(10)
      const transformer = r.transformer ?? ''
      log(`  ${id}  ${action} ${transformer}`)
    }
    log('')
  }

  setSilent(false)
  return results
}

export function registerSync(program: Command): void {
  program
    .command('sync')
    .description('Fetch, transform, and install skills')
    .option('--force', 'Ignore ETags, re-download everything')
    .option('--if-stale <seconds>', 'Only sync if last sync is older than N seconds')
    .option('--silent', 'Suppress all non-error output')
    .option('--skills <ids...>', 'Sync only specific skill IDs')
    .action(async (opts: SyncOptions) => {
      try {
        await syncCore(opts)
      } catch (err) {
        process.stderr.write(`Error: ${err instanceof Error ? err.message : err}\n`)
        process.exit(1)
      }
    })
}
