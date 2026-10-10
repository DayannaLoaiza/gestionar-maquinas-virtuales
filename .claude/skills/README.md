# Skills — procedencia y alcance

Este repo tiene **20 skills** en tres directorios. Las de `apps/backend/.claude/skills/` y
`apps/frontend/.claude/skills/` cargan la primera vez que Claude lee o edita un archivo de esa app:
hasta entonces no aparecen en el menú `/` (ver "Contexto por app" en `.claude/rules/claude-code.md`).

Todos los archivos de skill **están versionados en git**. `skills-lock.json` (raíz) es el registro
de procedencia —`source` + `computedHash`— de las de terceros, y **no debe ignorarse**. Vino de
Visor, el proyecto del que se adoptó esta configuración.

## Propias (7)

Escritas para este proyecto (adaptadas de Visor). Son las únicas que se modifican libremente.

| Skill                | Ubicación | Invoca       | Para qué                                           |
| -------------------- | --------- | ------------ | -------------------------------------------------- |
| `deep-research`      | raíz      | modelo y vos | Investigación del monorepo (corre en fork)         |
| `security-audit`     | raíz      | solo usuaria | Auditoría OWASP Top 10 del repo entero (en fork)   |
| `sdd`                | raíz      | solo usuaria | Fases y puertas SDD; activa el freno de G2         |
| `add-endpoint`       | backend   | solo usuaria | Agregar un endpoint REST a un módulo NestJS        |
| `generate-module`    | backend   | solo usuaria | Módulo NestJS completo (controller → repository)   |
| `generate-component` | frontend  | solo usuaria | Componente React con las convenciones del frontend |
| `optimize-bundle`    | frontend  | modelo y vos | Análisis del bundle de Next.js                     |

"Solo usuaria" = `disable-model-invocation: true`: crean o editan archivos, así que el modelo no las
lanza por su cuenta.

## Terceros (13)

Todas tienen entrada en `skills-lock.json` con su `source` y su hash. Tres se modificaron a
propósito después de instalarse, así que verificar su hash va a fallar y es esperado:

- `nestjs-best-practices`: nota de alcance para este repo.
- `web-design-guidelines`: guarda anti-inyección del contenido remoto y fallback con las reglas
  locales.
- `next-best-practices`: nota en `directives.md` sobre `'use cache'` y Next 16.

| Skill                         | Ubicación | Origen                         |
| ----------------------------- | --------- | ------------------------------ |
| `systematic-debugging`        | raíz      | `obra/superpowers`             |
| `test-driven-development`     | raíz      | `obra/superpowers`             |
| `turborepo`                   | raíz      | `vercel/turborepo`             |
| `nestjs-best-practices`       | backend   | `kadajett/agent-nestjs-skills` |
| `postgresql-table-design`     | backend   | `wshobson/agents`              |
| `accessibility-compliance`    | frontend  | `wshobson/agents`              |
| `next-best-practices`         | frontend  | `vercel-labs/next-skills`      |
| `next-upgrade`                | frontend  | `vercel-labs/next-skills`      |
| `responsive-design`           | frontend  | `wshobson/agents`              |
| `tailwind-design-system`      | frontend  | `wshobson/agents`              |
| `vercel-composition-patterns` | frontend  | `vercel-labs/agent-skills`     |
| `vercel-react-best-practices` | frontend  | `vercel-labs/agent-skills`     |
| `web-design-guidelines`       | frontend  | `vercel-labs/agent-skills`     |

Las carpetas de terceros están en `.prettierignore`: reformatearlas cambiaría su hash.

**Pendiente:** `turborepo` llegó sin su carpeta `references/` (24 enlaces rotos en su `SKILL.md`).
Reinstalarla desde `vercel/turborepo` con `npx skills` **desde Windows**.

## Solo usuaria por `skillOverrides`

Dos skills de terceros no se editan (para no romper su hash) pero se pasan a **solo usuaria** desde
`.claude/settings.json`:

- **`test-driven-development`** — su descripción dispara en _"any feature or bugfix"_ y su "Iron
  Law" ordena **borrar el código escrito antes del test**, lo que choca con `docs/testing.md`
  (pruebas por riesgo). Se usa cuando se pide, con `/test-driven-development`.
- **`next-upgrade`** — corre codemods y cambia dependencias.

## Notas de alcance

- **`nestjs-best-practices`** asume `class-validator`, TypeORM y Passport.js, que este repo no usa.
  Tiene una nota de alcance en su `SKILL.md`; la autoridad es
  `apps/backend/.claude/rules/nestjs-patterns.md`.
- **`postgresql-table-design`** solo aplica si se elige PostgreSQL: hoy no hay base de datos (los
  repositorios son en memoria).
- **`tailwind-design-system`** y **`vercel-react-best-practices`** traen ejemplos con
  `lucide-react`, SWR y Server Actions: nada de eso se usa (ver `apps/frontend/.claude/rules/`).

## Skills, `.claude/commands/` y comandos de Claude Code

- Si una skill y un archivo de `.claude/commands/` comparten nombre, **gana la skill y el comando
  nunca corre** (doc oficial, "Resolve skills that share a name"). No duplicar.
- **No usar el nombre de un comando de Claude Code.** Por eso la auditoría se llama `security-audit`
  (no `security-review`) y el comando de revisión `review-monorepo` (`/review` es alias de
  `/code-review`). Los comandos en `.claude/commands/` son `review-monorepo` y `test`.

## Regla general

Ante conflicto entre una skill de terceros y las reglas del proyecto (`.claude/rules/`,
`apps/backend/.claude/rules/`, `apps/frontend/.claude/rules/`), **ganan las reglas del proyecto**;
y sobre todas ellas, `docs/constitution.md`.

## Se eliminaron al adoptar la configuración de Visor (2026-10-10)

| Skill / comando      | Motivo                                                         |
| -------------------- | -------------------------------------------------------------- |
| `deploy-check`       | Validación de despliegue a Azure App Service de Visor          |
| `/deploy`            | Mismo motivo                                                   |
| `fix-issue`          | Flujo con GitHub Issues de Visor; no se pidió conservarlo      |
| `generate-migration` | Migraciones Drizzle escritas a mano; aquí no hay base de datos |
