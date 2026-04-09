import { describe, expect, it } from 'vitest'
import {
  filterByPriority,
  mergeWithDiscovered,
  SKILLS_REGISTRY,
  type SkillDefinition,
} from '../src/config/skills-registry.js'

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

  it('keeps only pulse model-invocable', () => {
    for (const skill of SKILLS_REGISTRY) {
      if (skill.id === 'pulse') {
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

describe('mergeWithDiscovered', () => {
  it('appends discovered skills when there are no duplicate ids', () => {
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

    const merged = mergeWithDiscovered(discovered)
    expect(merged.length).toBe(SKILLS_REGISTRY.length + 2)
    expect(merged.some((skill) => skill.id === 'cc-chrome')).toBe(true)
    expect(merged.some((skill) => skill.id === 'cc-voice-dictation')).toBe(true)
  })

  it('excludes discovered entries with duplicate ids', () => {
    const discovered: SkillDefinition[] = [
      {
        id: 'cc-permissions',
        sourceUrl: 'https://code.claude.com/docs/en/permissions.md',
        name: 'cc-permissions',
        description: 'Duplicate',
        priority: 'medium',
      },
    ]

    const merged = mergeWithDiscovered(discovered)
    expect(merged.length).toBe(SKILLS_REGISTRY.length)
    expect(merged.filter((skill) => skill.id === 'cc-permissions').length).toBe(1)
  })

  it('returns registry unchanged when discovered list is empty', () => {
    expect(mergeWithDiscovered([])).toEqual(SKILLS_REGISTRY)
  })
})
