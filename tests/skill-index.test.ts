import { describe, expect, it } from 'vitest'
import { generateSkillIndex } from '../src/core/skill-index.js'
import { SKILLS_REGISTRY, type SkillDefinition } from '../src/config/skills-registry.js'

describe('generateSkillIndex', () => {
  const index = generateSkillIndex(SKILLS_REGISTRY)

  it('excludes pulse from the index', () => {
    expect(index).not.toContain('`/pulse`')
  })

  it('includes non-tutor skills', () => {
    const nonTutor = SKILLS_REGISTRY.filter((s) => s.id !== 'pulse' && !s.manualSections)
    for (const skill of nonTutor) {
      expect(index).toContain(`\`/${skill.id}\``)
    }
  })

  it('starts with ## Skills disponibles heading', () => {
    expect(index).toMatch(/^## Skills disponibles/)
  })

  it('groups by priority with labeled subsections', () => {
    expect(index).toContain('### Referencia principal')
    expect(index).toContain('### Configuración y herramientas')
    expect(index).toContain('### Flujos y automatización')
  })

  it('critical section appears before high section', () => {
    const criticalPos = index.indexOf('### Referencia principal')
    const highPos = index.indexOf('### Configuración y herramientas')
    expect(criticalPos).toBeLessThan(highPos)
  })

  it('lists each manualSection separately with its own /section-id', () => {
    const hooksSkill = SKILLS_REGISTRY.find((s) => s.id === 'cc-hooks-events')!
    for (const section of hooksSkill.manualSections!) {
      expect(index).toContain(`\`/${section.id}\``)
      expect(index).toContain(section.description)
    }
  })

  it('lists parent-only for splitStrategy sections without manualSections', () => {
    const mcpSkill = SKILLS_REGISTRY.find((s) => s.id === 'cc-mcp')!
    expect(mcpSkill.splitStrategy).toBe('sections')
    expect(mcpSkill.manualSections).toBeUndefined()
    expect(index).toContain(`\`/${mcpSkill.id}\``)
  })

  it('uses the entry format: - `/skill-id` — description', () => {
    const lines = index.split('\n').filter((l) => l.startsWith('- `'))
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(line).toMatch(/^- `\/[\w-]+` — .+/)
    }
  })

  it('includes discovered skills under Additional docs section', () => {
    const discovered: SkillDefinition[] = [
      {
        id: 'cc-chrome',
        sourceUrl: 'https://code.claude.com/docs/en/chrome.md',
        name: 'cc-chrome',
        description: 'Chrome docs',
        priority: 'medium',
      },
      {
        id: 'cc-voice-dictation',
        sourceUrl: 'https://code.claude.com/docs/en/voice-dictation.md',
        name: 'cc-voice-dictation',
        description: 'Voice docs',
        priority: 'medium',
      },
    ]

    const withDiscovered = generateSkillIndex(SKILLS_REGISTRY, discovered)
    expect(withDiscovered).toContain('### Additional docs')
    expect(withDiscovered).toContain('`/cc-chrome`')
    expect(withDiscovered).toContain('`/cc-voice-dictation`')
  })

  it('keeps output unchanged when discovered list is omitted', () => {
    const withoutDiscovered = generateSkillIndex(SKILLS_REGISTRY)
    expect(withoutDiscovered).not.toContain('### Additional docs')
  })
})
