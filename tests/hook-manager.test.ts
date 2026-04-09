import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addHook, removeHook } from '../src/core/hook-manager.js'

function readSettings(dir: string) {
  return JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf-8'))
}

describe('hook-manager', () => {
  const originalCwd = process.cwd()
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pulse-hooks-'))
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(dir, { recursive: true, force: true })
  })

  describe('addHook', () => {
    it('creates settings file when it does not exist', () => {
      addHook()

      const settings = readSettings(dir)
      expect(settings.hooks.SessionStart).toHaveLength(1)
      expect(settings.hooks.SessionStart[0]._pulse).toBe(true)
      expect(settings.hooks.SessionStart[0].matcher).toBe('')
      expect(settings.hooks.SessionStart[0].hooks).toHaveLength(1)
      expect(settings.hooks.SessionStart[0].hooks[0].type).toBe('command')
      expect(settings.hooks.SessionStart[0].hooks[0].command).toMatch(/npx/)
    })

    it('adds hook to settings without hooks section', () => {
      mkdirSync(join(dir, '.claude'), { recursive: true })
      writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ permissions: {} }, null, 2))

      addHook()

      const settings = readSettings(dir)
      expect(settings.permissions).toBeDefined()
      expect(Array.isArray(settings.permissions.allow)).toBe(true)
      expect(settings.permissions.allow.length).toBeGreaterThan(0)
      expect(settings.permissions.allow).toContain('Bash(pulse memory*)')
      expect(settings.hooks.SessionStart).toHaveLength(1)
      expect(settings.hooks.SessionStart[0]._pulse).toBe(true)
      expect(settings.hooks.SessionStart[0].matcher).toBe('')
      expect(settings.hooks.SessionStart[0].hooks[0].type).toBe('command')
    })

    it('appends to existing user hooks', () => {
      mkdirSync(join(dir, '.claude'), { recursive: true })
      writeFileSync(
        join(dir, '.claude', 'settings.json'),
        JSON.stringify({
          hooks: { SessionStart: [{ command: 'user-script.sh' }] },
        }, null, 2),
      )

      addHook()

      const settings = readSettings(dir)
      expect(settings.hooks.SessionStart).toHaveLength(2)
      expect(settings.hooks.SessionStart[0].command).toBe('user-script.sh')
      expect(settings.hooks.SessionStart[1]._pulse).toBe(true)
    })

    it('preserves hooks on other events', () => {
      mkdirSync(join(dir, '.claude'), { recursive: true })
      writeFileSync(
        join(dir, '.claude', 'settings.json'),
        JSON.stringify({
          hooks: {
            PostToolUse: [{ command: 'lint.sh' }],
            Stop: [{ command: 'notify.sh' }],
          },
        }, null, 2),
      )

      addHook()

      const settings = readSettings(dir)
      expect(settings.hooks.PostToolUse).toEqual([{ command: 'lint.sh' }])
      expect(settings.hooks.Stop).toEqual([{ command: 'notify.sh' }])
      expect(settings.hooks.SessionStart).toHaveLength(1)
    })

    it('is idempotent — skips when pulse hook already exists', () => {
      addHook()
      addHook()

      const settings = readSettings(dir)
      const pulseEntries = settings.hooks.SessionStart.filter((e: { _pulse?: boolean }) => e._pulse === true)
      expect(pulseEntries).toHaveLength(1)
    })
  })

  describe('removeHook', () => {
    it('removes pulse hook preserving user hooks', () => {
      mkdirSync(join(dir, '.claude'), { recursive: true })
      writeFileSync(
        join(dir, '.claude', 'settings.json'),
        JSON.stringify({
          hooks: {
            SessionStart: [
              { command: 'user.sh' },
              { _pulse: true, command: 'npx pulse sync...' },
            ],
          },
        }, null, 2),
      )

      removeHook()

      const settings = readSettings(dir)
      expect(settings.hooks.SessionStart).toEqual([{ command: 'user.sh' }])
    })

    it('removes SessionStart key and hooks key when only pulse entry remains', () => {
      mkdirSync(join(dir, '.claude'), { recursive: true })
      writeFileSync(
        join(dir, '.claude', 'settings.json'),
        JSON.stringify({
          hooks: { SessionStart: [{ _pulse: true, command: 'npx pulse sync...' }] },
        }, null, 2),
      )

      removeHook()

      const settings = readSettings(dir)
      expect(settings.hooks).toBeUndefined()
    })

    it('removes only SessionStart key when other hook events exist', () => {
      mkdirSync(join(dir, '.claude'), { recursive: true })
      writeFileSync(
        join(dir, '.claude', 'settings.json'),
        JSON.stringify({
          hooks: {
            SessionStart: [{ _pulse: true, command: 'npx pulse sync...' }],
            PreToolUse: [{ command: 'lint.sh' }],
          },
        }, null, 2),
      )

      removeHook()

      const settings = readSettings(dir)
      expect(settings.hooks).toBeDefined()
      expect(settings.hooks.SessionStart).toBeUndefined()
      expect(settings.hooks.PreToolUse).toEqual([{ command: 'lint.sh' }])
    })

    it('no-op when no pulse hook exists', () => {
      mkdirSync(join(dir, '.claude'), { recursive: true })
      const original = { hooks: { SessionStart: [{ command: 'user.sh' }] } }
      writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify(original, null, 2))

      removeHook()

      const settings = readSettings(dir)
      expect(settings.hooks.SessionStart).toEqual([{ command: 'user.sh' }])
    })

    it('no-op when settings file does not exist', () => {
      expect(() => removeHook()).not.toThrow()
    })
  })
})
