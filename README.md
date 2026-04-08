# claude-code-tutor

Your Claude Code companion. Fresh docs, built-in tutor (Pulse), always in sync.

[![npm version](https://img.shields.io/npm/v/claude-code-tutor)](https://www.npmjs.com/package/claude-code-tutor)
![Node >=18](https://img.shields.io/badge/node-%3E%3D18-339933)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6)
![Tests](https://img.shields.io/badge/tests-vitest-6e9f18)

**npm:** [claude-code-tutor](https://www.npmjs.com/package/claude-code-tutor) | **GitHub:** [Erikole21/claude-code-tutor](https://github.com/Erikole21/claude-code-tutor)

## Installation

### Recommended (global install)

```bash
npm install -g claude-code-tutor
```

Then verify:

```bash
pulse --version
```

Global install makes the `pulse` command available system-wide, but you still need to initialize each repository where you want to use it:

```bash
pulse init
```

### Update

```bash
npm update -g claude-code-tutor
```

Then re-initialize each repo to apply hook and skill fixes:

```bash
pulse init --force
```

Use `--yes` to skip the confirmation prompt:

```bash
pulse init --force --yes
```

### Quick run (no global install)

```bash
npx pulse init
```

This command installs pulse skills in `.claude/skills`, runs an initial sync, and adds a safe `SessionStart` hook.

### How it works across repositories and new Claude sessions

- Global npm install adds the CLI binary only.
- `pulse init` configures the current repository only.
- Each repository must be initialized once.
- New Claude Code sessions in an initialized repository use that repo's `.claude` configuration and hooks automatically.
- In a brand-new repository, run `pulse init` first.

## How Pulse activates

**Pulse** is your built-in tutor — it has a name, a personality, and remembers your progress. It activates automatically inside Claude Code — no slash command needed. It triggers when you:

- **Mention Pulse** anywhere in your message: `"pulse"`, `"hey pulse, help me"`, `"en que vamos pulse?"`
- **Are new to Claude Code**: `"it's my first time"`, `"how do I get started?"`
- **Ask for help or guidance**: `"how can you help me?"`, `"what can I do here?"`
- **Ask about any Claude Code feature**: hooks, MCP, skills, agents, settings, permissions, channels, plugins, workflows, and more — anything covered by the installed skills

Pulse does **not** activate for regular coding tasks like `"fix the bug in app.ts"` or `"add a login page"`. It only responds when the conversation is about Claude Code itself.

> **Tip:** You can also invoke Pulse explicitly with `/pulse` if you prefer.

## What can you do with pulse?

### Beginner — Your first steps

Never used Claude Code? Pulse guides you from zero:

```
You:   "It's my first time using Claude Code, help me"
Pulse: "Welcome! I'm Pulse, your Claude Code tutor. What's your name?
        ...Great! Let's start with the basics. Open any project folder
        and type 'claude'. That's it — you're in a session.
        Try asking Claude to explain a file in your project."
```

Ask anything, Pulse adapts to your language automatically:

```
You:   "No entiendo qué es CLAUDE.md"
Pulse: "Es un archivo que le da contexto a Claude sobre tu proyecto.
        Piensa en él como un README pero para Claude. Creemos uno juntos:
        crea un archivo CLAUDE.md en la raíz de tu proyecto..."
```

Learn what commands are available:

```
You:   "What commands can I use?"
Pulse: "Here are the essentials to get started:
        /help     — see all available commands
        /compact  — compress conversation when it gets long
        /cost     — check how much you've spent this session
        /memory   — see what Claude remembers about your project
        Try /help now and tell me what catches your eye!"
```

### Intermediate — Level up your workflow

Already using Claude Code? Pulse helps you unlock powerful features:

```
You:   "I want to automate something every time I start a session"
Pulse: "That's what hooks are for! A SessionStart hook runs a shell command
        every time Claude opens. For example, to auto-format your code:

        In .claude/settings.json:
        { 'hooks': { 'SessionStart': [{ 'command': 'npm run lint:fix' }] } }

        Want me to walk you through setting one up for your project?"
```

Connect external tools:

```
You:   "Can Claude access my database?"
Pulse: "Yes! Through MCP servers. You configure them in settings.json
        and Claude gets read/write access. Here's how to connect PostgreSQL:
        ..."
```

Create custom skills for your team:

```
You:   "How do I create a skill for code review?"
Pulse: "Create a file at .claude/skills/code-review/SKILL.md with
        instructions for how Claude should review code in your stack.
        Let me show you the structure..."
```

### Advanced — Scale with your team

For power users building automation and team workflows:

```
You:   "I need multiple agents working in parallel on different tasks"
Pulse: "Agent teams let you coordinate multiple Claude instances.
        You define agents with roles (reviewer, implementer, tester)
        and they work on isolated worktrees. Here's the pattern:
        ..."
```

Integrate with CI/CD:

```
You:   "How do I get Claude to review PRs automatically?"
Pulse: "With GitHub Actions. Add @claude mentions in your workflow
        and Claude reviews PRs, suggests fixes, and can even push
        commits. Here's a working workflow file:
        ..."
```

Run Claude in scripts:

```
You:   "I want to use Claude in a bash script"
Pulse: "Headless mode! Use 'claude --print' for single-shot tasks:

        claude --print 'summarize the changes in the last 5 commits'

        It returns the output directly to stdout. Perfect for
        CI pipelines, cron jobs, or chaining with other tools."
```

### Pulse remembers you across sessions

Your first session:

```
Pulse: "Hey! I'm Pulse, your Claude Code tutor. What's your name?"
You:   "Ana"
Pulse: "Nice to meet you, Ana! Let's figure out your level..."
```

Your next session, days later:

```
Pulse: "Hey Ana! Last time we set up your first hook. Ready to
        learn about MCP servers? That was your next step."
```

Pulse saves progress incrementally after each topic it explains, not just at the end of the session. If you close the terminal mid-conversation, your progress is still there.

Check your progress anytime:

```bash
$ pulse memory
  Name:     Ana
  Level:    intermediate
  Language: es
  Joined:   4/1/2026

  Topics: 5 completed, 2 in progress, 3 pending
    ✓ basic-commands
    ✓ permissions
    ✓ claude-md
    ✓ git-workflow
    ✓ hooks
    … mcp-servers
    … sub-agents

  Next steps:
    → mcp-servers: Ready after mastering hooks
```

### Set it up once per repo, works every session

```bash
npm install -g claude-code-tutor
cd my-project
pulse init
# Done. Every Claude Code session in this repo now has fresh docs and Pulse as your tutor.
```

## What pulse does

- **Doc sync**: downloads Claude Code docs and keeps skills fresh.
- **Bundled fallback**: if the official docs are unreachable, pulse installs pre-built skills so you are never left without reference material.
- **Built-in tutor**: includes `pulse` for guided help in-session. Reads your memory first, greets you by name, and saves progress incrementally so nothing is lost if the session ends unexpectedly.
- **Learning path**: includes `cc-learning-path` for structured onboarding.
- **Skill index**: dynamically generates a reference index of all installed skills and appends it to `pulse`, so Pulse always knows which skills to recommend.

## Skills

| ID | Description | Priority |
|---|---|---|
| `pulse` | Claude Code companion: tutor + motivator with practical guidance and ideas. | `critical` |
| `cc-learning-path` | Structured multi-level learning path. | `high` |
| `cc-changelog` | Recent updates and changes in Claude Code. | `critical` |
| `cc-hooks-events` | Hook events table and when they trigger. | `critical` |
| `cc-hooks-guide` | Practical guide for implementing hooks. | `critical` |
| `cc-mcp` | MCP server setup and usage. | `critical` |
| `cc-settings` | `settings.json` reference and scopes. | `critical` |
| `cc-permissions` | Permission system and per-tool rules. | `critical` |
| `cc-sub-agents` | Sub-agent setup and usage. | `high` |
| `cc-agent-teams` | Coordinating multiple agents in teams. | `high` |
| `cc-skills-guide` | How to create and maintain skills. | `high` |
| `cc-memory` | Using `CLAUDE.md` and project memory. | `high` |
| `cc-cli-reference` | CLI commands and flags reference. | `high` |
| `cc-commands` | Built-in Claude Code commands. | `high` |
| `cc-model-config` | Model configuration and aliases. | `high` |
| `cc-plugins` | Plugin architecture and authoring. | `medium` |
| `cc-channels` | Channels and webhook workflows. | `medium` |
| `cc-scheduled-tasks` | Scheduled tasks with `/loop` and cron. | `medium` |
| `cc-headless` | Headless execution and SDK usage. | `medium` |
| `cc-sandboxing` | Sandboxing and isolation. | `medium` |
| `cc-common-workflows` | Common development workflows. | `medium` |
| `cc-best-practices` | Recommended practices and patterns. | `medium` |
| `cc-github-actions` | Claude Code integration with GitHub Actions. | `medium` |

## Team usage

If your team wants the same skills, commit the generated directories:

```text
.claude/skills/cc-*/
```

Pulse only manages skills marked with `_pulse: true`, so user-owned custom skills are preserved.

## CLI commands

| Command | Description | Key flags |
|---|---|---|
| `pulse init` | Initializes pulse in current project. | `--force`, `--yes`, `--skills <ids...>` |
| `pulse sync` | Fetches, transforms, and installs skills. | `--force`, `--if-stale <seconds>`, `--silent`, `--skills <ids...>` |
| `pulse greet` | Emits session context for the SessionStart hook. | _(none)_ |
| `pulse list` | Lists installed skills and freshness state. | _(none)_ |
| `pulse status` | Shows global pulse status and diagnostics. | _(none)_ |
| `pulse uninstall` | Removes pulse hook and pulse-managed skills. | `--keep-hook`, `--keep-skills`, `--purge-memory` |

## Your tutor progress

Pulse remembers your learning progress across sessions in `~/.claude/pulse/memory.json`. This is the **only** source of truth for tutor memory — Pulse does not use Claude's native auto-memory system for session continuity.

| Command | Description |
|---|---|
| `pulse memory` | View your tutor progress summary |
| `pulse memory --reset` | Reset memory (keeps session logs) |
| `pulse memory --export` | Export memory as JSON |
| `pulse memory --import <file>` | Import memory from a JSON file |
| `pulse memory --update '<JSON>'` | Update specific memory fields |
| `pulse memory --exercise <id> --status <status>` | Update exercise status |
| `pulse memory --next-step "<desc>" --reason "<reason>"` | Add a next step |

Memory is stored locally and never leaves your machine. Use `pulse uninstall --purge-memory` to delete all memory data.

## Sync mechanism

- **ETag caching**: unchanged docs return `304` and are skipped.
- **Transformer pipeline**: tries Claude CLI transform first, then static fallback. Truncated skills include a note directing Claude to fetch the full official documentation instead of guessing.
- **Bundled fallback**: when fetch or manual-split fails, pulse installs pre-built skills from `skills-fallback/` so you always have a working reference.
- **SessionStart hook**: runs daily stale-aware sync (`--if-stale 86400`) and injects tutor activation context every session.

## Configuration

Create `.pulserc.json` in your project:

```json
{
  "skills": ["critical", "high"],
  "maxAge": 86400,
  "transformer": "auto",
  "silent": false
}
```

| Option | Default | Valid values | Description |
|---|---|---|---|
| `skills` | `["critical","high"]` | `["critical"]`, `["critical","high"]`, `["all"]`, etc. | Skill priorities to sync. |
| `maxAge` | `86400` | number (seconds) | Staleness threshold for auto-sync decisions. |
| `transformer` | `"auto"` | `"auto"`, `"static"` | Transformation mode. `auto` prefers Claude CLI. |
| `silent` | `false` | `true`, `false` | Suppress non-error output. |

## Troubleshooting

- **Hook does not run**: check `.claude/settings.json` has a `SessionStart` entry with `_pulse: true`.
- **Windows behavior**: pulse uses `npx.cmd` on native Windows and Unix format on WSL.
- **Skills look stale**: run `pulse sync --force` to bypass ETag cache.
- **Claude CLI unavailable**: pulse automatically falls back to static transformer.

## Contributing

- Improve static skill sources under `src/static-skills/`.
- Improve tutor and learning content in `pulse.md` and `cc-learning-path.md`.
- Adjust the dynamic skill index generator in `src/core/skill-index.ts`.
- Add/adjust tests in `tests/` when changing fetch, transform, split, or hook behavior.
- After changes, run `npm run build:skills` to regenerate `skills-fallback/`.
