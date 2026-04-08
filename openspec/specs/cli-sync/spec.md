## ADDED Requirements

### Requirement: Staleness check with --if-stale
`pulse sync` SHALL accept `--if-stale <seconds>` flag. When provided, the command SHALL check if the last sync is older than the specified number of seconds. If not stale, it SHALL exit silently with code 0.

#### Scenario: Not stale with --if-stale
- **WHEN** `--if-stale 86400` is passed and last sync was 1 hour ago
- **THEN** the command exits with code 0 without performing any sync

#### Scenario: Stale with --if-stale
- **WHEN** `--if-stale 86400` is passed and last sync was 25 hours ago
- **THEN** the command proceeds with the sync

#### Scenario: No previous sync with --if-stale
- **WHEN** `--if-stale` is passed and no previous sync exists
- **THEN** the command proceeds with the sync

### Requirement: Force re-download with --force
`pulse sync --force` SHALL ignore all ETag caching and re-download and re-transform all skills.

#### Scenario: Force ignores ETags
- **WHEN** `--force` is passed
- **THEN** all skills are fetched without sending ETags, bypassing 304 responses

### Requirement: Silent mode with --silent
`pulse sync --silent` SHALL suppress all non-error output. This flag is used when the command runs from the SessionStart hook.

#### Scenario: Silent mode suppresses output
- **WHEN** `--silent` is passed
- **THEN** no informational output is written to stdout or stderr (only errors)

### Requirement: Skills filter with --skills
`pulse sync` SHALL accept `--skills <ids...>` to sync only specific skills instead of the full registry.

#### Scenario: Sync specific skills
- **WHEN** `--skills cc-tutor cc-mcp` is passed
- **THEN** only those two skills are processed

### Requirement: Fetch and transform pipeline
For each non-static skill in the registry, `pulse sync` SHALL: fetch the source URL with ETag support, transform the content (Claude CLI with static fallback), apply the split strategy if applicable, and install the resulting SKILL.md file(s).

#### Scenario: Skill with ETag unchanged
- **WHEN** a skill's source returns HTTP 304 (Not Modified)
- **THEN** the skill is skipped without re-processing

#### Scenario: Skill with new content
- **WHEN** a skill's source returns HTTP 200 with new content
- **THEN** the content is transformed, split if applicable, and installed

### Requirement: Static skills handling
Skills with `static: true` in the registry SHALL be installed from their bundled content without fetching or transforming. They SHALL be processed during every sync. For the `cc-tutor` skill specifically, the sync process SHALL append the dynamically generated skill index (from `generateSkillIndex()`) to the static content before installing.

#### Scenario: Static skill installation (non-tutor)
- **WHEN** sync encounters a static skill other than cc-tutor (e.g., cc-learning-path)
- **THEN** it installs the skill from bundled content without modification

#### Scenario: cc-tutor gets dynamic index appended
- **WHEN** sync encounters the cc-tutor static skill
- **THEN** it loads the bundled content, appends the output of `generateSkillIndex(SKILLS_REGISTRY)`, and installs the combined content

#### Scenario: Fallback generation also appends index
- **WHEN** `scripts/generate-fallback-skills.ts` processes the cc-tutor skill
- **THEN** it appends the same `generateSkillIndex()` output to the static content before writing the fallback file

### Requirement: Meta update after sync
After all skills are processed, `pulse sync` SHALL update `.pulse-meta.json` with the sync timestamp, status (success/partial/failed), per-skill sync info, and updated ETags.

#### Scenario: Successful sync updates meta
- **WHEN** all skills sync successfully
- **THEN** meta is updated with `lastSyncStatus: "success"` and current timestamp

#### Scenario: Partial sync updates meta
- **WHEN** some skills fail while others succeed
- **THEN** meta is updated with `lastSyncStatus: "partial"` and error details

### Requirement: Change table output
When not in silent mode, `pulse sync` SHALL display a table of changes showing which skills were updated, skipped (304), or failed.

#### Scenario: Change table displayed
- **WHEN** sync completes and `--silent` is not set
- **THEN** a table is displayed with skill ID, action taken (updated/skipped/failed), and transformer used
