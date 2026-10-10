# Claude Code — lo que aplica solo a Claude

Regla sin `paths:`: carga siempre. Guarda lo que depende de herramientas de Claude Code; lo demás
está en `CLAUDE.md` (raíz y de cada app) y en `docs/`.

## Contexto por app

Lanzando Claude desde la raíz, al arrancar cargan solo el `CLAUDE.md` raíz (y por import,
`docs/constitution.md`) y las reglas de `.claude/rules/` **sin** frontmatter `paths:`. El contexto de
cada app (`apps/backend`, `apps/frontend`) —su `CLAUDE.md`, su `.claude/rules/` y sus skills—
carga **la primera vez que Claude lee o edita un archivo de esa carpeta** (doc oficial: "Memory" y
"Set up Claude Code in a monorepo"). Un `cat` de un solo archivo también cuenta como lectura; un
`grep` o `find` sobre la carpeta, no.

- **Antes de analizar, revisar o crear código en una app, abrir con Read su `CLAUDE.md`.** Es la
  forma más barata de disparar la carga de sus reglas y skills.
- **Las skills de una app no aparecen en el menú `/` hasta esa primera lectura.** Al arrancar desde
  la raíz, `/add-endpoint` o `/generate-component` no existen todavía. Para tenerlas antes: abrir el
  `CLAUDE.md` de la app o correr `/add-dir apps/backend` (o `apps/frontend`).
- Para una sesión que es solo de una app, lanzar Claude desde esa carpeta: su contexto carga al
  arrancar, junto con el de la raíz. Ojo: `.claude/settings.json` **no** se hereda de la raíz, así
  que desde una subcarpeta no aplican los permisos ni el hook de formato de la raíz.
- Los agents van **siempre** en `.claude/agents/` de la raíz: los de una subcarpeta no se descubren
  desde la raíz. `CLAUDE.md`, reglas y skills de cada app se quedan junto a su código.
- No importar los `CLAUDE.md` de las apps con `@` desde la raíz: se cargarían en cada sesión,
  también en las que no tocan esa app.
- **Un paquete transversal** (consumido por las dos apps) no lleva `CLAUDE.md` propio: su contexto
  va en una regla raíz con `paths:` que incluya **sus consumidores**, porque es ahí donde se lo usa
  mal. Es el caso de `.claude/rules/shared-types.md` (paquete + `*.controller.ts` del backend +
  `*-form.tsx` del frontend).

## Documentación de librerías (C11)

Context7 MCP (`.mcp.json`) es obligatorio: consultarlo **antes** de implementar algo con una
librería externa. La primera vez Claude Code pide aprobar el servidor del proyecto.

## SDD en Claude Code

- **`/sdd <fase> <pedido>`** (`.claude/skills/sdd/`, solo la usuaria la invoca) carga el proceso y
  registra el **freno de G2**: un hook `PreToolUse` que corre `scripts/sdd-gate.mjs` antes de cada
  `Edit`, `Write` o `NotebookEdit`.
  - Pide confirmación al editar `apps/` o `packages/` si no hay ningún `tasks.md` con Estado
    `aprobada`, y al editar `docs/constitution.md` (G0). Es `ask` y no `deny`, para poder
    autorizar a conciencia un cambio S.
  - Queda activo desde que se invoca la skill hasta el fin de la sesión; sin invocarla, no hay
    freno. No ve ediciones hechas por Bash.
  - Falla cerrado: si el script no puede decidir, pide confirmación. Un hook que termina con error
    (código distinto de 2) dejaría pasar la edición.
- **Puertas G0–G4:** presentar la solicitud de aprobación (`docs/sdd/templates/aprobacion.md`) y
  preguntar con `AskUserQuestion`, opciones "Apruebo" / "Pedir cambios". Sin "Apruebo" no se edita
  `apps/` ni `packages/` en un cambio M o L.
- **Ninguna fase SDD se delega a los subagentes built-in Explore o Plan:** no cargan `CLAUDE.md`,
  así que trabajarían sin la constitución. Los agentes de `.claude/agents/` sí la cargan.
- **Plan mode no sirve para escribir specs:** solo deja editar el archivo de plan, no `docs/specs/`.
- **Revisión local:** antes de abrir el PR, sobre el diff, `code-reviewer` (más `api-reviewer`,
  `frontend-reviewer` o `security-auditor` según lo tocado) o `/code-review`. Pedir solo hallazgos
  que afecten la corrección o los requisitos; su informe va en la solicitud de G4.

## Entorno (WSL ↔ Windows)

El shell de Claude es WSL; la usuaria instala y corre el proyecto desde Windows (`node_modules` con
binarios nativos de win32). Nunca `pnpm install`/`add` desde WSL en esta carpeta. Para verificar,
copiar el repo (sin `node_modules`) al scratchpad e instalar ahí. Vitest no corre con el `node` de
WSL contra este `node_modules`: delegar en el Node de Windows con `cmd.exe /c`.
