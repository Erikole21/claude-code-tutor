## ADDED Requirements

### Requirement: Skill descriptions follow official Claude Code conventions
All skill descriptions in `SKILLS_REGISTRY` SHALL be written in English, use natural language, and be ≤250 characters. Descriptions SHALL front-load the key use case using patterns like "Use when..." as documented in the official Claude Code skills specification (https://code.claude.com/docs/en/skills.md).

#### Scenario: Description length limit
- **WHEN** any `SkillDefinition.description` is measured
- **THEN** it SHALL be at most 250 characters long

#### Scenario: Description language and format
- **WHEN** any `SkillDefinition.description` is read
- **THEN** it SHALL be written in English using natural language (NOT `TRIGGER when:` / `DO NOT TRIGGER when:` format)

### Requirement: cc-tutor is the only auto-activable skill
The `cc-tutor` skill SHALL be the only skill where `disableModelInvocation` is `false` (or omitted). All other skills SHALL have `disableModelInvocation: true`. This ensures cc-tutor's description is the only one consuming Claude Code's skill description budget (~8,000 chars), guaranteeing it is never truncated.

#### Scenario: cc-tutor is auto-activable
- **WHEN** the `cc-tutor` SkillDefinition is read
- **THEN** `disableModelInvocation` SHALL be `false` or undefined

#### Scenario: All other skills disable model invocation
- **WHEN** any SkillDefinition other than `cc-tutor` is read
- **THEN** `disableModelInvocation` SHALL be `true`

#### Scenario: Total description budget
- **WHEN** all auto-activable skills' descriptions are summed
- **THEN** the total SHALL be well under 8,000 characters (only cc-tutor contributes)

### Requirement: cc-tutor description activates on Claude Code feature questions
The `cc-tutor` skill description SHALL explicitly mention key Claude Code features (hooks, MCP, skills, settings, permissions, sub-agents) so that Claude's skill matching loads it when users ask about any of these topics in any language.

#### Scenario: User asks about hooks
- **WHEN** a user asks "how do hooks work?" or "cómo funcionan los hooks?"
- **THEN** Claude SHALL load the cc-tutor skill because the description mentions "hooks"

#### Scenario: Description under limit
- **WHEN** the cc-tutor description is measured
- **THEN** it SHALL be ≤250 characters

### Requirement: manualSection descriptions are unique and specific
Each entry in a skill's `manualSections` array SHALL have a unique `description` field that specifically describes the content of that section, NOT a copy of the parent skill's description.

#### Scenario: Hooks manual sections have distinct descriptions
- **WHEN** the `cc-hooks-events` skill's `manualSections` are read
- **THEN** each section (`cc-hooks-events`, `cc-hooks-config`, `cc-hooks-io`) SHALL have a different description

#### Scenario: Manual section description relevance
- **WHEN** a `manualSection` description is read
- **THEN** it SHALL describe the specific content covered by that section

## MODIFIED Requirements

### Requirement: SkillDefinition interface
The `skills-registry.ts` module SHALL export a `SkillDefinition` interface with fields: `id` (string), `sourceUrl` (string | null, null for static skills), `name` (string), `description` (string, ≤250 chars, English, natural language), `splitStrategy` (`"none"` | `"sections"` | `"manual"`, default `"none"`), `manualSections?` (array of `{id, heading, description}` where each description is unique and ≤250 chars), `tokenBudget` (number, default 600), `priority` (`"critical"` | `"high"` | `"medium"`), `static?` (boolean, true for bundled-only skills), and `disableModelInvocation?` (boolean, default `true` — set to `false` only for cc-tutor).

#### Scenario: Interface completeness
- **WHEN** a SkillDefinition is created
- **THEN** it MUST have at minimum: `id`, `sourceUrl`, `name`, `description`, and `priority`

#### Scenario: disableModelInvocation defaults
- **WHEN** a SkillDefinition does not specify `disableModelInvocation`
- **THEN** the transformer SHALL treat it as `true` (model invocation disabled by default)
