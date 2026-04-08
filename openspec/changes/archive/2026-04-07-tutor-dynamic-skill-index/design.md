## Context

The cc-tutor skill is currently `static: true` with hardcoded references to other skills scattered throughout its content:
- Line 44: "Hooks: `SessionStart`, `PostToolUse`, `Stop`"
- Line 98: "sugiere `/cc-learning-path`"
- Line 99: "Las skills `cc-hooks-*`, `cc-mcp`, `cc-settings` tienen referencia detallada"

The sync process (`pulse sync`) already iterates over `SKILLS_REGISTRY` to fetch and transform all skills. The tutor is processed as a static skill — its content is read from `src/static-skills/cc-tutor.md` and installed without transformation. There's no mechanism to inject dynamic content into it.

After the `fix-skill-frontmatter-conventions` change, the tutor is the only auto-activable skill and MUST set `disableModelInvocation: false` explicitly. All other skills have `disable-model-invocation: true` (or omit the field, which defaults to disabled) and are invoked manually via `/name`. The tutor needs an up-to-date index of all available skills so it can recommend the right one to the user.

**Current flow for static skills:**
1. `sync.ts` reads bundled fallback content via `loadStaticSkillContent()`
2. Installs directly — no transformation, no injection
3. `generate-fallback-skills.ts` reads `src/static-skills/cc-tutor.md`, prepends frontmatter, writes to `skills-fallback/`

## Goals / Non-Goals

**Goals:**
- At sync time, generate a "Available Skills Reference" section from `SKILLS_REGISTRY` and append it to cc-tutor content
- Each entry shows the skill's `/name` command and a brief description so the tutor can recommend the right skill
- Group skills by topic (hooks, MCP, settings, etc.) for clarity
- Same logic applies at build time (`generate-fallback-skills.ts`) so fallback is consistent
- When new skills are added to the registry, tutor picks them up automatically

**Non-Goals:**
- Changing the tutor's core instructions (personality, behavior, memory, levels)
- Making the tutor dynamic in other ways (e.g., fetching external data)
- Auto-generating the tutor's learning path levels from the registry
- Changing how non-tutor static skills work (cc-learning-path stays fully static)

## Decisions

### D1: Append a generated index section, don't replace the whole file

**Choice:** Keep `cc-tutor.md` as the static base. At sync/build time, generate a markdown section and append it after the static content.

**Rationale:** The tutor's core content (personality, behavior, memory flow, rules) is carefully authored. Only the skill index needs to be dynamic. Appending keeps the two concerns cleanly separated.

**Alternative considered:** Use a placeholder marker (e.g., `<!-- SKILL_INDEX -->`) and replace it. Rejected — simpler to just append. The tutor content already ends with rules, and an appended reference section is natural.

### D2: Generate index from SKILLS_REGISTRY, grouped by priority

**Choice:** Create a utility function `generateSkillIndex(registry: SkillDefinition[]): string` that produces a markdown section like:

```markdown
## Skills disponibles

Puedes recomendar estas skills al usuario según su pregunta:

### Referencia principal
- `/cc-hooks-events` — Hook lifecycle events and when each fires
- `/cc-hooks-guide` — Practical hook examples: notifications, auto-format, protected files
- `/cc-mcp` — MCP server configuration: install, scopes, OAuth, tool search
...

### Configuración y herramientas
- `/cc-settings` — Claude Code settings.json: permissions, hooks, plugins, env vars
- `/cc-permissions` — Permission system: rules, modes, wildcards
...
```

**Rationale:** Grouping by priority (critical → high → medium) maps roughly to topic importance. The tutor sees this as context and can recommend the right skill based on the user's question. The `/name` format tells the tutor exactly how to invoke each skill.

**Alternative considered:** Group by topic tags — rejected because we'd need to add a `tags` field to the registry. Priority grouping is good enough and already available.

### D3: Shared utility used by both sync and fallback generator

**Choice:** Create `src/core/skill-index.ts` with `generateSkillIndex()`. Both `sync.ts` and `generate-fallback-skills.ts` import it.

**Rationale:** Avoids duplicate logic. Same principle as the frontmatter utility from the other change. One source of truth for how the index is formatted.

### D4: Remove hardcoded skill references from cc-tutor.md

**Choice:** Remove the specific skill names from cc-tutor.md lines 98-100 and replace with a general note like "Consulta la sección 'Skills disponibles' al final de este documento."

**Rationale:** The dynamic index replaces the need for hardcoded references. Keeping both would create confusion if they diverge.

**Keep:** The learning topic structure (Beginner/Intermediate/Advanced) stays as-is — those are conceptual categories, not skill references. The mentions of features (hooks, MCP, etc.) in the level descriptions also stay since they describe *what* to learn, not which skill to invoke.

### D5: cc-tutor remains `static: true` in the registry

**Choice:** Don't change the `static` flag. Instead, modify the processing of static skills to support content injection.

**Rationale:** The tutor is still "static" in the sense that its base content comes from a bundled file, not from a fetched URL. The injection is a post-processing step, not a transformation.

**Implementation:** In `sync.ts`, after loading static content for cc-tutor, append the generated index before installing. In `generate-fallback-skills.ts`, same logic before writing the fallback file.

## Risks / Trade-offs

**[Risk] Index grows too large with many skills** → Currently 23 skills × ~80 chars per entry = ~1,840 chars. Well within skill size limits. If registry grows significantly, could add a max entries cap. The 500-line recommendation for SKILL.md gives plenty of room.

**[Risk] Tutor content + index exceeds Claude's context budget** → Tutor content is ~100 lines + ~30 lines of index = ~130 lines. Well under 500. Full skill loads only when invoked, so this is fine.

**[Trade-off] Index in Spanish vs English** → The tutor's content is in Spanish and the descriptions (from `fix-skill-frontmatter-conventions`) are in English. The index section headers will be in Spanish to match the tutor, but skill descriptions stay in English as-is. This is fine — the tutor auto-detects user language anyway.
