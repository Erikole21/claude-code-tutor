import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SKILLS_REGISTRY, mergeWithDiscovered, type SkillDefinition, type ManualSection } from '../src/config/skills-registry.js'
import { fetchDoc } from '../src/core/fetcher.js'
import { discoverSkills } from '../src/core/discovery.js'
import { splitDocument } from '../src/core/splitter.js'
import { transformStatic } from '../src/core/transformer-static.js'
import { generateSkillIndex } from '../src/core/skill-index.js'
import type { PulseMeta } from '../src/core/meta.js'
import { log, warn } from '../src/utils/logger.js'

const thisFile = fileURLToPath(import.meta.url)
const rootDir = join(dirname(thisFile), '..')
const fallbackDir = join(rootDir, 'skills-fallback')
const staticSkillsDir = join(rootDir, 'src', 'static-skills')

const STATIC_CONTENT_FILES: Record<string, string> = {
  'pulse': 'pulse.md',
  'cc-learning-path': 'cc-learning-path.md',
}

function frontmatterFor(
  skillId: string,
  description: string,
  source: string,
  syncedAt: string,
  disableModelInvocation: boolean | undefined,
  allowedTools?: string,
): string {
  const shouldDisableModelInvocation = disableModelInvocation ?? true

  return [
    '---',
    `name: ${skillId}`,
    `description: ${JSON.stringify(description)}`,
    ...(shouldDisableModelInvocation ? ['disable-model-invocation: true'] : []),
    ...(allowedTools ? [`allowed-tools: ${allowedTools}`] : []),
    '_pulse: true',
    `_syncedAt: "${syncedAt}"`,
    `_source: "${source}"`,
    '---',
    '',
  ].join('\n')
}

function readStaticSkillBody(skillId: string): string {
  const filename = STATIC_CONTENT_FILES[skillId]
  if (!filename) {
    throw new Error(`Missing static content mapping for "${skillId}"`)
  }
  const filePath = join(staticSkillsDir, filename)
  return readFileSync(filePath, 'utf-8').trim()
}

function resolveSplitResult(
  def: SkillDefinition,
  section: { id: string; content: string },
): { finalId: string; description: string; content: string } {
  const sectionDef = def.manualSections?.find((s) => s.id === section.id)
  if (sectionDef) {
    return {
      finalId: section.id,
      description: sectionDef.description,
      content: section.content,
    }
  }

  const finalId = section.id ? `${def.id}-${section.id}` : def.id
  return {
    finalId,
    description: def.description,
    content: section.content,
  }
}

function writeFallbackSkill(
  id: string,
  description: string,
  source: string,
  body: string,
  syncedAt: string,
  disableModelInvocation: boolean | undefined,
  allowedTools?: string,
): void {
  const outputFile = join(fallbackDir, id, 'SKILL.md')
  mkdirSync(dirname(outputFile), { recursive: true })
  const content =
    frontmatterFor(id, description, source, syncedAt, disableModelInvocation, allowedTools) + `${body.trim()}\n`
  writeFileSync(outputFile, content, 'utf-8')
}

async function processStaticSkill(
  def: SkillDefinition,
  syncedAt: string,
  discovered: SkillDefinition[],
): Promise<number> {
  let body = readStaticSkillBody(def.id)
  if (def.id === 'pulse') {
    body = body.trimEnd() + '\n\n' + generateSkillIndex(SKILLS_REGISTRY, discovered).trimEnd()
  }
  writeFallbackSkill(
    def.id,
    def.description,
    'static',
    body,
    syncedAt,
    def.disableModelInvocation,
    def.allowedTools,
  )
  log(`  ✓ ${def.id} (static)`)
  return 1
}

async function processDocSkill(def: SkillDefinition, syncedAt: string): Promise<number> {
  if (!def.sourceUrl) {
    warn(`  ! ${def.id} skipped: sourceUrl is missing`)
    return 0
  }

  const fetched = await fetchDoc(def.sourceUrl)
  const tokenBudget = def.tokenBudget ?? 600
  const strategy = def.splitStrategy ?? 'none'
  const sourceSections =
    strategy === 'none'
      ? [{ id: '', content: fetched.content }]
      : splitDocument(fetched.content, strategy, def.manualSections as ManualSection[] | undefined)

  let generated = 0
  for (const section of sourceSections) {
    const transformedSection = transformStatic(section.content, tokenBudget, def.sourceUrl ?? undefined)
    const resolved = resolveSplitResult(def, section)
    writeFallbackSkill(
      resolved.finalId,
      resolved.description,
      def.sourceUrl,
      transformedSection,
      syncedAt,
      def.disableModelInvocation,
      def.allowedTools,
    )
    generated++
  }

  log(`  ✓ ${def.id} (${generated} file(s))`)
  return generated
}

async function main(): Promise<void> {
  rmSync(fallbackDir, { recursive: true, force: true })
  mkdirSync(fallbackDir, { recursive: true })

  const syncedAt = new Date().toISOString()
  let generatedCount = 0

  log('Generating fallback skills...')

  const discoveryMeta: PulseMeta = {
    version: 'build',
    lastSync: '',
    lastSyncStatus: 'success',
    firstSessionDone: false,
    skills: {},
    etags: {},
    discoveredSkills: {},
  }
  const discoveredSkills = await discoverSkills(SKILLS_REGISTRY, discoveryMeta)
  const skillsToGenerate = mergeWithDiscovered(discoveredSkills)

  for (const def of skillsToGenerate) {
    try {
      if (def.static) {
        generatedCount += await processStaticSkill(def, syncedAt, discoveredSkills)
      } else {
        generatedCount += await processDocSkill(def, syncedAt)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      warn(`  ! ${def.id} skipped: ${message}`)
    }
  }

  if (generatedCount === 0) {
    warn('No fallback skills were generated.')
    process.exit(1)
  }

  log(`Done. Generated ${generatedCount} fallback SKILL.md file(s).`)
  process.exit(0)
}

void main()
