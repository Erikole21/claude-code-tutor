import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { getVersion } from '../version.js'
import type { SkillDefinition } from '../config/skills-registry.js'

export interface SkillMeta {
  syncedAt: string
  transformedWith: 'claude' | 'static' | 'fixed'
  etag?: string
}

export interface PulseMeta {
  version: string
  lastSync: string
  lastSyncStatus: 'success' | 'partial' | 'failed'
  lastSyncError?: string
  firstSessionDone: boolean
  skills: Record<string, SkillMeta>
  etags: Record<string, string>
  discoveredSkills: Record<string, DiscoveredSkillEntry>
}

export interface DiscoveredSkillEntry {
  id: string
  sourceUrl: string
  name: string
  description: string
  discoveredAt: string
  fromLlmsTxt: true
  priority: 'medium'
  disableModelInvocation: true
  splitStrategy: 'none'
  tokenBudget: 600
  static: false
}

function metaPath(): string {
  return join(process.cwd(), '.claude', 'skills', '.pulse-meta.json')
}

function defaultMeta(): PulseMeta {
  return {
    version: getVersion(),
    lastSync: '',
    lastSyncStatus: 'failed',
    firstSessionDone: false,
    skills: {},
    etags: {},
    discoveredSkills: {},
  }
}

export function getMetaPath(): string {
  return metaPath()
}

export function readMeta(): PulseMeta {
  const path = metaPath()
  try {
    const raw = readFileSync(path, 'utf-8')
    return { ...defaultMeta(), ...JSON.parse(raw) }
  } catch {
    return defaultMeta()
  }
}

export function writeMeta(meta: PulseMeta): void {
  const path = metaPath()
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(path, JSON.stringify(meta, null, 2) + '\n', 'utf-8')
}

export function isStale(maxAgeSeconds: number): boolean {
  const meta = readMeta()
  if (!meta.lastSync) return true

  const lastSyncTime = new Date(meta.lastSync).getTime()
  if (isNaN(lastSyncTime)) return true

  const elapsed = (Date.now() - lastSyncTime) / 1000
  return elapsed > maxAgeSeconds
}

export function persistDiscoveredSkills(meta: PulseMeta, discovered: SkillDefinition[]): void {
  const discoveredAt = new Date().toISOString()
  const entries: Record<string, DiscoveredSkillEntry> = {}

  for (const skill of discovered) {
    if (!skill.sourceUrl) {
      continue
    }

    entries[skill.id] = {
      id: skill.id,
      sourceUrl: skill.sourceUrl,
      name: skill.name,
      description: skill.description,
      discoveredAt,
      fromLlmsTxt: true,
      priority: 'medium',
      disableModelInvocation: true,
      splitStrategy: 'none',
      tokenBudget: 600,
      static: false,
    }
  }

  meta.discoveredSkills = entries
}

export function loadDiscoveredSkills(meta: PulseMeta): SkillDefinition[] {
  return Object.values(meta.discoveredSkills ?? {}).map((entry) => ({
    id: entry.id,
    sourceUrl: entry.sourceUrl,
    name: entry.name,
    description: entry.description.slice(0, 250),
    priority: 'medium',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 600,
    static: false,
  }))
}
