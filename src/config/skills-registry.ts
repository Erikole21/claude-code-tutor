export interface ManualSection {
  id: string
  heading: string
  description: string
}

export interface SkillDefinition {
  id: string
  sourceUrl: string | null
  name: string
  description: string
  disableModelInvocation?: boolean
  splitStrategy?: 'none' | 'sections' | 'manual'
  manualSections?: ManualSection[]
  tokenBudget?: number
  priority: 'critical' | 'high' | 'medium'
  static?: boolean
}

export const SKILLS_REGISTRY: SkillDefinition[] = [

  // ── STATIC SKILLS (tutor and learning path) ──────────────────

  {
    id: 'cc-tutor',
    sourceUrl: null,
    name: 'cc-tutor',
    description: 'Interactive Claude Code tutor. Use when the user asks about hooks, MCP, skills, settings, permissions, sub-agents, or wants to learn how Claude Code works.',
    disableModelInvocation: false,
    splitStrategy: 'none',
    tokenBudget: 900,
    priority: 'critical',
    static: true,
  },
  {
    id: 'cc-learning-path',
    sourceUrl: null,
    name: 'cc-learning-path',
    description: 'Claude Code learning roadmap from beginner to advanced. Use when the user wants a structured study plan, practice sequence, or clear next steps to improve steadily.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 700,
    priority: 'high',
    static: true,
  },

  // ── CRITICAL (from official docs) ────────────────────────────

  {
    id: 'cc-changelog',
    sourceUrl: 'https://code.claude.com/docs/en/changelog.md',
    name: 'cc-changelog',
    description: 'Claude Code changelog and release highlights. Use when the user asks what changed in a version, what is new, or when a feature was introduced.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 800,
    priority: 'critical',
  },
  {
    id: 'cc-hooks-events',
    sourceUrl: 'https://code.claude.com/docs/en/hooks.md',
    name: 'cc-hooks-events',
    description: 'Claude Code hook event reference. Use when the user needs to understand event lifecycles, trigger timing, and what data each hook event provides.',
    disableModelInvocation: true,
    splitStrategy: 'manual',
    manualSections: [
      {
        id: 'cc-hooks-events',
        heading: 'Hook lifecycle',
        description: 'Hook event catalog and lifecycle timing. Use when you need to map each event to when it fires in a session.',
      },
      {
        id: 'cc-hooks-config',
        heading: 'Configuration',
        description: 'Hook configuration in settings. Use when defining matchers, command blocks, and scope-specific hook settings.',
      },
      {
        id: 'cc-hooks-io',
        heading: 'Hook input and output',
        description: 'Hook input and output schemas. Use when validating payload fields, exit codes, and decision control from scripts.',
      },
    ],
    priority: 'critical',
  },
  {
    id: 'cc-hooks-guide',
    sourceUrl: 'https://code.claude.com/docs/en/hooks-guide.md',
    name: 'cc-hooks-guide',
    description: 'Practical hooks implementation guide. Use when building real hook workflows like notifications, formatting, guardrails, context injection, and safe automation.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 700,
    priority: 'critical',
  },
  {
    id: 'cc-mcp',
    sourceUrl: 'https://code.claude.com/docs/en/mcp.md',
    name: 'cc-mcp',
    description: 'MCP setup and operations in Claude Code. Use when configuring servers, scopes, OAuth auth, tool discovery, managed MCP, resources, and prompts.',
    disableModelInvocation: true,
    splitStrategy: 'sections',
    tokenBudget: 700,
    priority: 'critical',
  },
  {
    id: 'cc-settings',
    sourceUrl: 'https://code.claude.com/docs/en/settings.md',
    name: 'cc-settings',
    description: 'Claude Code settings reference. Use when configuring settings.json, scope precedence, permissions, hooks, plugins, sandboxing, and environment behavior.',
    disableModelInvocation: true,
    splitStrategy: 'sections',
    tokenBudget: 700,
    priority: 'critical',
  },
  {
    id: 'cc-permissions',
    sourceUrl: 'https://code.claude.com/docs/en/permissions.md',
    name: 'cc-permissions',
    description: 'Claude Code permissions model. Use when defining allow and deny rules, tool-specific patterns, wildcard matching, and safe approval modes.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'critical',
  },

  // ── HIGH PRIORITY ─────────────────────────────────────────────

  {
    id: 'cc-sub-agents',
    sourceUrl: 'https://code.claude.com/docs/en/sub-agents.md',
    name: 'cc-sub-agents',
    description: 'Sub-agent configuration and usage in Claude Code. Use when creating specialized agents, choosing tools and models, and managing memory and hooks.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 700,
    priority: 'high',
  },
  {
    id: 'cc-agent-teams',
    sourceUrl: 'https://code.claude.com/docs/en/agent-teams.md',
    name: 'cc-agent-teams',
    description: 'Agent teams workflow in Claude Code. Use when coordinating parallel agent sessions, assigning tasks, and managing collaboration and token trade-offs.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'high',
  },
  {
    id: 'cc-skills-guide',
    sourceUrl: 'https://code.claude.com/docs/en/skills.md',
    name: 'cc-skills-guide',
    description: 'Skills authoring guide for Claude Code. Use when defining frontmatter, invocation controls, path-specific behavior, sub-agent skills, and bundled packaging.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'high',
  },
  {
    id: 'cc-memory',
    sourceUrl: 'https://code.claude.com/docs/en/memory.md',
    name: 'cc-memory',
    description: 'Memory management in Claude Code. Use when structuring CLAUDE.md, importing additional memory files, and organizing shared team memory conventions.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'high',
  },
  {
    id: 'cc-cli-reference',
    sourceUrl: 'https://code.claude.com/docs/en/cli-reference.md',
    name: 'cc-cli-reference',
    description: 'Claude Code CLI command reference. Use when looking up commands, flags, system prompt options, and headless execution parameters.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'high',
  },
  {
    id: 'cc-commands',
    sourceUrl: 'https://code.claude.com/docs/en/commands.md',
    name: 'cc-commands',
    description: 'Built-in Claude Code slash commands. Use when you need behavior details, usage patterns, and practical examples for core command workflows.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'high',
  },
  {
    id: 'cc-model-config',
    sourceUrl: 'https://code.claude.com/docs/en/model-config.md',
    name: 'cc-model-config',
    description: 'Model configuration in Claude Code. Use when setting aliases, restricting model selection, tuning context behavior, and controlling model choice via env vars.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'high',
  },

  // ── MEDIUM PRIORITY ────────────────────────────────────────────

  {
    id: 'cc-plugins',
    sourceUrl: 'https://code.claude.com/docs/en/plugins.md',
    name: 'cc-plugins',
    description: 'Claude Code plugin development guide. Use when building plugin structure, bundling skills, integrating LSP or MCP servers, and preparing distribution.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'medium',
  },
  {
    id: 'cc-channels',
    sourceUrl: 'https://code.claude.com/docs/en/channels.md',
    name: 'cc-channels',
    description: 'Channels integration in Claude Code. Use when pushing external events to sessions, wiring webhooks, and delivering CI alerts or runtime notifications.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'medium',
  },
  {
    id: 'cc-scheduled-tasks',
    sourceUrl: 'https://code.claude.com/docs/en/scheduled-tasks.md',
    name: 'cc-scheduled-tasks',
    description: 'Scheduled tasks in Claude Code. Use when creating recurring or one-time automations with /loop, cron syntax, and task lifecycle management.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 400,
    priority: 'medium',
  },
  {
    id: 'cc-headless',
    sourceUrl: 'https://code.claude.com/docs/en/headless.md',
    name: 'cc-headless',
    description: 'Headless mode and Agent SDK usage. Use when running Claude Code programmatically from CLI, Python, or TypeScript with structured output.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'medium',
  },
  {
    id: 'cc-sandboxing',
    sourceUrl: 'https://code.claude.com/docs/en/sandboxing.md',
    name: 'cc-sandboxing',
    description: 'Sandboxing controls in Claude Code. Use when configuring filesystem and network isolation, allowed paths, and security boundaries with permissions.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 400,
    priority: 'medium',
  },
  {
    id: 'cc-common-workflows',
    sourceUrl: 'https://code.claude.com/docs/en/common-workflows.md',
    name: 'cc-common-workflows',
    description: 'Common Claude Code workflows. Use when applying proven patterns for worktrees, git collaboration, plan mode, extended thinking, and piped IO.',
    disableModelInvocation: true,
    splitStrategy: 'sections',
    tokenBudget: 700,
    priority: 'medium',
  },
  {
    id: 'cc-best-practices',
    sourceUrl: 'https://code.claude.com/docs/en/best-practices.md',
    name: 'cc-best-practices',
    description: 'Claude Code best practices. Use when improving prompt context, steering agent behavior, recovering from drift, and avoiding common execution failures.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'medium',
  },
  {
    id: 'cc-github-actions',
    sourceUrl: 'https://code.claude.com/docs/en/github-actions.md',
    name: 'cc-github-actions',
    description: 'Claude Code in GitHub Actions. Use when setting up workflows, handling @claude mentions, and configuring secure integrations with Bedrock or Vertex.',
    disableModelInvocation: true,
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'medium',
  },
]

export function filterByPriority(priorities: string[]): SkillDefinition[] {
  const expanded =
    priorities.length === 1 && priorities[0] === 'all'
      ? (['critical', 'high', 'medium'] as const)
      : priorities
  return SKILLS_REGISTRY.filter((s) => expanded.includes(s.priority))
}
