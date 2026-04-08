## MODIFIED Requirements

### Requirement: Tutoring rules
The tutor skill SHALL include rules for tutoring behavior: use concrete examples and real commands, ask follow-up questions after each topic, prioritize solving specific problems before teaching, and consult `cc-changelog` for recent changes. Instead of hardcoded references to specific `cc-*` skills, the tutor SHALL reference the dynamically generated "Skills disponibles" section appended to its content for recommending skills to the user.

#### Scenario: Tutoring rules reference dynamic index
- **WHEN** the skill content is read
- **THEN** it contains a reference to the "Skills disponibles" section (e.g., "Consulta la sección Skills disponibles para recomendar la skill adecuada") instead of hardcoded skill names

#### Scenario: Hardcoded skill references removed
- **WHEN** the static `cc-tutor.md` content is read
- **THEN** it SHALL NOT contain hardcoded references like "las skills `cc-hooks-*`, `cc-mcp`, `cc-settings`" or specific `/cc-learning-path` invocations as the sole way to discover skills
