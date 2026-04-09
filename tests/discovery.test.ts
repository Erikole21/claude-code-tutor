import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LLMS_TXT_URL,
  discoverSkills,
  filterDiscoveredUrls,
  parseLlmsTxt,
  toSkillDefinition,
  type LlmsTxtEntry,
} from '../src/core/discovery.js'
import type { PulseMeta } from '../src/core/meta.js'
import type { SkillDefinition } from '../src/config/skills-registry.js'

const { fetchDocMock, warnMock } = vi.hoisted(() => ({
  fetchDocMock: vi.fn(),
  warnMock: vi.fn(),
}))

vi.mock('../src/core/fetcher.js', () => ({
  fetchDoc: fetchDocMock,
}))

vi.mock('../src/utils/logger.js', () => ({
  warn: warnMock,
}))

function makeMeta(): PulseMeta {
  return {
    version: '1.0.0',
    lastSync: '',
    lastSyncStatus: 'success',
    firstSessionDone: false,
    skills: {},
    etags: {},
    discoveredSkills: {},
  }
}

describe('discovery', () => {
  beforeEach(() => {
    fetchDocMock.mockReset()
    warnMock.mockReset()
  })

  it('parseLlmsTxt parses valid lines and skips invalid ones', () => {
    const content = [
      '# Claude docs',
      '',
      '- [Hooks](https://code.claude.com/docs/en/hooks.md): Hook events',
      '- malformed line',
      '- [Channels](https://code.claude.com/docs/en/channels.md): Channel integration',
    ].join('\n')

    const entries = parseLlmsTxt(content)
    expect(entries).toEqual([
      {
        title: 'Hooks',
        url: 'https://code.claude.com/docs/en/hooks.md',
        description: 'Hook events',
      },
      {
        title: 'Channels',
        url: 'https://code.claude.com/docs/en/channels.md',
        description: 'Channel integration',
      },
    ])
  })

  it('filterDiscoveredUrls excludes registry URLs and excluded paths', () => {
    const entries: LlmsTxtEntry[] = [
      {
        title: 'Hooks',
        url: 'https://code.claude.com/docs/en/hooks.md',
        description: 'Hooks',
      },
      {
        title: 'Agent SDK',
        url: 'https://code.claude.com/docs/en/agent-sdk/overview.md',
        description: 'Agent SDK',
      },
      {
        title: 'Whats new',
        url: 'https://code.claude.com/docs/en/whats-new/2026-w14.md',
        description: 'News',
      },
      {
        title: 'Chrome',
        url: 'https://code.claude.com/docs/en/chrome.md',
        description: 'Chrome support',
      },
    ]

    const registry: SkillDefinition[] = [
      {
        id: 'cc-hooks',
        sourceUrl: 'https://code.claude.com/docs/en/hooks.md',
        name: 'cc-hooks',
        description: 'Hooks',
        priority: 'critical',
      },
    ]

    const filtered = filterDiscoveredUrls(entries, registry)
    expect(filtered).toEqual([
      {
        title: 'Chrome',
        url: 'https://code.claude.com/docs/en/chrome.md',
        description: 'Chrome support',
      },
    ])
  })

  it('toSkillDefinition derives id and truncates description', () => {
    const def = toSkillDefinition({
      title: 'Voice dictation',
      url: 'https://code.claude.com/docs/en/voice-dictation.md',
      description: 'x'.repeat(400),
    })

    expect(def.id).toBe('cc-voice-dictation')
    expect(def.description.length).toBe(250)
    expect(def.priority).toBe('medium')
    expect(def.disableModelInvocation).toBe(true)
    expect(def.splitStrategy).toBe('none')
    expect(def.tokenBudget).toBe(600)
    expect(def.static).toBe(false)
  })

  it('discoverSkills returns empty on llms.txt 304', async () => {
    fetchDocMock.mockResolvedValue({
      url: LLMS_TXT_URL,
      content: '',
      changed: false,
      etag: '"etag-1"',
      fetchedAt: new Date().toISOString(),
    })

    const meta = makeMeta()
    meta.etags[LLMS_TXT_URL] = '"etag-1"'

    const discovered = await discoverSkills([], meta)
    expect(discovered).toEqual([])
  })
})
