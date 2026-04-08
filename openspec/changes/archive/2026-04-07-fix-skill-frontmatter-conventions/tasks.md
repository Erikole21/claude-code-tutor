## 1. Update SkillDefinition interface and registry

- [x] 1.1 Add `disableModelInvocation?: boolean` field to `SkillDefinition` interface in `src/config/skills-registry.ts`
- [x] 1.2 Set `disableModelInvocation: false` ONLY on `cc-tutor`. All other skills either set `disableModelInvocation: true` or omit it (transformer treats unset as `true`)

## 2. Update frontmatter generation in transformer.ts (runtime sync)

- [x] 2.1 Remove the `'invocation: auto'` line from `generateFrontmatter()` in `src/core/transformer.ts` (~line 25)
- [x] 2.2 Add a `disableModelInvocation` parameter to `generateFrontmatter()`. When `true` (or unset), emit `disable-model-invocation: true`. When `false`, omit the field
- [x] 2.3 Pass `def.disableModelInvocation` from the skill definition to `generateFrontmatter()` in `transformSkill()`
- [x] 2.4 Verify generated frontmatter only contains valid Claude Code fields (name, description, disable-model-invocation) plus internal fields (_pulse, _syncedAt, _source)

## 2b. Update frontmatter generation in generate-fallback-skills.ts (build-time)

- [x] 2b.1 In `scripts/generate-fallback-skills.ts`, update `frontmatterFor()` (~line 20-37): remove `'invocation: auto'`, add `disableModelInvocation` parameter, conditionally emit `disable-model-invocation: true`
- [x] 2b.2 Update `processStaticSkill()` and `processDocSkill()` to pass `def.disableModelInvocation` to `frontmatterFor()`
- [x] 2b.3 Update `writeFallbackSkill()` signature to accept and forward `disableModelInvocation`
- [x] 2b.4 Consider refactoring: extract a shared `buildFrontmatter()` utility used by BOTH `transformer.ts` and `generate-fallback-skills.ts` to avoid duplicate frontmatter logic (optional but recommended)

## 3. Rewrite skill descriptions

- [x] 3.1 Rewrite `cc-tutor` description: English, ≤250 chars, explicitly mention hooks, MCP, skills, settings, permissions, sub-agents. Example: `"Interactive Claude Code tutor. Use when the user asks about hooks, MCP, skills, settings, permissions, sub-agents, or wants to learn how Claude Code works."`
- [x] 3.2 Rewrite `cc-learning-path` description: ≤250 chars, English, natural language
- [x] 3.3 Rewrite all critical-priority skill descriptions (cc-changelog, cc-hooks-events, cc-hooks-guide, cc-mcp, cc-settings, cc-permissions): ≤250 chars each, English, natural language
- [x] 3.4 Rewrite all high-priority skill descriptions (cc-sub-agents, cc-agent-teams, cc-skills-guide, cc-memory, cc-cli-reference, cc-commands, cc-model-config): ≤250 chars each
- [x] 3.5 Rewrite all medium-priority skill descriptions (cc-plugins, cc-channels, cc-scheduled-tasks, cc-headless, cc-sandboxing, cc-common-workflows, cc-best-practices, cc-github-actions): ≤250 chars each
- [x] 3.6 Validate ALL descriptions are ≤250 characters (count each one)

## 4. Differentiate manualSection descriptions

- [x] 4.1 Rewrite `cc-hooks-events` manualSections: unique description for each of cc-hooks-events, cc-hooks-config, cc-hooks-io (≤250 chars each)
- [x] 4.2 Verify the transformer reads manualSection descriptions correctly at `transformer.ts:87-88` (existing logic, no code change expected)

## 5. Update tests

- [x] 5.1 Find all tests that assert `invocation: auto` in frontmatter output and update to assert `disable-model-invocation: true` instead (for non-tutor skills) or absence of the field (for cc-tutor)
- [x] 5.2 Run `npm test` and verify all tests pass

## 6. Regenerate fallback skills and validate

- [x] 6.1 Run `npm run build:skills` to regenerate all 63 fallback SKILL.md files
- [x] 6.2 Spot-check `skills-fallback/cc-tutor/SKILL.md` — verify NO `invocation: auto`, NO `disable-model-invocation`, description ≤250 chars
- [x] 6.3 Spot-check `skills-fallback/cc-hooks-guide/SKILL.md` — verify has `disable-model-invocation: true`, NO `invocation: auto`
- [x] 6.4 Spot-check `skills-fallback/cc-hooks-events/SKILL.md` vs `skills-fallback/cc-hooks-config/SKILL.md` — verify different descriptions
- [x] 6.5 Run `npm run build` to verify TypeScript compiles cleanly

## 7. Validate against official docs

- [x] 7.1 Fetch https://code.claude.com/docs/en/skills.md and confirm: (a) every frontmatter field emitted is in the official list, (b) `disable-model-invocation: true` behavior matches docs ("Only you can invoke. Description not in context"), (c) description ≤250 chars
- [x] 7.2 Fetch https://code.claude.com/docs/en/changelog.md and confirm description 250-char cap from v2.1.86
- [x] 7.3 Install in a test repo with `pulse init && pulse sync --force`, then ask "how do hooks work?" and verify cc-tutor activates
- [x] 7.4 In the test repo, verify other skills are still invocable via `/cc-hooks-guide`, `/cc-mcp`, etc.
