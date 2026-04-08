import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { getHookCommand } from '../utils/platform.js'

interface CommandHook {
  type: 'command'
  command: string
}

interface HookMatcher {
  _pulse?: boolean
  matcher: string
  hooks: CommandHook[]
  [key: string]: unknown
}

interface Settings {
  hooks?: {
    SessionStart?: HookMatcher[]
    [key: string]: unknown
  }
  permissions?: {
    allow?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

function settingsPath(): string {
  return join(process.cwd(), '.claude', 'settings.json')
}

function readSettings(): Settings {
  const path = settingsPath()
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
}

function writeSettings(settings: Settings): void {
  const path = settingsPath()
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(path, JSON.stringify(settings, null, 2) + '\n', 'utf-8')
}

function findPulseHookIndex(entries: Record<string, unknown>[]): number {
  return entries.findIndex((e) => e._pulse === true)
}

function isValidFormat(entry: Record<string, unknown>): boolean {
  return typeof entry.matcher === 'string' && Array.isArray(entry.hooks)
}

function buildPulseHook(): HookMatcher {
  return {
    _pulse: true,
    matcher: '',
    hooks: [{ type: 'command', command: getHookCommand() }],
  }
}

function getPulseMemoryPermissions(): string[] {
  const pulseDir = join(homedir(), '.claude', 'pulse')
  return [
    `Read(${pulseDir}/**)`,
    `Edit(${pulseDir}/**)`,
    `Write(${pulseDir}/**)`,
    `Bash(pulse memory*)`,
  ]
}

function addPulsePermissions(settings: Settings): boolean {
  if (!settings.permissions) {
    settings.permissions = {}
  }
  if (!settings.permissions.allow) {
    settings.permissions.allow = []
  }

  const required = getPulseMemoryPermissions()
  const existing = new Set(settings.permissions.allow)
  let changed = false

  for (const perm of required) {
    if (!existing.has(perm)) {
      settings.permissions.allow.push(perm)
      changed = true
    }
  }

  return changed
}

export function ensurePermissions(): void {
  const settings = readSettings()
  if (addPulsePermissions(settings)) {
    writeSettings(settings)
  }
}

export function addHook(): void {
  const settings = readSettings()

  if (!settings.hooks) {
    settings.hooks = {}
  }

  if (!settings.hooks.SessionStart) {
    settings.hooks.SessionStart = []
  }

  const sessionStart = settings.hooks.SessionStart as Record<string, unknown>[]
  const idx = findPulseHookIndex(sessionStart)
  let changed = false

  if (idx >= 0) {
    // Migrate old format to new if needed
    if (!isValidFormat(sessionStart[idx])) {
      sessionStart[idx] = buildPulseHook()
      changed = true
    }
  } else {
    sessionStart.push(buildPulseHook())
    changed = true
  }

  // Always ensure pulse memory permissions are present
  const permChanged = addPulsePermissions(settings)

  if (changed || permChanged) {
    writeSettings(settings)
  }
}

function removePulsePermissions(settings: Settings): void {
  if (!settings.permissions?.allow) return

  const pulsePerms = new Set(getPulseMemoryPermissions())
  settings.permissions.allow = settings.permissions.allow.filter((p) => !pulsePerms.has(p))

  if (settings.permissions.allow.length === 0) {
    delete settings.permissions.allow
  }
  if (Object.keys(settings.permissions).length === 0) {
    delete settings.permissions
  }
}

export function removeHook(): void {
  const path = settingsPath()
  if (!existsSync(path)) return

  const settings = readSettings()

  // Remove hook
  const sessionStart = settings.hooks?.SessionStart as HookMatcher[] | undefined
  if (sessionStart && findPulseHookIndex(sessionStart) >= 0) {
    const filtered = sessionStart.filter((e) => e._pulse !== true)

    if (filtered.length > 0) {
      settings.hooks!.SessionStart = filtered
    } else {
      delete settings.hooks!.SessionStart
    }

    if (Object.keys(settings.hooks!).length === 0) {
      delete settings.hooks
    }
  }

  // Remove permissions
  removePulsePermissions(settings)

  writeSettings(settings)
}
