## Why

The generated SKILL.md files use `invocation: auto` which is NOT a valid Claude Code frontmatter field (official fields: name, description, disable-model-invocation, user-invocable, allowed-tools, model, effort, context, agent, hooks, paths, shell). Additionally, skill descriptions exceed the 250-character cap introduced in v2.1.86, use non-standard `TRIGGER when:` format instead of natural language, and split skills (MCP, settings, common-workflows) share identical parent descriptions.

Critically, the 63 generated skills produce ~8,756 total description characters, exceeding Claude Code's default skill description budget of 8,000 characters (1% of context window). This causes descriptions to be truncated, which is why the cc-tutor fails to activate when users ask about Claude Code features. Per official docs: "if you have many skills, descriptions are shortened to fit the character budget, which can strip the keywords Claude needs to match your request."

**Solution:** Only cc-tutor should be auto-activable by Claude. All other skills should use `disable-model-invocation: true` so they don't consume description budget. The tutor already links to other `cc-*` skills internally, serving as the gateway to all documentation.

All changes MUST be validated against the official Claude Code documentation:
- Skills: https://code.claude.com/docs/en/skills.md
- Changelog (v2.1.86 description cap): https://code.claude.com/docs/en/changelog.md

## What Changes

- **BREAKING**: Remove `invocation: auto` from generated frontmatter in `transformer.ts` — this field is ignored by Claude Code and should not be present
- Add `disable-model-invocation: true` to ALL skills EXCEPT `cc-tutor` — this removes them from the description budget and ensures the tutor's description is never truncated
- Rewrite ALL skill descriptions in `skills-registry.ts` to be ≤250 chars, English, natural language, front-loading the use case with "Use when..." pattern (per official docs)
- Craft the `cc-tutor` description to ensure Claude loads it when users ask about Claude Code features (hooks, MCP, skills, settings, permissions, sub-agents, etc.)
- Add unique, differentiated descriptions to each `manualSection` entry so split skills are distinguishable when invoked via `/name`
- Update frontmatter generation to conditionally emit `disable-model-invocation: true` based on a new registry field
- Regenerate all fallback skills with corrected frontmatter

## Capabilities

### New Capabilities

_(none — this change modifies existing capabilities only)_

### Modified Capabilities

- `skills-registry`: Add `disableModelInvocation` field to SkillDefinition. Descriptions must be ≤250 chars, English, natural language, unique per skill/section. Only cc-tutor has model invocation enabled.
- `transform-orchestrator`: Remove `invocation: auto`, add conditional `disable-model-invocation: true` to generated frontmatter. Only emit valid Claude Code frontmatter fields.
- `fallback-skills-bundle`: Remove `invocation` from required fields, add `disable-model-invocation` where applicable. Regenerated skills must pass validation.

## Impact

- **`src/core/transformer.ts`**: Remove `invocation: auto`, add conditional `disable-model-invocation: true`
- **`src/config/skills-registry.ts`**: Add `disableModelInvocation` field, rewrite all 23 descriptions + manualSection descriptions
- **`skills-fallback/**`**: All 63 generated SKILL.md files will be regenerated
- **Tests**: Update assertions for new frontmatter format
