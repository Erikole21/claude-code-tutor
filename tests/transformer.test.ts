import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SkillDefinition } from '../src/config/skills-registry.js'

const { claudeMock, staticMock } = vi.hoisted(() => ({
  claudeMock: vi.fn(),
  staticMock: vi.fn(),
}))

vi.mock('../src/core/transformer-claude.js', () => ({
  transformWithClaude: claudeMock,
}))

vi.mock('../src/core/transformer-static.js', () => ({
  transformStatic: staticMock,
}))

import { transformSkill } from '../src/core/transformer.js'

describe('transformer orchestrator', () => {
  beforeEach(() => {
    claudeMock.mockReset()
    staticMock.mockReset()
  })

  it('uses fixed content directly for static skills', async () => {
    const skill: SkillDefinition = {
      id: 'cc-static',
      sourceUrl: null,
      name: 'cc-static',
      description: 'Static skill',
      splitStrategy: 'none',
      priority: 'critical',
      static: true,
    }

    const result = await transformSkill(skill, 'Static body')

    expect(result).toHaveLength(1)
    expect(result[0].transformedWith).toBe('fixed')
    expect(result[0].filename).toBe('.claude/skills/cc-static/SKILL.md')
    expect(result[0].content).toContain('name: cc-static')
    expect(result[0].content).toContain('disable-model-invocation: true')
    expect(result[0].content).toContain('_pulse: true')
    expect(result[0].content).toContain('_source: "static"')
    expect(result[0].content).not.toContain('_transformedWith:')
    expect(claudeMock).not.toHaveBeenCalled()
    expect(staticMock).not.toHaveBeenCalled()
  })

  it('falls back to static transformer when claude returns null', async () => {
    claudeMock.mockResolvedValue(null)
    staticMock.mockReturnValue('## Output\n- item')

    const skill: SkillDefinition = {
      id: 'cc-doc',
      sourceUrl: 'https://example.com/doc.md',
      name: 'cc-doc',
      description: 'Doc skill',
      splitStrategy: 'none',
      tokenBudget: 250,
      priority: 'high',
    }

    const result = await transformSkill(skill, 'Raw markdown')

    expect(claudeMock).toHaveBeenCalledWith('Raw markdown', 250)
    expect(staticMock).toHaveBeenCalledWith('Raw markdown', 250)
    expect(result).toHaveLength(1)
    expect(result[0].transformedWith).toBe('static')
    expect(result[0].filename).toBe('.claude/skills/cc-doc/SKILL.md')
    expect(result[0].content).toContain('_source: "https://example.com/doc.md"')
    expect(result[0].content).toContain('disable-model-invocation: true')
  })

  it('omits disable-model-invocation when explicitly disabled', async () => {
    const skill: SkillDefinition = {
      id: 'cc-tutor',
      sourceUrl: null,
      name: 'cc-tutor',
      description: 'Tutor skill',
      splitStrategy: 'none',
      priority: 'critical',
      static: true,
      disableModelInvocation: false,
    }

    const result = await transformSkill(skill, 'Tutor body')

    expect(result).toHaveLength(1)
    expect(result[0].content).not.toContain('disable-model-invocation:')
  })
})
