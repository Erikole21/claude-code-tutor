import type { Command } from 'commander'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { SKILLS_REGISTRY } from '../config/skills-registry.js'
import { loadConfig } from '../config/loader.js'
import { readMeta, writeMeta, getMetaPath } from '../core/meta.js'
import { addHook } from '../core/hook-manager.js'
import { syncCore } from './sync.js'
import { log, success } from '../utils/logger.js'

interface InitOptions {
  force?: boolean
  yes?: boolean
  skills?: string[]
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close()
      resolve(answer.toLowerCase().startsWith('y'))
    })
  })
}

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize pulse in the current project')
    .option('--force', 'Re-initialize even if already set up')
    .option('--yes', 'Skip confirmation prompt')
    .option('--skills <ids...>', 'Install only specific skill IDs')
    .action(async (opts: InitOptions) => {
      try {
        // Check if already initialized
        const metaPath = getMetaPath()
        if (existsSync(metaPath) && !opts.force) {
          const meta = readMeta()
          log('pulse is already initialized.')
          log(`  Last sync: ${meta.lastSync || 'never'}`)
          log(`  Status: ${meta.lastSyncStatus}`)
          log(`  Skills: ${Object.keys(meta.skills).length} installed`)
          log('')
          log('Use --force to re-initialize.')
          return
        }

        // Create directories
        const claudeDir = join(process.cwd(), '.claude')
        const skillsDir = join(claudeDir, 'skills')
        if (!existsSync(claudeDir)) {
          mkdirSync(claudeDir, { recursive: true })
        }
        if (!existsSync(skillsDir)) {
          mkdirSync(skillsDir, { recursive: true })
        }

        // Determine skills to install
        const config = await loadConfig()
        let skillsToInstall = SKILLS_REGISTRY
        if (opts.skills && opts.skills.length > 0) {
          skillsToInstall = SKILLS_REGISTRY.filter((s) => opts.skills!.includes(s.id))
        } else {
          const priorities = config.skills ?? ['critical', 'high']
          skillsToInstall = SKILLS_REGISTRY.filter(
            (s) => priorities.includes(s.priority) || priorities.includes('all'),
          )
        }

        // Show preview
        log('Skills to install:')
        log('')
        for (const skill of skillsToInstall) {
          const tag = skill.static ? ' (static)' : ''
          log(`  [${skill.priority}] ${skill.id}${tag}`)
        }
        log('')
        log(`Total: ${skillsToInstall.length} skills`)
        log('')

        // Confirm
        if (!opts.yes) {
          const accepted = await confirm('Proceed? (y/N) ')
          if (!accepted) {
            log('Aborted.')
            return
          }
        }

        // Install bundled skills (no fetch, instant)
        log('')
        const syncOpts = {
          force: true,
          bundledOnly: true,
          skills: opts.skills,
        }
        await syncCore(syncOpts)

        // Inject hook
        addHook()
        log('SessionStart hook added to .claude/settings.json')

        // Write meta with firstSessionDone: false
        const meta = readMeta()
        meta.firstSessionDone = false
        writeMeta(meta)

        // Summary
        log('')
        success('pulse initialized successfully!')
        log(`  Skills installed: ${Object.keys(meta.skills).length}`)
        log('  Hook: SessionStart ✓')
        log('  Next auto-sync: in ~24 hours (via hook)')
        log('')
        log('Tip: commit .claude/skills/cc-*/ to share skills with your team.')
      } catch (err) {
        process.stderr.write(`Error: ${err instanceof Error ? err.message : err}\n`)
        process.exit(1)
      }
    })
}
