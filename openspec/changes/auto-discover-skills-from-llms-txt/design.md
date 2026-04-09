## Context

The `SKILLS_REGISTRY` in `src/config/skills-registry.ts` is a static array of 23 curated skill definitions. Each has a handcrafted `description`, `splitStrategy`, `tokenBudget`, and `priority`. When Anthropic adds new doc pages (currently 98 URLs in `llms.txt`), they are invisible to pulse until someone manually adds them to the registry and publishes a new version.

The SDD originally specified that `fetcher.ts` should read `llms.txt` to verify available URLs — this was never implemented. The daily sync hook (`pulse sync --if-stale 86400`) already runs every session and fetches docs with ETag caching.

Current `llms.txt` format (stable, markdown list):
```
- [Title](https://code.claude.com/docs/en/<path>.md): Description text
```

Each entry has: a human-readable title, a full URL, and a description — enough to generate a `SkillDefinition` without AI assistance.

## Goals / Non-Goals

**Goals:**
- Automatically discover new doc pages from `llms.txt` during `pulse sync`
- Generate skill definitions from discovered URLs with sensible defaults
- Install discovered skills using the static transformer (fast, no API calls)
- Persist discovered skills so they don't re-download on every sync
- Include discovered skills in the tutor's dynamic skill index
- Filter out URLs already covered by `SKILLS_REGISTRY` (avoid duplicates)
- Filter out URLs not relevant to Claude Code usage (e.g., agent-sdk/*, legal, data-usage)

**Non-Goals:**
- Replacing `SKILLS_REGISTRY` — curated skills keep their custom configs (split strategies, manual sections, etc.)
- Using Claude CLI for transformation — static transformer only
- Auto-detecting split strategies for discovered skills — all use `splitStrategy: 'none'`
- Discovering skills during `init` — only during `sync` (init uses bundled-only)

## Decisions

### 1. Parse `llms.txt` with regex, not a markdown parser

The format is a simple markdown list with a consistent pattern. A regex like `/- \[(.+?)\]\((.+?)\): (.+)/` extracts title, URL, and description from each line. No need for `unified`/`remark` — it adds complexity for no benefit.

**Alternative**: Use remark to parse the markdown AST. Rejected: overkill for a flat list.

### 2. Filter discovered URLs by path prefix

Not all docs are relevant for pulse skills. Apply inclusion/exclusion filters:

- **Include**: `docs/en/*.md` (top-level Claude Code docs)
- **Exclude**: `docs/en/agent-sdk/*` (separate product), `docs/en/whats-new/*` (ephemeral weekly digests)
- **Exclude by id**: URLs already in `SKILLS_REGISTRY` (by matching `sourceUrl`)

This keeps discovered skills focused on Claude Code features the user interacts with.

**Alternative**: Include everything. Rejected: agent-sdk docs are for a different audience, and whats-new digests are ephemeral and low value as skills.

### 3. Derive skill id from URL path

From `https://code.claude.com/docs/en/foo-bar.md` → `cc-foo-bar`.

Prefix with `cc-` to match existing convention. Strip `.md`, replace non-alphanumeric with `-`.

### 4. Derive description from `llms.txt` entry

Each `llms.txt` entry already has a description: `- [Title](URL): <description>`. Truncate to 250 chars to match the `SkillDefinition` spec.

### 5. Persist discovered skills in `.pulse-meta.json`

Add a `discoveredSkills` key to the meta file:

```json
{
  "discoveredSkills": {
    "cc-foo-bar": {
      "id": "cc-foo-bar",
      "sourceUrl": "https://code.claude.com/docs/en/foo-bar.md",
      "name": "cc-foo-bar",
      "description": "...",
      "discoveredAt": "2026-04-08T...",
      "fromLlmsTxt": true
    }
  }
}
```

On subsequent syncs, discovered skills are loaded from meta and treated like registry skills (with ETag caching). If a URL disappears from `llms.txt`, the discovered skill is removed on next sync.

### 6. Discovery runs at build time AND during sync

- **`build:skills`** (at publish time): Runs discovery against `llms.txt`, generates fallback files for all discovered skills alongside curated ones. These are bundled in the npm package.
- **`init`**: Installs all bundled fallbacks (curated + discovered) instantly via `bundledOnly`. The user gets every skill from day one.
- **`sync`** (daily hook): Re-runs discovery to detect docs added since the last publish. New URLs found at sync time are fetched, transformed with static, and installed. URLs already covered by bundled fallbacks just use ETag caching.

This ensures: instant init with full coverage, and daily freshness for anything new.

### 7. All discovered skills use `priority: 'medium'` and `disableModelInvocation: true`

Discovered skills are supplementary reference material. They don't auto-activate (only pulse does). Priority `medium` ensures they're included when config is set to `"all"` but excluded from the default `["critical", "high"]` filter.

**Alternative**: New priority `"discovered"`. Rejected: adds type complexity. `medium` is sufficient — if a discovered skill proves important, it gets promoted to the curated registry.

### 8. Discovery is ETag-aware for `llms.txt` itself

Cache the ETag for `llms.txt` URL in meta. If unchanged (`304`), skip the discovery step entirely — zero overhead on most syncs.

## Risks / Trade-offs

- **[Risk] `llms.txt` format changes** → Mitigation: The regex parser is simple. If it returns 0 results, log a warning and skip discovery. Curated registry skills are unaffected.
- **[Risk] Too many discovered skills bloat context** → Mitigation: All discovered skills have `disableModelInvocation: true`, so their descriptions don't consume Claude's skill budget. Only loaded when explicitly invoked.
- **[Risk] Discovered skill descriptions are generic** → Mitigation: They come directly from `llms.txt` which has Anthropic-written descriptions. Quality is decent. For important skills, promote to curated registry.
- **[Risk] Network failure during discovery** → Mitigation: Discovery failure is non-fatal. Log warning, continue with registry skills only. Previously discovered skills remain in meta.
