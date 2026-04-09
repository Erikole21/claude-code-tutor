import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { install, isManaged, getInstalledSkills, pruneManagedSkills } from '../src/core/installer.js'
import { writeMeta, type PulseMeta } from '../src/core/meta.js'

describe('installer', () => {
  const originalCwd = process.cwd()
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pulse-installer-'))
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(dir, { recursive: true, force: true })
  })

  describe('install', () => {
    it('installs a single skill with _pulse frontmatter', () => {
      install([{ id: 'cc-hooks-events', content: '# Hook Events\nSome content' }])

      const file = readFileSync(join(dir, '.claude', 'skills', 'cc-hooks-events', 'SKILL.md'), 'utf-8')
      expect(file).toBe('---\n_pulse: true\n---\n# Hook Events\nSome content')
    })

    it('installs multiple skills', () => {
      install([
        { id: 'cc-mcp', content: 'MCP content' },
        { id: 'cc-settings', content: 'Settings content' },
      ])

      const mcp = readFileSync(join(dir, '.claude', 'skills', 'cc-mcp', 'SKILL.md'), 'utf-8')
      const settings = readFileSync(join(dir, '.claude', 'skills', 'cc-settings', 'SKILL.md'), 'utf-8')
      expect(mcp).toContain('_pulse: true')
      expect(mcp).toContain('MCP content')
      expect(settings).toContain('_pulse: true')
      expect(settings).toContain('Settings content')
    })

    it('overwrites existing pulse-managed skill', () => {
      install([{ id: 'cc-mcp', content: 'original' }])
      install([{ id: 'cc-mcp', content: 'updated' }])

      const file = readFileSync(join(dir, '.claude', 'skills', 'cc-mcp', 'SKILL.md'), 'utf-8')
      expect(file).toContain('updated')
      expect(file).not.toContain('original')
    })

    it('skips user-owned skill with same ID', () => {
      const skillDir = join(dir, '.claude', 'skills', 'my-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), '# My custom skill\nUser content', 'utf-8')

      install([{ id: 'my-skill', content: 'pulse content' }])

      const file = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8')
      expect(file).toBe('# My custom skill\nUser content')
    })

    it('creates directory structure recursively', () => {
      install([{ id: 'deep-skill', content: 'content' }])

      const file = readFileSync(join(dir, '.claude', 'skills', 'deep-skill', 'SKILL.md'), 'utf-8')
      expect(file).toContain('content')
    })
  })

  describe('isManaged', () => {
    it('returns true for pulse-managed skill', () => {
      const skillDir = join(dir, '.claude', 'skills', 'cc-mcp')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), '---\n_pulse: true\n---\n# Content', 'utf-8')

      expect(isManaged(skillDir)).toBe(true)
    })

    it('returns false for user-created skill', () => {
      const skillDir = join(dir, '.claude', 'skills', 'my-custom')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), '# My Custom Skill\nContent', 'utf-8')

      expect(isManaged(skillDir)).toBe(false)
    })

    it('returns false when SKILL.md does not exist', () => {
      expect(isManaged(join(dir, 'nonexistent'))).toBe(false)
    })
  })

  describe('getInstalledSkills', () => {
    it('returns skill IDs from metadata', () => {
      const meta: PulseMeta = {
        version: '1.0.0',
        lastSync: new Date().toISOString(),
        lastSyncStatus: 'success',
        firstSessionDone: false,
        skills: {
          'cc-mcp': { syncedAt: new Date().toISOString(), transformedWith: 'static' },
          'cc-hooks-events': { syncedAt: new Date().toISOString(), transformedWith: 'claude' },
        },
        etags: {},
        discoveredSkills: {},
      }
      writeMeta(meta)

      const result = getInstalledSkills()
      expect(result).toContain('cc-mcp')
      expect(result).toContain('cc-hooks-events')
      expect(result).toHaveLength(2)
    })

    it('returns empty array when no metadata exists', () => {
      expect(getInstalledSkills()).toEqual([])
    })
  })

  describe('pruneManagedSkills', () => {
    it('removes obsolete pulse-managed skills that are not allowed', () => {
      install([{ id: 'cc-tutor', content: 'legacy tutor' }])
      install([{ id: 'pulse', content: 'new tutor' }])

      const removed = pruneManagedSkills(new Set(['pulse']))

      expect(removed).toEqual(['cc-tutor'])
      expect(existsSync(join(dir, '.claude', 'skills', 'cc-tutor', 'SKILL.md'))).toBe(false)
      expect(existsSync(join(dir, '.claude', 'skills', 'pulse', 'SKILL.md'))).toBe(true)
    })

    it('does not remove user-owned skills even if not allowed', () => {
      const customDir = join(dir, '.claude', 'skills', 'cc-custom')
      mkdirSync(customDir, { recursive: true })
      writeFileSync(join(customDir, 'SKILL.md'), '# user skill', 'utf-8')

      const removed = pruneManagedSkills(new Set(['pulse']))

      expect(removed).toEqual([])
      expect(existsSync(join(customDir, 'SKILL.md'))).toBe(true)
    })
  })
})
