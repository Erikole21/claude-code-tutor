## MODIFIED Requirements

### Requirement: Fallback skills have valid frontmatter
Each generated fallback SKILL.md MUST include the standard frontmatter block with fields: name, description, _pulse (true), _syncedAt (ISO timestamp of generation time), and _source (the source URL or "static"). Skills with `disableModelInvocation: true` (or unset) MUST also include `disable-model-invocation: true`. The frontmatter SHALL NOT include `invocation: auto` or any other field not recognized by Claude Code's official skill specification.

#### Scenario: Frontmatter fields present
- **WHEN** any fallback SKILL.md file is read
- **THEN** it SHALL contain YAML frontmatter with all required fields: name, description, _pulse, _syncedAt, _source

#### Scenario: No invocation field in fallback
- **WHEN** any fallback SKILL.md file is read
- **THEN** it SHALL NOT contain the field `invocation: auto`

#### Scenario: Most fallback skills have disable-model-invocation
- **WHEN** any fallback SKILL.md file other than cc-tutor is read
- **THEN** it SHALL contain `disable-model-invocation: true`

#### Scenario: cc-tutor fallback omits disable-model-invocation
- **WHEN** the cc-tutor fallback SKILL.md file is read
- **THEN** it SHALL NOT contain `disable-model-invocation`

#### Scenario: Descriptions are unique for split skills
- **WHEN** fallback SKILL.md files generated from manual-split skills are compared
- **THEN** each section's description SHALL be different from the others in the same parent skill
