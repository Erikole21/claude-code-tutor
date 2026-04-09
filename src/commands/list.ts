import type { Command } from 'commander'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { mergeWithDiscovered, SKILLS_REGISTRY } from '../config/skills-registry.js'
import { loadDiscoveredSkills, readMeta } from '../core/meta.js'
import { log } from '../utils/logger.js'

const MAX_AGE_SECONDS = 86400 // 24 hours

function statusIcon(skillId: string, meta: ReturnType<typeof readMeta>): string {
  const skillMeta = meta.skills[skillId]
  if (!skillMeta) {
    // Check if installed on disk
    const skillPath = join(process.cwd(), '.claude', 'skills', skillId, 'SKILL.md')
    if (!existsSync(skillPath)) return '✗'
    return '?'
  }

  if (!skillMeta.syncedAt) return '✗'

  const elapsed = (Date.now() - new Date(skillMeta.syncedAt).getTime()) / 1000
  return elapsed > MAX_AGE_SECONDS ? '⚠' : '✓'
}

export function registerList(program: Command): void {
  program
    .command('list')
    .description('List all skills and their sync status')
    .action(async () => {
      const meta = readMeta()
      const discovered = loadDiscoveredSkills(meta)
      const allSkills = mergeWithDiscovered(discovered)

      log('  Status  Skill ID                Last Sync            Transformer')
      log('  ' + '─'.repeat(70))

      for (const skill of allSkills) {
        const icon = statusIcon(skill.id, meta)
        const skillMeta = meta.skills[skill.id]
        const id = skill.id.padEnd(22)
        const lastSync = skillMeta?.syncedAt
          ? new Date(skillMeta.syncedAt).toLocaleString()
          : ''
        const syncPad = lastSync.padEnd(20)
        const transformer = skillMeta?.transformedWith ?? ''

        log(`  ${icon}      ${id}  ${syncPad} ${transformer}`)
      }

      log('')
      const tracked = allSkills.filter((skill) => statusIcon(skill.id, meta) !== '✗').length
      log(`  ${tracked} / ${allSkills.length} skills tracked`)
    })
}
