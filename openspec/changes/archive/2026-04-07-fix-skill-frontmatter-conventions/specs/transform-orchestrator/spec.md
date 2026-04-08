## MODIFIED Requirements

### Requirement: Frontmatter generation
The orchestrator SHALL prepend YAML frontmatter to every generated SKILL.md with fields: `name` (skill id), `description` (from registry), `_pulse: true`, `_syncedAt` (ISO timestamp), `_source` (URL or "static"). When the skill's `disableModelInvocation` is `true` (or unset, since default is `true`), the frontmatter SHALL also include `disable-model-invocation: true`. When `disableModelInvocation` is explicitly `false`, the field SHALL be omitted (allowing Claude to auto-invoke). The frontmatter SHALL NOT include `invocation: auto` or any other field not recognized by Claude Code's official skill specification.

#### Scenario: Frontmatter structure
- **WHEN** a skill is transformed
- **THEN** the output starts with `---\n` followed by all required frontmatter fields and ends with `---\n` before the content

#### Scenario: No invocation field
- **WHEN** a skill SKILL.md frontmatter is generated
- **THEN** it SHALL NOT contain the field `invocation: auto`

#### Scenario: disable-model-invocation for most skills
- **WHEN** a skill with `disableModelInvocation: true` (or unset) is transformed
- **THEN** the frontmatter SHALL include `disable-model-invocation: true`

#### Scenario: cc-tutor omits disable-model-invocation
- **WHEN** the cc-tutor skill (with `disableModelInvocation: false`) is transformed
- **THEN** the frontmatter SHALL NOT include `disable-model-invocation`

#### Scenario: Valid fields only
- **WHEN** a skill SKILL.md frontmatter is generated
- **THEN** every field (excluding underscore-prefixed internal fields like `_pulse`, `_syncedAt`, `_source`) SHALL be a field recognized by Claude Code's official skill specification (name, description, disable-model-invocation, user-invocable, allowed-tools, model, effort, context, agent, hooks, paths, shell)
