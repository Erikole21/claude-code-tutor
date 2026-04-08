import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  installMock,
  loadConfigMock,
  readMetaMock,
  writeMetaMock,
  isStaleMock,
  setSilentMock,
  logMock,
  warnMock,
  readFileSyncMock,
  generateSkillIndexMock,
} = vi.hoisted(() => ({
  installMock: vi.fn(),
  loadConfigMock: vi.fn(),
  readMetaMock: vi.fn(),
  writeMetaMock: vi.fn(),
  isStaleMock: vi.fn(),
  setSilentMock: vi.fn(),
  logMock: vi.fn(),
  warnMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  generateSkillIndexMock: vi.fn(),
}))

vi.mock('../src/config/skills-registry.js', () => ({
  SKILLS_REGISTRY: [
    {
      id: 'cc-tutor',
      sourceUrl: null,
      name: 'cc-tutor',
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
}))

vi.mock('../src/config/loader.js', () => ({
  loadConfig: loadConfigMock,
}))

vi.mock('../src/core/fetcher.js', () => ({
  fetchDoc: vi.fn(),
}))

vi.mock('../src/core/transformer.js', () => ({
  transformSkill: vi.fn(),
}))

vi.mock('../src/core/installer.js', () => ({
  install: installMock,
}))

vi.mock('../src/core/meta.js', () => ({
  readMeta: readMetaMock,
  writeMeta: writeMetaMock,
  isStale: isStaleMock,
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
    etags: {} as Record<string, string>,
    skills: {} as Record<string, { syncedAt: string; transformedWith: string; etag?: string }>,
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

    loadConfigMock.mockResolvedValue({ skills: ['all'] })
    readMetaMock.mockReturnValue(metaState)
    isStaleMock.mockReturnValue(true)
    generateSkillIndexMock.mockReturnValue('## Skills disponibles\n- `/cc-x` — Example\n')
    readFileSyncMock.mockImplementation((path: string) => {
      if (path.includes('cc-tutor')) return 'Tutor base content'
      if (path.includes('cc-learning-path')) return 'Learning path base content'
      return ''
    })
  })

  it('appends generated index only to cc-tutor static skill', async () => {
    const results = await syncCore({ skills: ['cc-tutor', 'cc-learning-path'], silent: true })

    expect(results).toHaveLength(2)
    expect(results.map((r) => r.id)).toEqual(['cc-tutor', 'cc-learning-path'])
    expect(generateSkillIndexMock).toHaveBeenCalledTimes(1)

    const tutorInstallCall = installMock.mock.calls.find((call) => call[0][0].id === 'cc-tutor')
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
})
