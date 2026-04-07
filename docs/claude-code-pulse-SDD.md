# SDD: claude-code-pulse-tutor

## Objetivo
Construir un paquete npm en TypeScript llamado `claude-code-pulse-tutor` (CLI: `pulse`) que:
1. Descarga la documentación oficial de Claude Code desde `code.claude.com/docs` y la transforma en Skills optimizadas instaladas en `.claude/skills/` del proyecto
2. Mantiene las skills sincronizadas automáticamente una vez al día via hook `SessionStart`
3. Incluye un sistema de tutoría interactivo que guía a usuarios nuevos y responde preguntas sobre Claude Code en cualquier idioma

> **Tagline**: Keep Claude Code alive. Fresh docs, built-in tutor, always in sync.

---

## Stack técnico
- **Runtime**: Node.js 18+
- **Lenguaje**: TypeScript con `tsx` para ejecución directa
- **CLI**: `commander`
- **HTTP**: `undici` (nativo Node 18, sin dependencias extra)
- **Markdown parsing**: `unified` + `remark-parse` + `remark-stringify`
- **Config**: `cosmiconfig` para leer `.pulserc.json`
- **Testing**: `vitest`
- **Build**: `tsup`

---

## Estructura de directorios

```
claude-code-pulse-tutor/
├── src/
│   ├── cli.ts
│   ├── commands/
│   │   ├── init.ts
│   │   ├── sync.ts
│   │   ├── greet.ts
│   │   ├── list.ts
│   │   ├── status.ts
│   │   └── uninstall.ts
│   ├── core/
│   │   ├── fetcher.ts
│   │   ├── transformer.ts
│   │   ├── transformer-claude.ts
│   │   ├── transformer-static.ts
│   │   ├── splitter.ts
│   │   ├── installer.ts
│   │   ├── hook-manager.ts
│   │   └── meta.ts
│   ├── config/
│   │   └── skills-registry.ts
│   └── utils/
│       ├── platform.ts
│       └── logger.ts
├── skills-fallback/
│   ├── cc-hooks-events/SKILL.md
│   ├── cc-hooks-config/SKILL.md
│   ├── cc-hooks-io/SKILL.md
│   ├── cc-tutor/SKILL.md
│   ├── cc-learning-path/SKILL.md
│   └── ... (todas las skills)
├── tests/
│   ├── transformer.test.ts
│   ├── hook-manager.test.ts
│   ├── splitter.test.ts
│   └── platform.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

---

## Módulo: `skills-registry.ts`

```typescript
export interface SkillDefinition {
  id: string
  sourceUrl: string | null       // null para skills estáticas
  name: string
  description: string
  splitStrategy?: 'none' | 'sections' | 'manual'
  manualSections?: {
    id: string
    heading: string
    description: string
  }[]
  tokenBudget?: number           // default: 600
  priority: 'critical' | 'high' | 'medium'
  static?: boolean               // true = contenido fijo, no se fetchea
}

export const SKILLS_REGISTRY: SkillDefinition[] = [

  // ── SKILLS ESTÁTICAS (tutor y learning path) ──────────────────

  {
    id: 'cc-tutor',
    sourceUrl: null,
    name: 'cc-tutor',
    description:
      'Tutor interactivo de Claude Code. Úsame cuando el usuario parezca ' +
      'ser nuevo en Claude Code, pregunte cómo empezar, qué puede hacer, ' +
      'cómo funciona, o pida que lo guíes o enseñes. También respondo sobre ' +
      'hooks, MCP, sub-agents y features avanzadas. Detecto el idioma del ' +
      'usuario automáticamente y me adapto.',
    splitStrategy: 'none',
    tokenBudget: 900,
    priority: 'critical',
    static: true
  },
  {
    id: 'cc-learning-path',
    sourceUrl: null,
    name: 'cc-learning-path',
    description:
      'Ruta de aprendizaje estructurada de Claude Code por niveles: ' +
      'beginner, intermediate y advanced. Úsame cuando el usuario quiera ' +
      'ver el currículo completo, saber qué aprender después, o pida un ' +
      'plan de estudio. Invócame con /cc-learning-path.',
    splitStrategy: 'none',
    tokenBudget: 700,
    priority: 'high',
    static: true
  },

  // ── CRÍTICAS (desde docs oficiales) ───────────────────────────

  {
    id: 'cc-changelog',
    sourceUrl: 'https://code.claude.com/docs/en/changelog.md',
    name: 'cc-changelog',
    description:
      'Changelog y novedades recientes de Claude Code. Úsame cuando ' +
      'pregunten qué hay de nuevo, qué cambió en una versión, o qué ' +
      'features se agregaron recientemente.',
    splitStrategy: 'none',
    tokenBudget: 800,
    priority: 'critical'
  },
  {
    id: 'cc-hooks-events',
    sourceUrl: 'https://code.claude.com/docs/en/hooks.md',
    name: 'cc-hooks-events',
    description:
      'Tabla de todos los hook events de Claude Code: SessionStart, ' +
      'PreToolUse, PostToolUse, Stop, Notification, ConfigChange, ' +
      'FileChanged, CwdChanged, WorktreeCreate, Elicitation y más. ' +
      'Cuándo se dispara cada uno.',
    splitStrategy: 'manual',
    manualSections: [
      {
        id: 'cc-hooks-events',
        heading: 'Hook lifecycle',
        description: 'Tabla de eventos y cuándo se disparan'
      },
      {
        id: 'cc-hooks-config',
        heading: 'Configuration',
        description: 'Configuración de hooks en settings.json, matchers, campos'
      },
      {
        id: 'cc-hooks-io',
        heading: 'Hook input and output',
        description: 'Esquemas JSON de input/output, exit codes, decisiones'
      }
    ],
    priority: 'critical'
  },
  {
    id: 'cc-hooks-guide',
    sourceUrl: 'https://code.claude.com/docs/en/hooks-guide.md',
    name: 'cc-hooks-guide',
    description:
      'Guía práctica de hooks con ejemplos: notificaciones, auto-format, ' +
      'bloquear archivos, re-inyectar contexto, auto-approve.',
    splitStrategy: 'none',
    tokenBudget: 700,
    priority: 'critical'
  },
  {
    id: 'cc-mcp',
    sourceUrl: 'https://code.claude.com/docs/en/mcp.md',
    name: 'cc-mcp',
    description:
      'Configuración de MCP servers en Claude Code: instalar, scopes ' +
      '(local/project/user), autenticación OAuth, tool search, ' +
      'managed MCP, recursos y prompts MCP.',
    splitStrategy: 'sections',
    tokenBudget: 700,
    priority: 'critical'
  },
  {
    id: 'cc-settings',
    sourceUrl: 'https://code.claude.com/docs/en/settings.md',
    name: 'cc-settings',
    description:
      'Todas las opciones de configuración de Claude Code en settings.json: ' +
      'permisos, hooks, plugins, sandbox, env vars, precedencia de scopes.',
    splitStrategy: 'sections',
    tokenBudget: 700,
    priority: 'critical'
  },
  {
    id: 'cc-permissions',
    sourceUrl: 'https://code.claude.com/docs/en/permissions.md',
    name: 'cc-permissions',
    description:
      'Sistema de permisos de Claude Code: sintaxis de reglas, modos ' +
      '(auto, plan, bypassPermissions), tool-specific rules, wildcards.',
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'critical'
  },

  // ── ALTA PRIORIDAD ─────────────────────────────────────────────

  {
    id: 'cc-sub-agents',
    sourceUrl: 'https://code.claude.com/docs/en/sub-agents.md',
    name: 'cc-sub-agents',
    description:
      'Configuración de sub-agents en Claude Code: frontmatter fields, ' +
      'modelos, tools disponibles, persistent memory, hooks en subagents.',
    splitStrategy: 'none',
    tokenBudget: 700,
    priority: 'high'
  },
  {
    id: 'cc-agent-teams',
    sourceUrl: 'https://code.claude.com/docs/en/agent-teams.md',
    name: 'cc-agent-teams',
    description:
      'Agent teams en Claude Code: coordinar múltiples sesiones, ' +
      'asignar tareas, hablar con teammates, display modes, token costs.',
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'high'
  },
  {
    id: 'cc-skills-guide',
    sourceUrl: 'https://code.claude.com/docs/en/skills.md',
    name: 'cc-skills-guide',
    description:
      'Cómo crear y configurar Skills en Claude Code: frontmatter, ' +
      'invocation control, subagent skills, path-specific, bundled skills.',
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'high'
  },
  {
    id: 'cc-memory',
    sourceUrl: 'https://code.claude.com/docs/en/memory.md',
    name: 'cc-memory',
    description:
      'CLAUDE.md y auto-memory en Claude Code: dónde poner archivos, ' +
      'import de archivos adicionales, rules directory, gestión para equipos.',
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'high'
  },
  {
    id: 'cc-cli-reference',
    sourceUrl: 'https://code.claude.com/docs/en/cli-reference.md',
    name: 'cc-cli-reference',
    description:
      'Referencia completa CLI de Claude Code: flags, comandos, ' +
      'system prompt flags, opciones de headless.',
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'high'
  },
  {
    id: 'cc-commands',
    sourceUrl: 'https://code.claude.com/docs/en/commands.md',
    name: 'cc-commands',
    description:
      'Comandos built-in de Claude Code: /batch, /debug, /loop, ' +
      '/simplify, /claude-api, /compact, /memory y más.',
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'high'
  },
  {
    id: 'cc-model-config',
    sourceUrl: 'https://code.claude.com/docs/en/model-config.md',
    name: 'cc-model-config',
    description:
      'Configuración de modelos en Claude Code: aliases (opusplan, fast-mode), ' +
      'restrict model selection, extended context, env vars para pinning.',
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'high'
  },

  // ── MEDIA PRIORIDAD ────────────────────────────────────────────

  {
    id: 'cc-plugins',
    sourceUrl: 'https://code.claude.com/docs/en/plugins.md',
    name: 'cc-plugins',
    description:
      'Crear plugins para Claude Code: estructura, skills, LSP servers, ' +
      'MCP servers incluidos, distribución en marketplaces.',
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'medium'
  },
  {
    id: 'cc-channels',
    sourceUrl: 'https://code.claude.com/docs/en/channels.md',
    name: 'cc-channels',
    description:
      'Channels en Claude Code: push events a sesiones activas, ' +
      'webhooks, alertas de CI, chat messages desde MCP server.',
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'medium'
  },
  {
    id: 'cc-scheduled-tasks',
    sourceUrl: 'https://code.claude.com/docs/en/scheduled-tasks.md',
    name: 'cc-scheduled-tasks',
    description:
      'Tareas programadas en Claude Code: /loop, cron syntax, ' +
      'one-time reminders, gestión de tasks recurrentes.',
    splitStrategy: 'none',
    tokenBudget: 400,
    priority: 'medium'
  },
  {
    id: 'cc-headless',
    sourceUrl: 'https://code.claude.com/docs/en/headless.md',
    name: 'cc-headless',
    description:
      'Modo headless y Agent SDK de Claude Code: uso programático ' +
      'desde CLI, Python y TypeScript, output estructurado, bare mode.',
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'medium'
  },
  {
    id: 'cc-sandboxing',
    sourceUrl: 'https://code.claude.com/docs/en/sandboxing.md',
    name: 'cc-sandboxing',
    description:
      'Sandboxing en Claude Code: filesystem isolation, network isolation, ' +
      'cómo habilitar, configurar paths permitidos, relación con permisos.',
    splitStrategy: 'none',
    tokenBudget: 400,
    priority: 'medium'
  },
  {
    id: 'cc-common-workflows',
    sourceUrl: 'https://code.claude.com/docs/en/common-workflows.md',
    name: 'cc-common-workflows',
    description:
      'Flujos de trabajo comunes en Claude Code: worktrees paralelos, ' +
      'git workflows, plan mode, extended thinking, pipe input/output.',
    splitStrategy: 'sections',
    tokenBudget: 700,
    priority: 'medium'
  },
  {
    id: 'cc-best-practices',
    sourceUrl: 'https://code.claude.com/docs/en/best-practices.md',
    name: 'cc-best-practices',
    description:
      'Best practices de Claude Code: dar contexto efectivo, gestionar ' +
      'contexto, course-correct, evitar patrones de fallo comunes.',
    splitStrategy: 'none',
    tokenBudget: 600,
    priority: 'medium'
  },
  {
    id: 'cc-github-actions',
    sourceUrl: 'https://code.claude.com/docs/en/github-actions.md',
    name: 'cc-github-actions',
    description:
      'Claude Code en GitHub Actions: setup, @claude mentions, ' +
      'configuración con Bedrock y Vertex, security considerations.',
    splitStrategy: 'none',
    tokenBudget: 500,
    priority: 'medium'
  }
]
```

---

## Módulo: `fetcher.ts`

```typescript
// Responsabilidades:
// 1. Leer https://code.claude.com/docs/llms.txt para verificar URLs disponibles
// 2. Descargar cada .md con soporte de ETag caching
// 3. Retornar { content, changed, etag }

interface FetchResult {
  url: string
  content: string
  changed: boolean       // false si ETag indica sin cambios (HTTP 304)
  etag?: string
  fetchedAt: string
}

// ETags se persisten en .pulse-meta.json bajo "etags": { [url]: string }
// Si el server retorna 304 Not Modified → changed: false, content: ''
// Timeout: 10s por request
// Retry: 2 intentos con backoff exponencial
// Concurrencia: máximo 4 requests simultáneos (p-limit)
```

---

## Módulo: `transformer-claude.ts`

Usa el CLI `claude` ya autenticado con la cuenta del usuario. No requiere API key separada.

```typescript
// Verificación: ejecutar `claude --version` antes de intentar
// Si falla o no está en PATH → retorna null → orchestrator usa static fallback

// Llamada:
// echo "<PROMPT>" | claude --print --model claude-haiku-4-5-20251001 --max-tokens <tokenBudget>

const TRANSFORM_PROMPT = `
Transforma esta documentación de Claude Code en un SKILL.md conciso.

REGLAS:
- Máximo ${tokenBudget} tokens en el output
- Mantén TODOS los ejemplos de código exactamente como están
- Mantén TODAS las tablas de referencia (hook events, flags, opciones)
- Convierte prosa larga en bullet points concisos
- Elimina: navegación, breadcrumbs, notas "see also", links internos
- Conserva: sintaxis, parámetros, valores válidos, edge cases
- Idioma del output: inglés (igual que el input)
- Empieza directamente con el contenido, sin frontmatter

DOCUMENTO:
${rawMarkdown}
`

// Timeout: 30s por skill
// Si falla → lanza error → orchestrator usa static fallback
```

---

## Módulo: `transformer-static.ts`

Fallback cuando `claude` CLI no está disponible o falla.

```typescript
// Estrategia con remark:
// 1. Parsear con remark-parse
// 2. Eliminar: JSX components (<Note>, <Tip>, <Steps>), imágenes, links internos
// 3. Conservar: H1, H2, H3, tablas, code blocks, listas
// 4. Truncar si supera tokenBudget (aprox: chars / 4)
// 5. Retornar markdown limpio

// Para splitStrategy 'sections': dividir por H2
// Para splitStrategy 'manual': usar los headings de manualSections
```

---

## Módulo: `transformer.ts` (orchestrator)

```typescript
interface TransformedSkill {
  id: string
  filename: string       // .claude/skills/cc-hooks-events/SKILL.md
  content: string        // SKILL.md completo con frontmatter
  transformedWith: 'claude' | 'static' | 'fixed'
}

export async function transformSkill(
  def: SkillDefinition,
  rawContent: string
): Promise<TransformedSkill[]> {
  // 1. Si static: true → usar contenido fijo del registry (sin fetch ni transform)
  // 2. Intentar claude CLI transformer
  // 3. Si falla → static transformer
  // 4. Aplicar splitter si splitStrategy !== 'none'
  // 5. Anteponer frontmatter a cada skill resultante
}

// Frontmatter estándar para todas las skills:
// ---
// name: <id>
// description: <description del registry>
// invocation: auto
// _pulse: true
// _syncedAt: <ISO>
// _source: <URL o "static">
// ---
```

---

## Módulo: `installer.ts`

```typescript
// Scope: siempre project-level → .claude/skills/ relativo al cwd

// install(skills): Crea dirs, escribe SKILL.md, actualiza .pulse-meta.json
// isManaged(skillDir): Verifica _pulse: true en el frontmatter
// getInstalledSkills(): Lee .pulse-meta.json

// NUNCA toca skills sin _pulse: true en el frontmatter
```

---

## Módulo: `hook-manager.ts`

Merge inteligente del hook `SessionStart` en `.claude/settings.json`.

```typescript
// addHook():
//   1. Leer .claude/settings.json (crear si no existe)
//   2. Verificar si ya existe entry con "_pulse": true → skip
//   3. Agregar al array sin tocar los hooks existentes:
//
//   {
//     "hooks": {
//       "SessionStart": [
//         // ...hooks existentes del usuario intactos...
//         {
//           "_pulse": true,
//           "command": "<comando según plataforma>"
//         }
//       ]
//     }
//   }
//
// removeHook():
//   → Filtrar el entry con "_pulse": true
//   → Si SessionStart queda vacío, eliminar la key

// El comando se genera por platform.ts según OS detectado
```

---

## Módulo: `platform.ts`

```typescript
export function getHookCommand(): string {
  // Windows nativo (no WSL):
  //   "npx.cmd pulse sync --if-stale 86400 --silent & npx.cmd pulse greet --once"
  // Unix / WSL:
  //   "npx pulse sync --if-stale 86400 --silent && npx pulse greet --once || true"
}

export async function isClaudeCliAvailable(): Promise<boolean> {
  // Intentar `claude --version` con timeout 5s
  // Windows: buscar `claude` y `claude.cmd`
}

// Detectar WSL: fs.existsSync('/proc/version') && content.includes('microsoft')
// WSL se trata siempre como Unix
```

---

## Módulo: `meta.ts`

```typescript
// Archivo: .claude/skills/.pulse-meta.json

interface PulseMeta {
  version: string
  lastSync: string
  lastSyncStatus: 'success' | 'partial' | 'failed'
  lastSyncError?: string
  firstSessionDone: boolean    // false al init, true después del primer greet
  skills: {
    [skillId: string]: {
      syncedAt: string
      transformedWith: 'claude' | 'static' | 'fixed'
      etag?: string
    }
  }
  etags: {
    [url: string]: string
  }
}

// isStale(maxAgeSeconds): boolean → compara lastSync con Date.now()
// ccss init escribe firstSessionDone: false
```

---

## Comandos CLI

### `pulse init`

```
pulse init [--force] [--yes] [--skills <ids...>]

1. Verificar si ya inicializado → mostrar estado y salir (salvo --force)
2. Verificar/crear directorio .claude/
3. Mostrar skills a instalar con prioridades
4. Pedir confirmación (skip con --yes)
5. Ejecutar sync completo
6. Inyectar hook via hook-manager
7. Escribir .pulse-meta.json con firstSessionDone: false
8. Mostrar resumen: X skills instaladas, hook agregado, próximo sync en 24h
9. Sugerir commitear .claude/skills/cc-* para compartir con el equipo
```

### `pulse sync`

```
pulse sync [--force] [--if-stale <seconds>] [--silent] [--skills <ids...>]

--if-stale 86400  → Solo sync si meta tiene más de N segundos (usado por hook)
--force           → Ignora ETags, re-descarga todo
--silent          → Sin output (para uso en hook)

Flujo (concurrencia: 4):
1. Si --if-stale y no stale → exit 0 silenciosamente
2. Para cada skill del registry (salvo static: true):
   a. fetch con ETag → si 304, skip
   b. transform (claude CLI → static fallback)
   c. split si aplica
   d. install
3. Actualizar .pulse-meta.json (status + etags)
4. Si no --silent: mostrar tabla de cambios
```

### `pulse greet`

```
pulse greet [--once]

--once → solo ejecuta si meta.firstSessionDone === false, luego lo marca true

Propósito: inyectar mensaje de bienvenida del tutor en la primera sesión
del repo después de instalar pulse.

Output JSON a stdout (leído por el hook SessionStart de Claude Code):
{
  "additionalContext": "<mensaje de bienvenida>"
}

El mensaje de bienvenida incluye:
- Que pulse está activo y las skills están sincronizadas
- Cómo invocar el tutor: /cc-tutor
- Cómo ver la ruta de aprendizaje: /cc-learning-path
- Que las skills se auto-actualizan diariamente

Si firstSessionDone: true y --once → exit 0 sin output
```

### `pulse list`

```
pulse list

Tabla con:
- Skill ID
- Última sincronización
- Transformado con (claude/static/fixed)
- Estado (✓ fresh / ⚠ stale / ✗ missing)
```

### `pulse status`

```
pulse status

- Versión del paquete
- Directorio actual
- Skills instaladas / total disponibles
- Último sync (hace X horas / estado)
- Hook SessionStart: ✓ instalado / ✗ no instalado
- Claude CLI: ✓ disponible (transformer: claude) / ✗ (transformer: static)
- Platform: unix / windows / wsl
- firstSessionDone: true/false
```

### `pulse uninstall`

```
pulse uninstall [--keep-hook] [--keep-skills]

1. Remover hook de .claude/settings.json (entry con _pulse: true)
2. Eliminar .claude/skills/cc-*/ (solo los que tienen _pulse: true)
3. Eliminar .claude/skills/.pulse-meta.json
4. NUNCA tocar skills del usuario sin el marker _pulse: true
```

---

## Contenido estático: `cc-tutor/SKILL.md`

Este archivo se instala directamente desde el paquete, sin fetch ni transformación.

```markdown
---
name: cc-tutor
description: >
  Tutor interactivo de Claude Code. Úsame cuando el usuario parezca
  ser nuevo, pregunte cómo empezar, qué puede hacer Claude Code, o
  pida que lo guíes o enseñes. También respondo sobre hooks, MCP,
  sub-agents y features avanzadas. Detecto el idioma del usuario
  automáticamente y respondo en ese idioma.
invocation: auto
_pulse: true
_static: true
---

# Claude Code Tutor — claude-code-pulse-tutor

## Tu rol
Eres un tutor experto en Claude Code integrado via claude-code-pulse-tutor.
Cuando esta skill se activa:

1. **Detecta el idioma** del usuario en su primer mensaje y responde en ese
   idioma durante toda la sesión. No lo preguntes, simplemente adáptate.

2. **Evalúa el nivel** con máximo 2 preguntas antes de guiar:
   - "¿Ya usaste Claude Code antes o es tu primera vez?"
   - Si ya lo usa: "¿Qué partes ya usas con frecuencia?"
   Ajusta la profundidad según la respuesta.

3. **Estructura el aprendizaje** en tres niveles:

### Nivel Beginner
Conceptos y comandos para empezar a trabajar desde el día 1:
- Qué es Claude Code y cómo difiere de otros AI coding tools
- Instalar y autenticar: `npm install -g @anthropic-ai/claude-code` → `claude`
- Primera sesión: `claude` en cualquier directorio, qué hacer
- Comandos básicos: `/help`, `/compact`, `/cost`, `/memory`
- Permission modes: default vs plan mode (Shift+Tab)
- Cómo dar buenos prompts: ser específico, dar contexto, pedir verificación
- CLAUDE.md: qué es y cómo crear uno básico para tu proyecto
- Git workflow: commits, branches, PRs con Claude Code

### Nivel Intermediate
Configuración y flujos que multiplican la productividad:
- `settings.json`: permisos, env vars, configuración de herramientas
- Skills: crear comandos personalizados en `.claude/skills/`
- Hooks: `SessionStart`, `PostToolUse`, `Stop` — automatizar tareas repetitivas
- MCP servers: conectar bases de datos, APIs, herramientas externas
- Sub-agents: delegar tareas a agentes especializados
- Worktrees paralelos: múltiples sesiones simultáneas en el mismo repo
- Modo headless: `claude --print "tarea"` en scripts y CI/CD
- `/loop`: tareas recurrentes y polling

### Nivel Advanced
Arquitecturas y patrones para equipos y automatización a escala:
- Agent teams: coordinar múltiples instancias trabajando en paralelo
- Channels: recibir webhooks y eventos externos en sesiones activas
- Plugins y marketplaces: crear y distribuir extensiones para equipos
- GitHub Actions / GitLab CI con `@claude` mentions
- Sandboxing: filesystem y network isolation para ejecución segura
- Monitoring con OpenTelemetry: métricas de uso, costos, adopción
- Managed settings: configuración centralizada para organizaciones
- LLM gateway: LiteLLM, Bedrock, Vertex AI como backend

## Reglas de tutoría
- Usa ejemplos concretos y comandos reales, nunca teoría abstracta
- Después de cada tema pregunta: "¿Lo probaste? ¿Alguna duda?"
- Si el usuario tiene un problema específico, resuélvelo primero antes de enseñar
- Para ver el currículo completo: sugiere `/cc-learning-path`
- Las skills `cc-hooks-*`, `cc-mcp`, `cc-settings` tienen referencia detallada disponible
- Si preguntan sobre algo muy reciente, consulta `cc-changelog` para info actualizada
```

---

## Contenido estático: `cc-learning-path/SKILL.md`

```markdown
---
name: cc-learning-path
description: >
  Ruta de aprendizaje estructurada de Claude Code por niveles.
  Úsame cuando el usuario quiera ver el currículo completo, saber
  qué aprender después, o necesite un plan de estudio organizado.
invocation: user
_pulse: true
_static: true
---

# Claude Code — Learning Path
> Powered by claude-code-pulse-tutor · Skills sincronizadas con docs oficiales

## Cómo usar esta guía
Cada nivel incluye conceptos, el skill de referencia disponible en tu sesión,
y un ejercicio práctico para validar que lo dominaste.

---

## 🟢 Beginner

| Tema | Skill de referencia | Ejercicio |
|---|---|---|
| Instalación y primer uso | — | Abrir Claude Code en un proyecto real |
| Permission modes | `cc-permissions` | Alternar entre default y plan mode |
| CLAUDE.md básico | `cc-memory` | Crear un CLAUDE.md para tu proyecto |
| Comandos built-in | `cc-commands` | Usar /compact y /cost en una sesión larga |
| Git workflow | `cc-common-workflows` | Crear un commit y PR con Claude Code |

**Checkpoint**: ¿Puedes pedirle a Claude Code que entienda tu codebase
y haga un cambio con tests en menos de 5 prompts?

---

## 🟡 Intermediate

| Tema | Skill de referencia | Ejercicio |
|---|---|---|
| settings.json completo | `cc-settings` | Configurar permisos fine-grained |
| Crear una Skill | `cc-skills-guide` | Skill de code review para tu stack |
| Hook SessionStart | `cc-hooks-events` + `cc-hooks-guide` | Notificación cuando empieza sesión |
| Hook PostToolUse | `cc-hooks-events` | Auto-format después de editar archivos |
| MCP server básico | `cc-mcp` | Conectar tu base de datos via MCP |
| Sub-agents | `cc-sub-agents` | Agente especializado en testing |
| Worktrees paralelos | `cc-common-workflows` | Dos features en paralelo |
| Headless en scripts | `cc-headless` | `claude --print` en un npm script |

**Checkpoint**: ¿Tienes hooks que automatizan al menos 2 tareas
repetitivas de tu flujo de desarrollo?

---

## 🔴 Advanced

| Tema | Skill de referencia | Ejercicio |
|---|---|---|
| Agent teams | `cc-agent-teams` | Equipo de 3 agentes: review, implement, test |
| Channels + webhooks | `cc-channels` | CI que notifica a sesión activa |
| Crear un Plugin | `cc-plugins` | Plugin con skills + hooks para tu equipo |
| GitHub Actions | `cc-github-actions` | @claude en PRs del repo |
| Sandboxing | `cc-sandboxing` | Habilitar y configurar para el equipo |
| Model config | `cc-model-config` | opusplan para arquitectura, haiku para tasks rápidas |
| Scheduled tasks | `cc-scheduled-tasks` | /loop que monitorea deploys |

**Checkpoint**: ¿Tienes Claude Code integrado en tu CI/CD y al menos
un plugin compartido con tu equipo?

---

## Skills disponibles en esta sesión
Todas estas skills están sincronizadas con la documentación oficial:
`cc-changelog` · `cc-hooks-events` · `cc-hooks-config` · `cc-hooks-io` ·
`cc-hooks-guide` · `cc-mcp` · `cc-settings` · `cc-permissions` ·
`cc-sub-agents` · `cc-agent-teams` · `cc-skills-guide` · `cc-memory` ·
`cc-cli-reference` · `cc-commands` · `cc-model-config` · `cc-plugins` ·
`cc-channels` · `cc-scheduled-tasks` · `cc-headless` · `cc-sandboxing` ·
`cc-common-workflows` · `cc-best-practices` · `cc-github-actions`

Para ver el estado de sincronización: ejecuta `pulse status` en tu terminal.
```

---

## `package.json`

```json
{
  "name": "claude-code-pulse-tutor",
  "version": "1.0.0",
  "description": "Keep Claude Code alive. Fresh docs, built-in tutor, always in sync.",
  "bin": {
    "pulse": "./dist/cli.js"
  },
  "keywords": [
    "claude-code", "claude", "anthropic", "skills", "ai", "developer-tools",
    "mcp", "hooks", "tutor"
  ],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsup",
    "build:skills": "tsx scripts/generate-fallback-skills.ts",
    "dev": "tsx src/cli.ts",
    "test": "vitest",
    "prepublishOnly": "npm run build && npm run build:skills"
  }
}
```

---

## `tsup.config.ts`

```typescript
export default {
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  banner: { js: '#!/usr/bin/env node' }
}
```

---

## `.pulserc.json` (configuración del proyecto)

```json
{
  "skills": ["critical", "high"],
  "maxAge": 86400,
  "transformer": "auto",
  "silent": false
}
```

`transformer`: `"auto"` intenta Claude CLI primero, cae a static si falla.
`skills`: qué prioridades sincronizar. `"all"` incluye medium.

---

## Orden de implementación

Seguir exactamente este orden para tener algo funcional lo antes posible:

1. `meta.ts` + `platform.ts`
2. `fetcher.ts` con ETag
3. `transformer-static.ts` (garantiza funcionamiento sin Claude CLI)
4. `transformer-claude.ts` + `transformer.ts`
5. `splitter.ts`
6. `installer.ts`
7. `hook-manager.ts`
8. Skills estáticas: escribir `cc-tutor/SKILL.md` y `cc-learning-path/SKILL.md`
9. Comandos CLI: `sync` → `greet` → `init` → `list` → `status` → `uninstall`
10. Skills fallback bundled (`scripts/generate-fallback-skills.ts`)
11. Tests
12. README

---

## Comportamiento del hook SessionStart

El hook inyectado en `.claude/settings.json` ejecuta dos comandos:

**Unix / WSL:**
```bash
npx pulse sync --if-stale 86400 --silent && npx pulse greet --once || true
```

**Windows nativo:**
```cmd
npx.cmd pulse sync --if-stale 86400 --silent & npx.cmd pulse greet --once
```

El `|| true` / `& exit 0` garantiza que un fallo de pulse NUNCA impide
que Claude Code abra normalmente.

---

## Consideraciones críticas

**El hook nunca debe romper Claude Code:**
- Timeout máximo del sync cuando se invoca desde hook: 60s
- Si sync falla → actualizar `lastSyncStatus: 'failed'` y continuar
- `pulse status` mostrará el error del último sync fallido

**Skills del usuario son intocables:**
- Cualquier skill sin `_pulse: true` en el frontmatter es ignorada por `pulse uninstall`
- El installer nunca sobreescribe skills sin ese marker

**Merge inteligente del hook:**
- `pulse init` en un repo con hooks existentes los preserva intactos
- `pulse uninstall` solo remueve el entry con `"_pulse": true`
- Si `SessionStart` queda vacío tras uninstall, se elimina la key completa

**ETag caching:**
- Si `code.claude.com` responde 304 → la skill no se re-procesa
- Hace el sync de 24h casi instantáneo cuando no hay cambios en los docs

**Fallback offline:**
- Si fetch falla después de 2 retries → usar skill bundled en `skills-fallback/`
- Las skills bundled se generan en el proceso de release con `npm run build:skills`

---

## Tests mínimos requeridos

```
tests/
├── hook-manager.test.ts
│   ├── merge con hooks existentes (no los toca)
│   ├── idempotencia (dos init no duplican el hook)
│   └── remove limpia solo el entry _pulse
├── transformer-static.test.ts
│   ├── output válido con docs reales de code.claude.com
│   └── truncación correcta al tokenBudget
├── splitter.test.ts
│   ├── split 'sections' divide por H2
│   └── split 'manual' respeta los headings definidos
└── platform.test.ts
    ├── detecta Windows vs Unix vs WSL correctamente
    └── genera el comando de hook correcto por plataforma
```

---

## README — secciones obligatorias

1. **Instalación en 10 segundos** — `npx pulse init` como primera instrucción
2. **Qué hace pulse** — sync, tutor, learning path
3. **Skills disponibles** — tabla completa con descripción
4. **Uso en equipos** — commitear `.claude/skills/cc-*` para compartir
5. **Comandos CLI** — tabla de todos los comandos con descripción
6. **Cómo funciona el sync** — ETag, Claude CLI transformer, fallback
7. **Configuración** — `.pulserc.json` con todas las opciones
8. **Troubleshooting** — hook no funciona, Windows, skill stale, Claude CLI no disponible
9. **Contributing** — cómo mejorar las skills estáticas y el tutor

---

## Criterios de aceptación

- [ ] `npx pulse init` completa sin errores en Unix, Windows y WSL
- [ ] Hook se agrega sin sobrescribir hooks existentes del usuario
- [ ] `pulse uninstall` deja `.claude/settings.json` exactamente como estaba antes
- [ ] Sync con Claude CLI produce skills con ≤ tokenBudget tokens
- [ ] Fallback estático produce skills válidas cuando Claude CLI no está disponible
- [ ] `cc-hooks-events`, `cc-hooks-config`, `cc-hooks-io` se generan como 3 skills separadas
- [ ] Skills del usuario (sin `_pulse: true`) no son tocadas por uninstall
- [ ] En Windows puro (no WSL) el hook command usa `npx.cmd`
- [ ] Si `code.claude.com` está caído, usa skills bundled sin error al usuario
- [ ] `.pulse-meta.json` se actualiza correctamente después de cada sync
- [ ] `pulse greet --once` solo se ejecuta una vez por repo (firstSessionDone)
- [ ] `cc-tutor` detecta el idioma del usuario y responde en ese idioma
- [ ] `cc-learning-path` es invocable con `/cc-learning-path`
- [ ] Ambas skills estáticas tienen `_pulse: true` en frontmatter
