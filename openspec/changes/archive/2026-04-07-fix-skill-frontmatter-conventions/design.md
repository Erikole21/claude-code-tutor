## Context

The project generates SKILL.md files with frontmatter that doesn't match Claude Code's official skill specification. Key issues:

1. `invocation: auto` is emitted but is not a recognized Claude Code frontmatter field
2. Descriptions are in Spanish, exceed 250 chars, and some use non-standard `TRIGGER when:` format
3. Split skills inherit the parent's description verbatim
4. 63 skills produce ~8,756 chars of descriptions, exceeding the 8,000-char budget — causing truncation that prevents cc-tutor from activating

**Official reference** (validated against):
- https://code.claude.com/docs/en/skills.md — frontmatter spec, description budget, invocation control
- https://code.claude.com/docs/en/changelog.md — v2.1.86 description 250-char cap

**Key doc excerpts:**
- Valid frontmatter fields: name, description, disable-model-invocation, user-invocable, allowed-tools, model, effort, context, agent, hooks, paths, shell
- `disable-model-invocation: true` → "Only you can invoke the skill. Description not in context"
- Default (no field) → "Description always in context, full skill loads when invoked"
- Budget: "1% of context window, fallback of 8,000 characters"

## Goals / Non-Goals

**Goals:**
- Emit only valid Claude Code frontmatter fields
- Only cc-tutor is auto-activable by Claude (no `disable-model-invocation`); all other skills have `disable-model-invocation: true`
- cc-tutor's description reliably triggers on Claude Code feature questions
- All descriptions ≤250 chars, English, natural language
- Total description budget stays well under 8,000 chars (only cc-tutor contributes)
- Each manualSection has a unique description for `/name` invocation clarity
- Regenerate all fallback skills with corrected frontmatter

**Non-Goals:**
- Changing skill content or transformation pipeline
- Adding other frontmatter fields (paths, allowed-tools, etc.)
- Changing split strategy or section structure
- Modifying hook configuration or greet command

## Decisions

### D1: Remove `invocation: auto` entirely

**Choice:** Delete the `invocation: auto` line from `generateFrontmatter()`.

**Rationale:** Not a recognized Claude Code field. The default behavior (field omitted) is already "both user and Claude can invoke." We'll control auto-activation with `disable-model-invocation` instead.

### D2: Only cc-tutor auto-activable, all others `disable-model-invocation: true`

**Choice:** Add `disable-model-invocation: true` to every skill except cc-tutor.

**Rationale:** Per official docs, `disable-model-invocation: true` means "Description not in context" — the skill is completely removed from the description budget. With only cc-tutor contributing (~170 chars), we're far under the 8,000-char budget. Users can still invoke any skill manually via `/cc-hooks-guide`, `/cc-mcp`, etc. The tutor itself references other `cc-*` skills in its content, so it serves as the discovery gateway.

**Implementation:** Add a `disableModelInvocation?: boolean` field to `SkillDefinition`. Default is `true` (most skills). Only cc-tutor sets it to `false` (or omits it). The transformer reads this field and conditionally emits the frontmatter line.

### D3: Write descriptions in English, natural language, ≤250 chars

**Choice:** All descriptions in English using the official pattern: state what the skill does, then "Use when [scenario]."

**Rationale:** Official example: `"Explains code with visual diagrams and analogies. Use when explaining how code works..."`. English works better for Claude's semantic matching. The 250-char cap (v2.1.86) means front-loading is critical.

**Note:** Even though most skills now have `disable-model-invocation: true` and descriptions aren't in context, good descriptions still matter for the `/skills` listing and for users browsing available skills.

### D4: cc-tutor description strategy

**Choice:** Craft description to explicitly list the top feature keywords:

```
Interactive Claude Code tutor. Use when the user asks about hooks, MCP, skills, settings, permissions, sub-agents, or wants to learn how Claude Code works.
```

(~155 chars — well under 250)

**Rationale:** Since it's the ONLY skill in the description budget, Claude will always see it. By listing key feature names, Claude matches it against "how do hooks work?" or "cómo funcionan los hooks?" because the keyword "hooks" appears directly.

### D5: manualSection descriptions — unique per section

**Choice:** Each `manualSection` gets its own description reflecting its specific content.

**Rationale:** Even with `disable-model-invocation: true`, descriptions appear in the `/skills` listing. Users scanning `/cc-hooks-events` vs `/cc-hooks-config` need to know which to pick.

### D6: Transformer conditionally emits `disable-model-invocation`

**Choice:** `generateFrontmatter()` receives a new `disableModelInvocation` boolean parameter. If `true`, emit `disable-model-invocation: true`. If `false` or undefined, omit the field (default = Claude can invoke).

**Rationale:** This keeps the transformer generic. The registry owns the decision of which skills are auto-activable.

### D7: Two frontmatter generators must be updated

**Discovery:** There are TWO independent frontmatter generators:
1. `src/core/transformer.ts` → `generateFrontmatter()` — used by `pulse sync` at runtime
2. `scripts/generate-fallback-skills.ts` → `frontmatterFor()` — used by `npm run build:skills` at build time

Both emit `invocation: auto` and both need the same changes. Ideally, extract a shared `buildFrontmatter()` utility to avoid future drift between the two.

## Risks / Trade-offs

**[Risk] Users might not discover skills they don't know about** → Mitigation: cc-tutor is always auto-activable and links to all other skills. The greet message also lists available skills. Users can type `/` to browse all skills.

**[Risk] Removing `invocation: auto` + adding `disable-model-invocation: true` is a breaking change for existing installations** → Mitigation: `invocation: auto` was never recognized, so removing it changes nothing. Adding `disable-model-invocation: true` is intentional — next `pulse sync` will regenerate. The tutor was the main entry point anyway.

**[Trade-off] Only one auto-activable skill vs many** → This is the right trade-off per official docs budget constraints. The tutor acts as the single intelligent gateway. If Claude Code increases the budget in the future, we can revisit.
