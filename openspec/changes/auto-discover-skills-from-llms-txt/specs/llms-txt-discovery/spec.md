## ADDED Requirements

### Requirement: Fetch and parse llms.txt
The discovery module SHALL fetch `https://code.claude.com/docs/llms.txt` and parse each line matching the pattern `- [Title](URL): Description`. It SHALL return an array of parsed entries containing `title`, `url`, and `description`.

#### Scenario: Successful parse
- **WHEN** `llms.txt` is fetched and contains lines like `- [Hooks reference](https://code.claude.com/docs/en/hooks.md): Reference for Claude Code hook events...`
- **THEN** each matching line is parsed into `{ title: "Hooks reference", url: "https://code.claude.com/docs/en/hooks.md", description: "Reference for Claude Code hook events..." }`

#### Scenario: Non-matching lines are skipped
- **WHEN** `llms.txt` contains lines that don't match the pattern (headers, blank lines)
- **THEN** those lines are silently skipped

#### Scenario: Fetch failure is non-fatal
- **WHEN** the fetch of `llms.txt` fails (network error, timeout, non-200)
- **THEN** the function SHALL return an empty array and log a warning

### Requirement: ETag caching for llms.txt
The discovery module SHALL use ETag caching for the `llms.txt` URL, stored in `.pulse-meta.json` under `etags`. If the server returns `304 Not Modified`, discovery SHALL be skipped entirely.

#### Scenario: llms.txt unchanged
- **WHEN** `llms.txt` returns HTTP 304
- **THEN** discovery returns an empty array (no new skills to process) with zero overhead

#### Scenario: llms.txt changed
- **WHEN** `llms.txt` returns HTTP 200 with new content
- **THEN** the new ETag is persisted and the content is parsed for discovery

### Requirement: Filter discovered URLs against registry
The discovery module SHALL accept the current `SKILLS_REGISTRY` and filter out any URLs already present as `sourceUrl` in the registry. Only URLs not covered by curated skills are returned as discovered.

#### Scenario: URL already in registry
- **WHEN** `llms.txt` contains `https://code.claude.com/docs/en/hooks.md` and `SKILLS_REGISTRY` has an entry with that `sourceUrl`
- **THEN** that URL is excluded from discovered results

#### Scenario: New URL not in registry
- **WHEN** `llms.txt` contains `https://code.claude.com/docs/en/chrome.md` and no registry entry has that `sourceUrl`
- **THEN** that URL is included in discovered results

### Requirement: Exclude irrelevant paths
The discovery module SHALL exclude URLs matching these path patterns:
- `docs/en/agent-sdk/*` (separate product)
- `docs/en/whats-new/*` (ephemeral weekly digests)

#### Scenario: Agent SDK URL excluded
- **WHEN** `llms.txt` contains `https://code.claude.com/docs/en/agent-sdk/overview.md`
- **THEN** that URL is excluded from discovered results

#### Scenario: Whats new URL excluded
- **WHEN** `llms.txt` contains `https://code.claude.com/docs/en/whats-new/2026-w14.md`
- **THEN** that URL is excluded from discovered results

#### Scenario: Top-level doc URL included
- **WHEN** `llms.txt` contains `https://code.claude.com/docs/en/chrome.md`
- **THEN** that URL is included in discovered results

### Requirement: Generate SkillDefinition from discovered entry
For each discovered URL, the module SHALL generate a `SkillDefinition`-compatible object with:
- `id`: derived from URL path as `cc-<path>` (e.g., `docs/en/foo-bar.md` → `cc-foo-bar`)
- `sourceUrl`: the full URL
- `name`: same as `id`
- `description`: from `llms.txt` entry, truncated to 250 characters
- `disableModelInvocation`: `true`
- `splitStrategy`: `'none'`
- `tokenBudget`: `600`
- `priority`: `'medium'`
- `static`: `false`

#### Scenario: Skill id derivation
- **WHEN** discovered URL is `https://code.claude.com/docs/en/voice-dictation.md`
- **THEN** the generated id SHALL be `cc-voice-dictation`

#### Scenario: Description truncation
- **WHEN** the `llms.txt` description is longer than 250 characters
- **THEN** it SHALL be truncated to 250 characters

#### Scenario: All generated fields present
- **WHEN** a discovered skill definition is generated
- **THEN** it SHALL have all required `SkillDefinition` fields: `id`, `sourceUrl`, `name`, `description`, `priority`, `disableModelInvocation`, `splitStrategy`, `tokenBudget`, `static`

### Requirement: Persist discovered skills in meta
Discovered skill definitions SHALL be persisted in `.pulse-meta.json` under a `discoveredSkills` key (keyed by skill id). On subsequent syncs, previously discovered skills are loaded from meta so they can be processed with ETag caching.

#### Scenario: First discovery persists to meta
- **WHEN** discovery finds 5 new URLs not in the registry
- **THEN** 5 entries are written to `meta.discoveredSkills`

#### Scenario: Subsequent sync loads from meta
- **WHEN** `meta.discoveredSkills` has entries and `llms.txt` returns 304
- **THEN** the previously discovered skills are still available for ETag-based sync

#### Scenario: Removed URL cleans up meta
- **WHEN** a previously discovered URL no longer appears in `llms.txt`
- **THEN** its entry SHALL be removed from `meta.discoveredSkills`

### Requirement: Build-time discovery for fallback generation
The `generate-fallback-skills.ts` script SHALL run discovery at build time, fetch all discovered URLs, transform them with the static transformer, and write fallback files alongside curated skills. This ensures `init` installs all skills from the bundle.

#### Scenario: Build generates discovered fallbacks
- **WHEN** `npm run build:skills` is executed
- **THEN** fallback files are generated for both curated registry skills AND discovered skills from `llms.txt`

#### Scenario: Init installs all bundled skills
- **WHEN** `pulse init` is run after installing the package
- **THEN** all skills (curated + discovered) are installed from the bundle
