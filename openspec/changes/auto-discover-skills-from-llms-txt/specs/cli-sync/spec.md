## MODIFIED Requirements

### Requirement: Fetch and transform pipeline
For each non-static skill in the registry, `pulse sync` SHALL: fetch the source URL with ETag support, transform the content with the static transformer, apply the split strategy if applicable, and install the resulting SKILL.md file(s). Additionally, after processing registry skills, sync SHALL run discovery to find and process skills not in the registry.

#### Scenario: Skill with ETag unchanged
- **WHEN** a skill's source returns HTTP 304 (Not Modified)
- **THEN** the skill is skipped without re-processing

#### Scenario: Skill with new content
- **WHEN** a skill's source returns HTTP 200 with new content
- **THEN** the content is transformed with the static transformer, split if applicable, and installed

#### Scenario: Discovered skills processed after registry
- **WHEN** sync completes processing registry skills
- **THEN** it SHALL run discovery, fetch/transform/install any new discovered skills, and persist them in meta

#### Scenario: Discovered skills use ETag caching
- **WHEN** a previously discovered skill's source returns HTTP 304
- **THEN** the skill is skipped without re-processing

#### Scenario: Discovery failure does not block sync
- **WHEN** the discovery step fails (network error, parse error)
- **THEN** registry skills are still synced successfully and a warning is logged

### Requirement: Static skills handling
Skills with `static: true` in the registry SHALL be installed from their bundled content without fetching or transforming. They SHALL be processed during every sync. For the `pulse` skill specifically, the sync process SHALL append the dynamically generated skill index (from `generateSkillIndex()`) to the static content before installing. The skill index SHALL include both curated and discovered skills.

#### Scenario: Static skill installation (non-tutor)
- **WHEN** sync encounters a static skill other than pulse (e.g., cc-learning-path)
- **THEN** it installs the skill from bundled content without modification

#### Scenario: pulse gets dynamic index with discovered skills
- **WHEN** sync encounters the pulse static skill
- **THEN** it loads the bundled content, appends the output of `generateSkillIndex()` which includes discovered skills, and installs the combined content

## ADDED Requirements

### Requirement: Bundled-only mode skips discovery
When sync runs with `bundledOnly: true` (used by `init`), it SHALL skip the discovery step and install only from bundled fallbacks.

#### Scenario: Init does not run discovery
- **WHEN** `syncCore` is called with `bundledOnly: true`
- **THEN** discovery is not executed and no network requests are made for `llms.txt`
