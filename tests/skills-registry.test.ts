import { describe, expect, it } from 'vitest'
import { filterByPriority, SKILLS_REGISTRY } from '../src/config/skills-registry.js'

describe('filterByPriority', () => {
  it('excludes medium when filtering critical and high', () => {
    const filtered = filterByPriority(['critical', 'high'])
    expect(filtered.every((s) => s.priority !== 'medium')).toBe(true)
    expect(filtered.length).toBeGreaterThan(0)
  })

  it('includes medium when using all', () => {
    const all = filterByPriority(['all'])
    const medium = SKILLS_REGISTRY.filter((s) => s.priority === 'medium')
    expect(all.filter((s) => s.priority === 'medium').length).toBe(medium.length)
  })

  it('keeps descriptions under 250 chars', () => {
    for (const skill of SKILLS_REGISTRY) {
      expect(skill.description.length).toBeLessThanOrEqual(250)
      for (const section of skill.manualSections ?? []) {
        expect(section.description.length).toBeLessThanOrEqual(250)
      }
    }
  })

  it('keeps only cc-tutor model-invocable', () => {
    for (const skill of SKILLS_REGISTRY) {
      if (skill.id === 'cc-tutor') {
        expect(skill.disableModelInvocation).toBe(false)
      } else {
        expect(skill.disableModelInvocation ?? true).toBe(true)
      }
    }
  })

  it('uses unique manual section descriptions per skill', () => {
    for (const skill of SKILLS_REGISTRY) {
      const descriptions = (skill.manualSections ?? []).map((s) => s.description)
      const uniqueDescriptions = new Set(descriptions)
      expect(uniqueDescriptions.size).toBe(descriptions.length)
    }
  })
})
