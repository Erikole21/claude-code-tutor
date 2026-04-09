import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  installMock,
  loadConfigMock,
  readMetaMock,
  writeMetaMock,
  isStaleMock,
  loadDiscoveredSkillsMock,
  persistDiscoveredSkillsMock,
  discoverSkillsMock,
  ensurePermissionsMock,
  setSilentMock,
  logMock,
  warnMock,
  readFileSyncMock,
  generateSkillIndexMock,
  pruneManagedSkillsMock,
  mergeWithDiscoveredMock,
  fetchDocMock,
  transformSkillMock,
} = vi.hoisted(() => ({
  installMock: vi.fn(),
  loadConfigMock: vi.fn(),
  readMetaMock: vi.fn(),
  writeMetaMock: vi.fn(),
  isStaleMock: vi.fn(),
  loadDiscoveredSkillsMock: vi.fn(),
  persistDiscoveredSkillsMock: vi.fn(),
  discoverSkillsMock: vi.fn(),
  ensurePermissionsMock: vi.fn(),
  setSilentMock: vi.fn(),
  logMock: vi.fn(),
  warnMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  generateSkillIndexMock: vi.fn(),
  pruneManagedSkillsMock: vi.fn(),
  mergeWithDiscoveredMock: vi.fn(),
  fetchDocMock: vi.fn(),
  transformSkillMock: vi.fn(),
}))

vi.mock('../src/config/skills-registry.js', () => ({
  SKILLS_REGISTRY: [
    {
      id: 'pulse',
      sourceUrl: null,
      name: 'pulse',
      description: 'Tutor',
      splitStrategy: 'none',
      priority: 'critical',
      static: true,
      disableModelInvocation: false,
    },
    {
      id: 'cc-learning-path',
      sourceUrl: null,
      name: 'cc-learning-path',
      description: 'Learning path',
      splitStrategy: 'none',
      priority: 'high',
      static: true,
    },
  ],
  mergeWithDiscovered: mergeWithDiscoveredMock,
}))

vi.mock('../src/config/loader.js', () => ({
  loadConfig: loadConfigMock,
}))

vi.mock('../src/core/fetcher.js', () => ({
  fetchDoc: fetchDocMock,
}))

vi.mock('../src/core/transformer.js', () => ({
  transformSkill: transformSkillMock,
}))

vi.mock('../src/core/installer.js', () => ({
  install: installMock,
  pruneManagedSkills: pruneManagedSkillsMock,
}))

vi.mock('../src/core/meta.js', () => ({
  readMeta: readMetaMock,
  writeMeta: writeMetaMock,
  isStale: isStaleMock,
  loadDiscoveredSkills: loadDiscoveredSkillsMock,
  persistDiscoveredSkills: persistDiscoveredSkillsMock,
}))

vi.mock('../src/core/discovery.js', () => ({
  LLMS_TXT_URL: 'https://code.claude.com/docs/llms.txt',
  discoverSkills: discoverSkillsMock,
}))

vi.mock('../src/core/hook-manager.js', () => ({
  ensurePermissions: ensurePermissionsMock,
}))

vi.mock('../src/utils/logger.js', () => ({
  log: logMock,
  warn: warnMock,
  setSilent: setSilentMock,
}))

vi.mock('../src/core/skill-index.js', () => ({
  generateSkillIndex: generateSkillIndexMock,
}))

vi.mock('node:fs', () => ({
  readFileSync: readFileSyncMock,
}))

import { syncCore } from '../src/commands/sync.js'

describe('sync command static skills', () => {
  const metaState = {
    version: '1.0.0',
    lastSync: '',
    lastSyncStatus: 'success' as const,
    firstSessionDone: false,
    etags: {} as Record<string, string>,
    skills: {} as Record<string, { syncedAt: string; transformedWith: string; etag?: string }>,
    discoveredSkills: {} as Record<string, unknown>,
  }

  beforeEach(() => {
    installMock.mockReset()
    loadConfigMock.mockReset()
    readMetaMock.mockReset()
    writeMetaMock.mockReset()
    isStaleMock.mockReset()
    setSilentMock.mockReset()
    logMock.mockReset()
    warnMock.mockReset()
    readFileSyncMock.mockReset()
    generateSkillIndexMock.mockReset()
    pruneManagedSkillsMock.mockReset()
    loadDiscoveredSkillsMock.mockReset()
    persistDiscoveredSkillsMock.mockReset()
    discoverSkillsMock.mockReset()
    ensurePermissionsMock.mockReset()
    mergeWithDiscoveredMock.mockReset()
    fetchDocMock.mockReset()
    transformSkillMock.mockReset()

    loadConfigMock.mockResolvedValue({ skills: ['all'] })
    readMetaMock.mockReturnValue(metaState)
    isStaleMock.mockReturnValue(true)
    loadDiscoveredSkillsMock.mockReturnValue([])
    discoverSkillsMock.mockResolvedValue([])
    mergeWithDiscoveredMock.mockImplementation((discovered: unknown[]) => {
      const registry = [
        {
          id: 'pulse',
          sourceUrl: null,
          name: 'pulse',
          description: 'Tutor',
          splitStrategy: 'none',
          priority: 'critical',
          static: true,
          disableModelInvocation: false,
        },
        {
          id: 'cc-learning-path',
          sourceUrl: null,
          name: 'cc-learning-path',
          description: 'Learning path',
          splitStrategy: 'none',
          priority: 'high',
          static: true,
        },
      ]
      return [...registry, ...discovered]
    })
    generateSkillIndexMock.mockReturnValue('## Skills disponibles\n- `/cc-x` — Example\n')
    pruneManagedSkillsMock.mockReturnValue([])
    readFileSyncMock.mockImplementation((path: string) => {
      if (path.endsWith('/pulse/SKILL.md') || path.endsWith('\\pulse\\SKILL.md')) {
        return 'Tutor base content'
      }
      if (
        path.endsWith('/cc-learning-path/SKILL.md')
        || path.endsWith('\\cc-learning-path\\SKILL.md')
      ) {
        return 'Learning path base content'
      }
      return ''
    })
  })

  it('installs bundled static content for pulse and learning path', async () => {
    const results = await syncCore({ skills: ['pulse', 'cc-learning-path'], silent: true })

    expect(results).toHaveLength(2)
    expect(results.map((r) => r.id)).toEqual(['pulse', 'cc-learning-path'])
    expect(generateSkillIndexMock).toHaveBeenCalledTimes(1)

    const tutorInstallCall = installMock.mock.calls.find((call) => call[0][0].id === 'pulse')
    const learningPathInstallCall = installMock.mock.calls.find(
      (call) => call[0][0].id === 'cc-learning-path',
    )

    expect(tutorInstallCall).toBeDefined()
    expect(learningPathInstallCall).toBeDefined()

    const tutorContent = tutorInstallCall![0][0].content as string
    const learningPathContent = learningPathInstallCall![0][0].content as string

    expect(tutorContent).toContain('Tutor base content')
    expect(tutorContent).toContain('## Skills disponibles')
    expect(learningPathContent).toBe('Learning path base content')
    expect(learningPathContent).not.toContain('## Skills disponibles')
  })

  it('prunes obsolete managed skills when force is enabled', async () => {
    pruneManagedSkillsMock.mockReturnValue(['cc-tutor'])

    await syncCore({ skills: ['pulse', 'cc-learning-path'], force: true, silent: true })

    expect(pruneManagedSkillsMock).toHaveBeenCalledTimes(1)
    const allowedIds = pruneManagedSkillsMock.mock.calls[0][0] as Set<string>
    expect(allowedIds.has('pulse')).toBe(true)
    expect(allowedIds.has('cc-learning-path')).toBe(true)
  })
})
