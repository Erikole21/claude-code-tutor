import { afterEach, describe, expect, it, vi } from 'vitest'

const originalPlatform = process.platform

async function loadPlatformModule(options: {
  platform: NodeJS.Platform
  procVersionExists?: boolean
  procVersionContent?: string
}) {
  vi.resetModules()

  Object.defineProperty(process, 'platform', {
    value: options.platform,
    configurable: true,
  })

  vi.doMock('node:fs', () => ({
    existsSync: (path: string) => {
      if (path !== '/proc/version') return false
      return options.procVersionExists ?? false
    },
    readFileSync: () => options.procVersionContent ?? '',
  }))

  return import('../src/utils/platform.js')
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('node:fs')
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
    configurable: true,
  })
})

describe('platform', () => {
  it('detectPlatform returns windows for win32', async () => {
    const mod = await loadPlatformModule({ platform: 'win32' })
    expect(mod.detectPlatform()).toBe('windows')
  })

  it('detectPlatform returns unix for darwin', async () => {
    const mod = await loadPlatformModule({ platform: 'darwin' })
    expect(mod.detectPlatform()).toBe('unix')
  })

  it('detectPlatform returns unix for linux without wsl marker', async () => {
    const mod = await loadPlatformModule({
      platform: 'linux',
      procVersionExists: true,
      procVersionContent: 'Linux version 6.10 generic',
    })
    expect(mod.detectPlatform()).toBe('unix')
  })

  it('detectPlatform returns wsl when /proc/version contains microsoft', async () => {
    const mod = await loadPlatformModule({
      platform: 'linux',
      procVersionExists: true,
      procVersionContent: 'Linux version 5.15.90.1-microsoft-standard-WSL2',
    })
    expect(mod.detectPlatform()).toBe('wsl')
  })

  it('getHookCommand returns windows command format', async () => {
    const mod = await loadPlatformModule({ platform: 'win32' })
    expect(mod.getHookCommand()).toBe(
      'npx.cmd pulse sync --if-stale 86400 --silent & npx.cmd pulse greet',
    )
  })

  it('getHookCommand returns unix command format for unix and wsl', async () => {
    const unixModule = await loadPlatformModule({ platform: 'darwin' })
    expect(unixModule.getHookCommand()).toBe(
      'npx pulse sync --if-stale 86400 --silent && npx pulse greet || true',
    )

    const wslModule = await loadPlatformModule({
      platform: 'linux',
      procVersionExists: true,
      procVersionContent: 'microsoft',
    })
    expect(wslModule.getHookCommand()).toBe(
      'npx pulse sync --if-stale 86400 --silent && npx pulse greet || true',
    )
  })
})
