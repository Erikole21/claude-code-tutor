import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { readMeta } from './meta.js'

export interface SkillInput {
  id: string
  content: string
}

function skillsBase(): string {
  return join(process.cwd(), '.claude', 'skills')
}

function skillFilePath(id: string): string {
  return join(skillsBase(), id, 'SKILL.md')
}

function hasPulseFrontmatter(content: string): boolean {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  return match !== null && /^_pulse:\s*true$/m.test(match[1])
}

function ensurePulseFrontmatter(content: string): string {
  if (hasPulseFrontmatter(content)) return content
  return `---\n_pulse: true\n---\n${content}`
}

export function isManaged(skillDir: string): boolean {
  const filePath = join(skillDir, 'SKILL.md')
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const match = raw.match(/^---\n([\s\S]*?)\n---/)
    if (!match) return false
    return /^_pulse:\s*true$/m.test(match[1])
  } catch {
    return false
  }
}

export function install(skills: SkillInput[]): void {
  for (const skill of skills) {
    const dir = join(skillsBase(), skill.id)
    const filePath = skillFilePath(skill.id)

    // If SKILL.md exists but is not pulse-managed, skip it
    if (existsSync(filePath) && !isManaged(dir)) {
      continue
    }

    mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, ensurePulseFrontmatter(skill.content), 'utf-8')
  }
}

export function getInstalledSkills(): string[] {
  const meta = readMeta()
  return Object.keys(meta.skills)
}
