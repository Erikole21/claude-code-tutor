## Purpose

Provides a utility to dynamically generate a skill index for the cc-tutor skill, listing all available skills from the registry grouped by priority.

## Requirements

### Requirement: Skill index generator utility
The system SHALL provide a utility function `generateSkillIndex(registry: SkillDefinition[]): string` in `src/core/skill-index.ts` that generates a markdown section listing all available skills from the registry. Each entry SHALL include the skill's `/name` invoke command and its description. Skills SHALL be grouped by priority (critical, high, medium).

#### Scenario: Index includes all registry skills
- **WHEN** `generateSkillIndex()` is called with the full `SKILLS_REGISTRY`
- **THEN** the output contains one entry per skill (excluding cc-tutor itself) with `/skill-id` and description

#### Scenario: Skills are grouped by priority
- **WHEN** the generated index is read
- **THEN** critical-priority skills appear first, then high, then medium, each under a labeled subsection

#### Scenario: Manual-split skills list each section
- **WHEN** a skill has `manualSections` (e.g., cc-hooks-events with 3 sections)
- **THEN** the index lists each section separately with its own `/section-id` and section-specific description

#### Scenario: Section-split skills list the parent only
- **WHEN** a skill has `splitStrategy: "sections"` without `manualSections`
- **THEN** the index lists only the parent `/skill-id` (not each generated sub-skill, since section IDs are dynamic)

### Requirement: Index output format
The generated index SHALL be valid markdown with a level-2 heading (`## Skills disponibles`) followed by a brief instruction for the tutor, then grouped skill lists. Each entry SHALL be a bullet with the format: `- \`/skill-id\` — description`.

#### Scenario: Markdown structure
- **WHEN** the generated index is rendered
- **THEN** it starts with `## Skills disponibles`, followed by group headings and bullet-list entries

#### Scenario: Entry format
- **WHEN** any entry in the index is read
- **THEN** it matches the pattern `- \`/skill-id\` — description text`
