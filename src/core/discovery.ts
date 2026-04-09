import type { SkillDefinition } from '../config/skills-registry.js'
import type { PulseMeta } from './meta.js'
import { fetchDoc } from './fetcher.js'
import { warn } from '../utils/logger.js'

export interface LlmsTxtEntry {
  title: string
  url: string
  description: string
}

export const LLMS_TXT_URL = 'https://code.claude.com/docs/llms.txt'

const LINE_REGEX = /^- \[(.+?)\]\((https?:\/\/[^\s)]+)\):\s+(.+)$/

function normalizeUrl(url: string): string {
  try {
    return new URL(url).toString()
  } catch {
    return url
  }
}

function isExcludedPath(url: string): boolean {
  try {
    const { pathname } = new URL(url)
    return pathname.startsWith('/docs/en/agent-sdk/') || pathname.startsWith('/docs/en/whats-new/')
  } catch {
    return true
  }
}

function deriveSkillIdFromUrl(url: string): string {
  const pathname = new URL(url).pathname
  const basePath = pathname
    .replace(/^\/docs\/en\//, '')
    .replace(/\.md$/i, '')
    .trim()

  const normalized = basePath
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  return `cc-${normalized || 'unknown'}`
}

export function parseLlmsTxt(content: string): LlmsTxtEntry[] {
  const entries: LlmsTxtEntry[] = []
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    const match = line.match(LINE_REGEX)
    if (!match) {
      continue
    }

    const [, title, url, description] = match
    entries.push({
      title: title.trim(),
      url: normalizeUrl(url.trim()),
      description: description.trim(),
    })
  }

  return entries
}

export function filterDiscoveredUrls(
  entries: LlmsTxtEntry[],
  registry: SkillDefinition[],
): LlmsTxtEntry[] {
  const knownUrls = new Set(
    registry
      .map((skill) => skill.sourceUrl)
      .filter((url): url is string => Boolean(url))
      .map((url) => normalizeUrl(url)),
  )

  return entries.filter((entry) => {
    if (knownUrls.has(entry.url)) {
      return false
    }
    if (isExcludedPath(entry.url)) {
      return false
    }
    return true
  })
}

export function toSkillDefinition(entry: LlmsTxtEntry): SkillDefinition {
  const id = deriveSkillIdFromUrl(entry.url)
  const description = entry.description.slice(0, 250)

  return {
    id,
    sourceUrl: entry.url,
    name: id,
    description,
    priority: 'medium',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 600,
    static: false,
  }
}

export async function discoverSkills(
  registry: SkillDefinition[],
  meta: PulseMeta,
): Promise<SkillDefinition[]> {
  try {
    const previousEtag = meta.etags[LLMS_TXT_URL]
    const result = await fetchDoc(LLMS_TXT_URL, previousEtag)

    if (!result.changed) {
      return []
    }

    if (result.etag) {
      meta.etags[LLMS_TXT_URL] = result.etag
    }

    const parsed = parseLlmsTxt(result.content)
    const filtered = filterDiscoveredUrls(parsed, registry)
    return filtered.map(toSkillDefinition)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    warn(`  ! Skill discovery skipped: ${message}`)
    return []
  }
}
