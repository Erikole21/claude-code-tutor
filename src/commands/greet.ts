import type { Command } from 'commander'
import { readMeta, writeMeta } from '../core/meta.js'

interface GreetOptions {
  once?: boolean
}

const WELCOME_MESSAGE = `\
claude-code-pulse-tutor is active — your skills are synchronized with the official Claude Code docs.

- Use /cc-tutor for an interactive guided tour of Claude Code features
- Use /cc-learning-path to see the full structured curriculum by level
- Skills auto-update daily via the SessionStart hook

The user has a pulse tutor memory at ~/.claude/pulse/memory.json. Read it only if the cc-tutor skill activates.

Happy coding!`

export function registerGreet(program: Command): void {
  program
    .command('greet')
    .description('Output welcome context for SessionStart hook')
    .option('--once', 'Only greet on first session')
    .action((opts: GreetOptions) => {
      const meta = readMeta()

      if (opts.once && meta.firstSessionDone) {
        return
      }

      const output = JSON.stringify({ additionalContext: WELCOME_MESSAGE })
      process.stdout.write(output + '\n')

      if (opts.once) {
        meta.firstSessionDone = true
        writeMeta(meta)
      }
    })
}
