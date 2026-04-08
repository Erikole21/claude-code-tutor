import type { SkillDefinition } from '../config/skills-registry.js'

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Referencia principal',
  high: 'Configuración y herramientas',
  medium: 'Flujos y automatización',
}

const PRIORITY_ORDER = ['critical', 'high', 'medium'] as const

export function generateSkillIndex(registry: SkillDefinition[]): string {
  const entries = registry.filter((s) => s.id !== 'cc-tutor')

  const grouped = new Map<string, string[]>()
  for (const priority of PRIORITY_ORDER) {
    grouped.set(priority, [])
  }

  for (const skill of entries) {
    const lines = grouped.get(skill.priority)
    if (!lines) continue

    if (skill.manualSections && skill.manualSections.length > 0) {
      for (const section of skill.manualSections) {
        lines.push(`- \`/${section.id}\` — ${section.description}`)
      }
    } else {
      lines.push(`- \`/${skill.id}\` — ${skill.description}`)
    }
  }

  const sections: string[] = []
  sections.push('## Skills disponibles')
  sections.push('')
  sections.push('Puedes recomendar estas skills al usuario según su pregunta:')

  for (const priority of PRIORITY_ORDER) {
    const lines = grouped.get(priority)!
    if (lines.length === 0) continue
    sections.push('')
    sections.push(`### ${PRIORITY_LABELS[priority]}`)
    sections.push(lines.join('\n'))
  }

  return sections.join('\n') + '\n'
}
