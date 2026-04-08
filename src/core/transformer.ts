import type { SkillDefinition } from '../config/skills-registry.js'
import { transformStatic } from './transformer-static.js'
import { transformWithClaude } from './transformer-claude.js'
import { splitDocument } from './splitter.js'
import { log } from '../utils/logger.js'

export interface TransformedSkill {
  id: string
  filename: string
  content: string
  transformedWith: 'claude' | 'static' | 'fixed'
}

function generateFrontmatter(
  name: string,
  description: string,
  source: string,
  disableModelInvocation: boolean | undefined,
): string {
  const syncedAt = new Date().toISOString()
  const shouldDisableModelInvocation = disableModelInvocation ?? true

  return [
    '---',
    `name: ${name}`,
    `description: ${JSON.stringify(description)}`,
    ...(shouldDisableModelInvocation ? ['disable-model-invocation: true'] : []),
    '_pulse: true',
    `_syncedAt: "${syncedAt}"`,
    `_source: "${source}"`,
    '---',
    '',
  ].join('\n')
}

/**
 * Transform a skill definition + raw content into one or more TransformedSkill files.
 *
 * Cascade logic:
 * - static:true → use fixed content (no fetch/transform)
 * - else try Claude CLI → fallback to static transformer
 */
export async function transformSkill(
  def: SkillDefinition,
  rawContent: string,
): Promise<TransformedSkill[]> {
  const tokenBudget = def.tokenBudget ?? 600
  const source = def.sourceUrl ?? 'static'

  // Static/fixed skills: no transformation needed
  if (def.static) {
    log(`  → ${def.id}: fixed (static skill)`)
    const frontmatter = generateFrontmatter(
      def.id,
      def.description,
      'static',
      def.disableModelInvocation,
    )
    return [{
      id: def.id,
      filename: `.claude/skills/${def.id}/SKILL.md`,
      content: frontmatter + rawContent,
      transformedWith: 'fixed',
    }]
  }

  // Try Claude transformer first, fallback to static
  let transformed: string
  let method: 'claude' | 'static'

  const claudeResult = await transformWithClaude(rawContent, tokenBudget)
  if (claudeResult) {
    transformed = claudeResult
    method = 'claude'
    log(`  → ${def.id}: transformed with Claude`)
  } else {
    transformed = transformStatic(rawContent, tokenBudget)
    method = 'static'
    log(`  → ${def.id}: transformed with static fallback`)
  }

  // Apply splitting strategy
  const strategy = def.splitStrategy ?? 'none'
  const sections = splitDocument(transformed, strategy, def.manualSections)

  // Generate TransformedSkill for each section
  return sections.map((section) => {
    const skillId = section.id ? `${def.id}-${section.id}` : def.id
    // For manual sections, use the section id directly if it already includes the base id
    const finalId = def.manualSections?.find((ms) => ms.id === section.id)
      ? section.id
      : skillId

    const sectionDef = def.manualSections?.find((ms) => ms.id === section.id)
    const description = sectionDef?.description ?? def.description

    const frontmatter = generateFrontmatter(
      finalId,
      description,
      source,
      def.disableModelInvocation,
    )

    return {
      id: finalId,
      filename: `.claude/skills/${finalId}/SKILL.md`,
      content: frontmatter + section.content,
      transformedWith: method,
    }
  })
}
