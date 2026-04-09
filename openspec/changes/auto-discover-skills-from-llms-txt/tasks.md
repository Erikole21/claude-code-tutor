## Phase 1: Discovery module

- [x] 1.1 Create `src/core/discovery.ts` with `parseLlmsTxt(content: string)` function that parses `- [Title](URL): Description` lines via regex, returns `{ title, url, description }[]`
- [x] 1.2 Add `filterDiscoveredUrls(entries, registry)` that excludes URLs already in `SKILLS_REGISTRY` by `sourceUrl`, and excludes `agent-sdk/*` and `whats-new/*` paths
- [x] 1.3 Add `toSkillDefinition(entry)` that generates a `SkillDefinition` from a parsed entry: id from URL path (`cc-<name>`), description truncated to 250 chars, `priority: 'medium'`, `disableModelInvocation: true`, `splitStrategy: 'none'`, `tokenBudget: 600`
- [x] 1.4 Add `discoverSkills(registry, meta)` main function: fetch `llms.txt` with ETag from meta, parse, filter, generate definitions, return `SkillDefinition[]`. Non-fatal on failure (returns `[]`, logs warning).
- [x] 1.5 Add tests in `tests/discovery.test.ts`: parse valid lines, skip invalid lines, filter registry duplicates, filter excluded paths, id derivation, description truncation, ETag 304 returns empty

## Phase 2: Meta persistence

- [x] 2.1 Add `discoveredSkills: Record<string, DiscoveredSkillEntry>` to meta interface in `src/core/meta.ts`
- [x] 2.2 Add `persistDiscoveredSkills(meta, discovered)` that writes discovered skill defs to `meta.discoveredSkills`, and removes entries whose URL no longer appears in discovered list
- [x] 2.3 Add `loadDiscoveredSkills(meta)` that reads `meta.discoveredSkills` and returns `SkillDefinition[]`

## Phase 3: Registry merge and skill index

- [x] 3.1 Add `mergeWithDiscovered(discovered: SkillDefinition[]): SkillDefinition[]` to `src/config/skills-registry.ts` — concatenates registry + discovered, excludes duplicate ids
- [x] 3.2 Update `generateSkillIndex()` in `src/core/skill-index.ts` to accept optional `discovered: SkillDefinition[]` parameter and append them under a "Additional docs" section
- [x] 3.3 Add tests: merge with no duplicates, merge with duplicate id excluded, skill index includes discovered section, skill index without discovered is unchanged

## Phase 4: Integrate into sync

- [x] 4.1 In `src/commands/sync.ts` `syncCore()`: after processing registry skills, if `!options.bundledOnly`, call `discoverSkills()`, process each discovered skill (fetch with ETag, static transform, install), persist to meta
- [x] 4.2 Update the pulse static skill index generation in sync to pass discovered skills to `generateSkillIndex()`
- [x] 4.3 Wrap discovery step in try/catch — log warning on failure, do not block registry sync

## Phase 5: Build-time discovery

- [x] 5.1 In `scripts/generate-fallback-skills.ts`: after processing registry skills, run `discoverSkills()`, fetch/transform/write fallback files for each discovered skill
- [x] 5.2 Update pulse fallback generation to include discovered skills in the skill index
- [x] 5.3 Verify `npm run build:skills` generates fallbacks for curated + discovered skills (expected: ~90+ total files)

## Phase 6: Verify end-to-end

- [x] 6.1 Run `npm run build:skills` — verify discovered skills appear in `skills-fallback/`
- [x] 6.2 Run `pulse init --force --yes` in test repo — verify all skills (curated + discovered) install instantly from bundle
- [x] 6.3 Run `pulse sync --force` in test repo — verify discovered skills sync with ETag support
- [x] 6.4 Verify `pulse list` shows discovered skills alongside curated ones
