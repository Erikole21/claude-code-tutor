## ADDED Requirements

### Requirement: Merge discovered skills with registry
The `skills-registry` module SHALL export a function `mergeWithDiscovered(discovered: SkillDefinition[]): SkillDefinition[]` that returns the full `SKILLS_REGISTRY` array concatenated with the discovered skills array. Duplicate ids (where a discovered skill has the same id as a registry skill) SHALL be excluded — registry entries always take precedence.

#### Scenario: No duplicates
- **WHEN** discovered skills contain `cc-chrome` and `cc-voice-dictation` and neither exists in `SKILLS_REGISTRY`
- **THEN** the merged result includes all registry skills plus both discovered skills

#### Scenario: Duplicate id excluded
- **WHEN** a discovered skill has `id: 'cc-permissions'` which already exists in `SKILLS_REGISTRY`
- **THEN** the discovered entry is excluded and the curated registry entry is kept

#### Scenario: Empty discovered list
- **WHEN** the discovered skills array is empty
- **THEN** the merged result equals `SKILLS_REGISTRY` unchanged

### Requirement: Skill index includes discovered skills
The `generateSkillIndex()` function SHALL accept an optional array of discovered skills and include them in the generated index appended to the pulse skill. Discovered skills SHALL appear in a separate section labeled "Additional docs" after the curated skills.

#### Scenario: Index with discovered skills
- **WHEN** `generateSkillIndex` is called with 3 discovered skills
- **THEN** the output includes a section listing those 3 skills after the curated ones

#### Scenario: Index without discovered skills
- **WHEN** `generateSkillIndex` is called without discovered skills
- **THEN** the output only includes curated registry skills (backwards compatible)
