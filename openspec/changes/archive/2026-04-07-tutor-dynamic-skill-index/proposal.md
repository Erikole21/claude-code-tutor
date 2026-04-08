## Why

The cc-tutor skill is currently `static: true` with hardcoded references to other `cc-*` skills (e.g., "sugiere `/cc-learning-path`", "las skills `cc-hooks-*`, `cc-mcp`, `cc-settings` tienen referencia detallada"). When new skills are added to the registry or existing ones are renamed/removed, the tutor's internal index becomes stale.

During `pulse sync` (triggered by the SessionStart hook), the system already fetches and transforms all skills from the registry. The tutor should leverage this — its skill index section should be dynamically generated from the current `SKILLS_REGISTRY` at sync time, so the tutor always knows what skills are available and can guide users to the right one.

This depends on the `fix-skill-frontmatter-conventions` change being applied first (`cc-tutor` is the only auto-activable skill and MUST set `disableModelInvocation: false` explicitly; all others are manual-invoke via `/name`).

All changes MUST be validated against the official Claude Code documentation:
- Skills: https://code.claude.com/docs/en/skills.md
- Hooks: https://code.claude.com/docs/en/hooks.md

## What Changes

- During `pulse sync`, generate a dynamic "Available Skills" section for cc-tutor from the current `SKILLS_REGISTRY`
- The tutor's static content (`cc-tutor.md`) keeps its core instructions (personality, behavior, memory, rules) but the skill index is injected at sync time
- The generated index includes each skill's `/name` and description so the tutor can recommend the right skill based on the user's question
- When new skills are added to the registry in future versions, the tutor automatically picks them up on next sync — no manual edit needed

## Capabilities

### New Capabilities

- `tutor-skill-index`: Generate a dynamic skill index section for cc-tutor at sync time from SKILLS_REGISTRY, appended to the static tutor content

### Modified Capabilities

- `cc-tutor-skill`: The static cc-tutor.md removes hardcoded skill references; instead a placeholder or append point is used for the dynamic index
- `cli-sync`: Sync process generates and injects the skill index into cc-tutor before installing it

## Impact

- **`src/static-skills/cc-tutor.md`**: Remove hardcoded skill references, add a clear separation point for dynamic content
- **`src/commands/sync.ts`** or **`src/core/transformer.ts`**: Add logic to generate skill index and append to cc-tutor content at sync time
- **`scripts/generate-fallback-skills.ts`**: Same logic for build-time fallback generation
- **No new dependencies**: Uses existing `SKILLS_REGISTRY` data
