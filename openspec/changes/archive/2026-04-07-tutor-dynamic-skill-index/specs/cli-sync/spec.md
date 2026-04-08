## MODIFIED Requirements

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
