## Why

The `SKILLS_REGISTRY` is a hardcoded list of skill definitions in `src/config/skills-registry.ts`. When Anthropic adds new documentation pages to `code.claude.com/docs`, pulse has no way of knowing — a new package version must be published with the new entry manually added. The SDD already specified that `fetcher.ts` should read `https://code.claude.com/docs/llms.txt` to discover available URLs, but this was never implemented. The daily sync hook should detect new docs automatically and install them as skills without requiring a package update.

## What Changes

- Add a `llms.txt` discovery module that fetches `https://code.claude.com/docs/llms.txt`, parses it, and extracts doc URLs
- During `pulse sync`, compare discovered URLs against `SKILLS_REGISTRY` to find new pages not yet registered
- For each new URL discovered, create a dynamic skill definition (id derived from the URL path, reasonable defaults for description, priority, tokenBudget)
- Transform and install discovered skills using the static transformer, same as registry-defined skills
- Persist discovered skills in `.pulse-meta.json` so they survive across syncs without re-discovery
- Update the tutor's dynamic skill index to include discovered skills so Pulse can recommend them
- The `SKILLS_REGISTRY` remains the source of truth for curated skills (with custom descriptions, split strategies, manual sections). Discovered skills supplement it with sensible defaults.

## Capabilities

### New Capabilities
- `llms-txt-discovery`: Fetch and parse `llms.txt` to discover documentation URLs not present in `SKILLS_REGISTRY`. Extract URL, derive skill id and description from the document content. Return a list of discovered `SkillDefinition`-compatible entries.

### Modified Capabilities
- `cli-sync`: Sync process incorporates discovered skills alongside registry skills. Discovered skills are fetched, transformed with static transformer, and installed. Discovery runs only when sync is not `bundledOnly`.
- `skills-registry`: The registry filtering functions accept an optional list of discovered skills to merge with the static registry. Discovered skills use `priority: "discovered"` to distinguish them from curated entries.

## Impact

- **New file** `src/core/discovery.ts`: Fetches `llms.txt`, parses URLs, compares against registry, returns new `SkillDefinition[]`
- **Modified** `src/commands/sync.ts`: After processing registry skills, run discovery and process discovered skills
- **Modified** `src/config/skills-registry.ts`: Add `"discovered"` to priority type, add helper to merge discovered skills
- **Modified** `src/core/meta.ts`: Persist discovered skill definitions in `.pulse-meta.json` under a `discoveredSkills` key
- **Modified** `src/core/skill-index.ts`: Include discovered skills in the dynamic index appended to pulse
- No new npm dependencies — uses existing `undici` for fetch
