import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface TopicProgress {
  status: 'pending' | 'in-progress' | 'completed'
  startedAt?: string
  completedAt?: string
  notes?: string
}

export interface FrequentQuestion {
  question: string
  topic?: string
  count: number
  lastAskedAt: string
}

export interface ExerciseEntry {
  status: 'pending' | 'in-progress' | 'completed'
  assignedAt?: string
  completedAt?: string
  feedback?: string
}

export interface NextStep {
  topicId: string
  reason: string
  suggestedAt: string
}

export interface LastSession {
  date: string
  duration?: number
  topicsCovered: string[]
  endNote: string
}

export interface PulseUserMemory {
  name: string
  language: string
  joinedAt: string
  level: 'beginner' | 'intermediate' | 'advanced'
  levelUpdatedAt: string
  topics: Record<string, TopicProgress>
  frequentQuestions: FrequentQuestion[]
  exercises: Record<string, ExerciseEntry>
  nextSteps: NextStep[]
  lastSession: LastSession | null
}

let baseDirOverride: string | null = null

export function setBaseDir(dir: string | null): void {
  baseDirOverride = dir
}

export function getBaseDir(): string {
  return baseDirOverride ?? join(homedir(), '.claude', 'pulse')
}

function memoryPath(): string {
  return join(getBaseDir(), 'memory.json')
}

export function getDefaultMemory(): PulseUserMemory {
  return {
    name: '',
    language: 'en',
    joinedAt: new Date().toISOString(),
    level: 'beginner',
    levelUpdatedAt: new Date().toISOString(),
    topics: {},
    frequentQuestions: [],
    exercises: {},
    nextSteps: [],
    lastSession: null,
  }
}

export async function readMemory(): Promise<PulseUserMemory | null> {
  try {
    const raw = await readFile(memoryPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<PulseUserMemory>
    const merged = { ...getDefaultMemory(), ...parsed }
    if (merged.lastSession) {
      merged.lastSession = {
        date: merged.lastSession.date ?? '',
        topicsCovered: merged.lastSession.topicsCovered ?? [],
        endNote: merged.lastSession.endNote ?? '',
        duration: merged.lastSession.duration,
      }
    }
    return merged
  } catch {
    return null
  }
}

export async function writeMemory(memory: PulseUserMemory): Promise<void> {
  const dir = getBaseDir()
  await mkdir(dir, { recursive: true })
  await writeFile(memoryPath(), JSON.stringify(memory, null, 2) + '\n', 'utf-8')
}

export async function updateMemory(patch: Partial<PulseUserMemory>): Promise<PulseUserMemory> {
  const current = (await readMemory()) ?? getDefaultMemory()
  const updated = { ...current, ...patch }
  await writeMemory(updated)
  return updated
}

export interface SessionLog {
  date: string
  topicsCovered: string[]
  endNote: string
  duration?: number
}

export async function logSession(log: SessionLog): Promise<void> {
  const sessionsDir = join(getBaseDir(), 'sessions')
  await mkdir(sessionsDir, { recursive: true })
  const filename = `${log.date}.json`
  await writeFile(join(sessionsDir, filename), JSON.stringify(log, null, 2) + '\n', 'utf-8')
}
