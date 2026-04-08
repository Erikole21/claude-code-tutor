## 1. Create skill index generator utility

- [x] 1.1 Create `src/core/skill-index.ts` with `generateSkillIndex(registry: SkillDefinition[]): string`
- [x] 1.2 Exclude cc-tutor from the index (it's the consumer, not a recommendation)
- [x] 1.3 Group entries by priority: critical → high → medium, with labeled subsections
- [x] 1.4 For skills with `manualSections`, list each section separately with its own `/section-id` and description
- [x] 1.5 For skills with `splitStrategy: "sections"` (no manualSections), list only the parent `/skill-id`
- [x] 1.6 Output format: `## Skills disponibles` heading, brief tutor instruction, then `- \`/skill-id\` — description` per entry

## 2. Update cc-tutor.md static content

- [x] 2.1 Remove hardcoded skill references from `src/static-skills/cc-tutor.md` (lines ~98-100: "sugiere `/cc-learning-path`", "las skills `cc-hooks-*`, `cc-mcp`, `cc-settings`")
- [x] 2.2 Replace with a general reference: "Consulta la sección 'Skills disponibles' al final de este documento para recomendar la skill adecuada según la pregunta del usuario"
- [x] 2.3 Keep the learning tier structure (Beginner/Intermediate/Advanced) and feature mentions intact — only remove specific `/skill-name` invocations used as hardcoded pointers

## 3. Inject index during sync (runtime)

- [x] 3.1 In `src/commands/sync.ts`, modify the static skill handling for cc-tutor: after loading bundled content, append `generateSkillIndex(SKILLS_REGISTRY)` before installing
- [x] 3.2 Ensure non-tutor static skills (cc-learning-path) are NOT modified — index only applies to cc-tutor
- [x] 3.3 Import `generateSkillIndex` and `SKILLS_REGISTRY` in sync.ts

## 4. Inject index during fallback generation (build-time)

- [x] 4.1 In `scripts/generate-fallback-skills.ts`, modify `processStaticSkill()` for cc-tutor: append `generateSkillIndex(SKILLS_REGISTRY)` to the body before writing
- [x] 4.2 Ensure cc-learning-path fallback is NOT modified
- [x] 4.3 Import `generateSkillIndex` and `SKILLS_REGISTRY` in the script

## 5. Tests

- [x] 5.1 Write unit tests for `generateSkillIndex()`: verify output includes all non-tutor skills, grouped by priority, correct `/skill-id` format
- [x] 5.2 Test that manualSection skills produce individual entries
- [x] 5.3 Run `npm test` and verify all tests pass

## 6. Regenerate and validate

- [x] 6.1 Run `npm run build:skills` to regenerate fallback skills
- [x] 6.2 Verify `skills-fallback/cc-tutor/SKILL.md` ends with the dynamic "Skills disponibles" section
- [x] 6.3 Verify the index lists all expected skills with `/name` format
- [x] 6.4 Verify `skills-fallback/cc-learning-path/SKILL.md` does NOT have the index appended
- [x] 6.5 Run `npm run build` to verify TypeScript compiles cleanly
- [x] 6.6 Test in a repo: `pulse init && pulse sync --force`, verify cc-tutor content includes the skill index
