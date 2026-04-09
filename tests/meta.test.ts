import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  isStale,
  loadDiscoveredSkills,
  persistDiscoveredSkills,
  readMeta,
  writeMeta,
  type PulseMeta,
} from '../src/core/meta.js'

describe('meta', () => {
  const originalCwd = process.cwd()
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pulse-meta-'))
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(dir, { recursive: true, force: true })
  })

  it('readMeta returns defaults when file is missing', () => {
    const m = readMeta()
    expect(m.lastSync).toBe('')
    expect(m.lastSyncStatus).toBe('failed')
    expect(m.firstSessionDone).toBe(false)
    expect(m.skills).toEqual({})
    expect(m.etags).toEqual({})
    expect(m.discoveredSkills).toEqual({})
  })

  it('writeMeta and readMeta round-trip', () => {
    const skillsDir = join(dir, '.claude', 'skills')
    mkdirSync(skillsDir, { recursive: true })
    const meta: PulseMeta = {
      version: '9.9.9',
      lastSync: new Date().toISOString(),
      lastSyncStatus: 'success',
      firstSessionDone: true,
      skills: {},
      etags: {},
      discoveredSkills: {},
    }
    writeMeta(meta)
    expect(readMeta().version).toBe('9.9.9')
    expect(readMeta().firstSessionDone).toBe(true)
  })

  it('isStale is true when lastSync is empty', () => {
    expect(isStale(86400)).toBe(true)
  })

  it('isStale respects maxAge', () => {
    mkdirSync(join(dir, '.claude', 'skills'), { recursive: true })
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    writeFileSync(
      join(dir, '.claude', 'skills', '.pulse-meta.json'),
      JSON.stringify({
        version: '1.0.0',
        lastSync: past,
        lastSyncStatus: 'success',
        firstSessionDone: false,
        skills: {},
        etags: {},
        discoveredSkills: {},
      }),
    )
    expect(isStale(86400)).toBe(true)

    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    writeFileSync(
      join(dir, '.claude', 'skills', '.pulse-meta.json'),
      JSON.stringify({
        version: '1.0.0',
        lastSync: recent,
        lastSyncStatus: 'success',
        firstSessionDone: false,
        skills: {},
        etags: {},
        discoveredSkills: {},
      }),
    )
    expect(isStale(86400)).toBe(false)
  })

  it('persistDiscoveredSkills writes and removes entries by latest discovery list', () => {
    const meta = readMeta()
    persistDiscoveredSkills(meta, [
      {
        id: 'cc-voice-dictation',
        sourceUrl: 'https://code.claude.com/docs/en/voice-dictation.md',
        name: 'cc-voice-dictation',
        description: 'Voice docs',
        priority: 'medium',
      },
      {
        id: 'cc-chrome',
        sourceUrl: 'https://code.claude.com/docs/en/chrome.md',
        name: 'cc-chrome',
        description: 'Chrome docs',
        priority: 'medium',
      },
    ])
    expect(Object.keys(meta.discoveredSkills).sort()).toEqual(['cc-chrome', 'cc-voice-dictation'])

    persistDiscoveredSkills(meta, [
      {
        id: 'cc-chrome',
        sourceUrl: 'https://code.claude.com/docs/en/chrome.md',
        name: 'cc-chrome',
        description: 'Chrome docs',
        priority: 'medium',
      },
    ])
    expect(Object.keys(meta.discoveredSkills)).toEqual(['cc-chrome'])
  })

  it('loadDiscoveredSkills converts meta records into SkillDefinition defaults', () => {
    const meta = readMeta()
    persistDiscoveredSkills(meta, [
      {
        id: 'cc-chrome',
        sourceUrl: 'https://code.claude.com/docs/en/chrome.md',
        name: 'cc-chrome',
        description: 'Chrome docs',
        priority: 'medium',
      },
    ])

    const discovered = loadDiscoveredSkills(meta)
    expect(discovered).toHaveLength(1)
    expect(discovered[0]).toMatchObject({
      id: 'cc-chrome',
      sourceUrl: 'https://code.claude.com/docs/en/chrome.md',
      name: 'cc-chrome',
      priority: 'medium',
      disableModelInvocation: true,
      splitStrategy: 'none',
      tokenBudget: 600,
      static: false,
    })
  })
})
