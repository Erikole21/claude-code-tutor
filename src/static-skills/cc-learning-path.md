# Claude Code — Learning Path
> Powered by claude-code-pulse-tutor · Skills sincronizadas con docs oficiales

## Cómo usar esta guía
Cada nivel incluye conceptos, el skill de referencia disponible en tu sesión,
y un ejercicio práctico para validar que lo dominaste.

---

## Beginner

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

## Intermediate

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

## Advanced

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
