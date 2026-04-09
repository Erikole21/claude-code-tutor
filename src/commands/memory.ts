import type { Command } from 'commander'
import { readFile, rm } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import {
  readMemory,
  writeMemory,
  updateMemory,
  getBaseDir,
} from '../core/tutor-memory.js'
import { log, error, success } from '../utils/logger.js'
import { join } from 'node:path'

interface MemoryOptions {
  reset?: boolean
  export?: boolean
  import?: string
  update?: string
  exercise?: string
  status?: string
  nextStep?: string
  reason?: string
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

function formatDate(iso: string): string {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString()
}

async function showProgress(): Promise<void> {
  const memory = await readMemory()
  if (!memory) {
    log('No tutor sessions recorded yet. Start a session with /pulse.')
    return
  }

  log('\n📋 Tutor Memory')
  log('─'.repeat(40))

  // Identity
  log(`  Name:     ${memory.name || '(not set)'}`)
  log(`  Level:    ${memory.level}`)
  log(`  Language: ${memory.language}`)
  log(`  Joined:   ${formatDate(memory.joinedAt)}`)

  // Last session
  if (memory.lastSession) {
    log(`\n  Last session: ${formatDate(memory.lastSession.date)}`)
    if (memory.lastSession.topicsCovered?.length > 0) {
      log(`  Topics:       ${memory.lastSession.topicsCovered.join(', ')}`)
    }
    if (memory.lastSession.endNote) {
      log(`  Note:         ${memory.lastSession.endNote}`)
    }
  }

  // Topics
  const topicEntries = Object.entries(memory.topics)
  if (topicEntries.length > 0) {
    const completed = topicEntries.filter(([, t]) => t.status === 'completed').length
    const inProgress = topicEntries.filter(([, t]) => t.status === 'in-progress').length
    const pending = topicEntries.filter(([, t]) => t.status === 'pending').length
    log(`\n  Topics: ${completed} completed, ${inProgress} in progress, ${pending} pending`)
    for (const [id, topic] of topicEntries) {
      const icon = topic.status === 'completed' ? '✓' : topic.status === 'in-progress' ? '…' : '○'
      log(`    ${icon} ${id}`)
    }
  }

  // Exercises
  const exerciseEntries = Object.entries(memory.exercises)
  if (exerciseEntries.length > 0) {
    log(`\n  Exercises:`)
    for (const [id, ex] of exerciseEntries) {
      const icon = ex.status === 'completed' ? '✓' : ex.status === 'in-progress' ? '…' : '○'
      log(`    ${icon} ${id}`)
    }
  }

  // Frequent questions
  if (memory.frequentQuestions.length > 0) {
    log(`\n  Frequent questions:`)
    for (const q of memory.frequentQuestions) {
      log(`    (${q.count}x) ${q.question}`)
    }
  }

  // Next steps
  if (memory.nextSteps.length > 0) {
    log(`\n  Next steps:`)
    for (const step of memory.nextSteps) {
      log(`    → ${step.topicId}: ${step.reason}`)
    }
  }

  log('')
}

export function registerMemory(program: Command): void {
  program
    .command('memory')
    .description('View and manage tutor memory')
    .option('--reset', 'Delete memory (keeps session logs)')
    .option('--export', 'Print memory as JSON to stdout')
    .option('--import <file>', 'Replace memory from a JSON file')
    .option('--update <json>', 'Merge a JSON patch into memory')
    .option('--exercise <id>', 'Update an exercise entry')
    .option('--status <status>', 'Exercise status (use with --exercise)')
    .option('--next-step <desc>', 'Add a next step recommendation')
    .option('--reason <reason>', 'Reason for the next step')
    .action(async (opts: MemoryOptions) => {
      // --reset
      if (opts.reset) {
        const yes = await confirm('Delete tutor memory? Session logs will be preserved.')
        if (!yes) {
          log('Reset cancelled.')
          return
        }
        const memoryFile = join(getBaseDir(), 'memory.json')
        try {
          await rm(memoryFile)
          success('Memory reset successfully.')
        } catch {
          log('No memory file to delete.')
        }
        return
      }

      // --export
      if (opts.export) {
        const memory = await readMemory()
        if (!memory) {
          error('No memory file found.')
          process.exitCode = 1
          return
        }
        process.stdout.write(JSON.stringify(memory, null, 2) + '\n')
        return
      }

      // --import
      if (opts.import) {
        try {
          const raw = await readFile(opts.import, 'utf-8')
          const data = JSON.parse(raw)
          await writeMemory(data)
          success('Memory imported successfully.')
        } catch (err) {
          error(`Failed to import: ${err instanceof Error ? err.message : err}`)
          process.exitCode = 1
        }
        return
      }

      // --update
      if (opts.update) {
        try {
          const patch = JSON.parse(opts.update)
          await updateMemory(patch)
          success('Memory updated.')
        } catch (err) {
          error(`Invalid JSON: ${err instanceof Error ? err.message : err}`)
          process.exitCode = 1
        }
        return
      }

      // --exercise <id> --status <status>
      if (opts.exercise) {
        const status = opts.status as 'pending' | 'in-progress' | 'completed' | undefined
        if (!status) {
          error('--exercise requires --status <pending|in-progress|completed>')
          process.exitCode = 1
          return
        }
        const memory = (await readMemory()) ?? (await import('../core/tutor-memory.js')).getDefaultMemory()
        const existing = memory.exercises[opts.exercise] ?? { status: 'pending' }
        existing.status = status
        if (status === 'completed') {
          existing.completedAt = new Date().toISOString()
        }
        if (status === 'in-progress' && !existing.assignedAt) {
          existing.assignedAt = new Date().toISOString()
        }
        memory.exercises[opts.exercise] = existing
        await writeMemory(memory)
        success(`Exercise "${opts.exercise}" updated to ${status}.`)
        return
      }

      // --next-step <desc> --reason <reason>
      if (opts.nextStep) {
        const memory = (await readMemory()) ?? (await import('../core/tutor-memory.js')).getDefaultMemory()
        memory.nextSteps.push({
          topicId: opts.nextStep,
          reason: opts.reason ?? '',
          suggestedAt: new Date().toISOString(),
        })
        await writeMemory(memory)
        success(`Next step added: ${opts.nextStep}`)
        return
      }

      // Default: show progress
      await showProgress()
    })
}
