# fallback-skills-bundle

## Purpose

Requirements for offline fallback skill generation (`skills-fallback/`), build integration, and related behavior.

## Requirements

### Requirement: Fallback skills generation script
The system SHALL provide a script at `scripts/generate-fallback-skills.ts` that generates pre-built SKILL.md files in the `skills-fallback/` directory for offline fallback use. The script MUST iterate over all non-static skills in the SKILLS_REGISTRY, fetch their source docs, transform them using the static transformer, apply the splitter if the skill's splitStrategy is not `none`, prepend standard frontmatter, and write the resulting SKILL.md files to `skills-fallback/<skill-id>/SKILL.md`.

#### Scenario: Successful generation of all fallback skills
- **WHEN** the script `scripts/generate-fallback-skills.ts` is executed via `npm run build:skills`
- **THEN** the `skills-fallback/` directory SHALL contain one subdirectory per skill in the SKILLS_REGISTRY (excluding static skills), each with a valid `SKILL.md` file

#### Scenario: Manual-split skills produce multiple fallback directories
- **WHEN** the script processes a skill with `splitStrategy: 'manual'` (e.g., cc-hooks-events with manualSections)
- **THEN** the script SHALL produce one `skills-fallback/<section-id>/SKILL.md` file per manual section defined in the skill's `manualSections` array

#### Scenario: Sections-split skills produce multiple fallback directories
- **WHEN** the script processes a skill with `splitStrategy: 'sections'`
- **THEN** the script SHALL produce one `skills-fallback/<skill-id>-<section-slug>/SKILL.md` file per H2 section found in the source document

### Requirement: Static skills are included in fallback
The system SHALL also write the static skills (cc-tutor, cc-learning-path) into `skills-fallback/` using their fixed content from the package, so that the fallback directory contains the complete set of all skills.

#### Scenario: Static skills present in fallback directory
- **WHEN** the fallback generation script completes
- **THEN** `skills-fallback/cc-tutor/SKILL.md` and `skills-fallback/cc-learning-path/SKILL.md` SHALL exist with their static content and standard frontmatter

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

### Requirement: Build integration
The script MUST be invoked by `npm run build:skills` and as part of the `prepublishOnly` lifecycle script, ensuring fallback skills are always fresh before npm publish.

#### Scenario: prepublishOnly triggers fallback generation
- **WHEN** `npm run prepublishOnly` is executed
- **THEN** the `build:skills` script SHALL run, producing the `skills-fallback/` directory before the package is packed

### Requirement: Error handling during generation
If fetching a doc URL fails after retries, the script MUST log a warning and skip that skill rather than aborting the entire generation process. The script SHALL exit with code 0 if at least one skill was generated, and exit with code 1 only if zero skills could be generated.

#### Scenario: Partial fetch failure
- **WHEN** one source URL is unreachable during generation but others succeed
- **THEN** the script SHALL log a warning for the failed URL, skip that skill, and continue generating the remaining skills
- **THEN** the script SHALL exit with code 0
