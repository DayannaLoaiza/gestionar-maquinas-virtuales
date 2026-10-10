# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Constitución

Principios no negociables: [docs/constitution.md](docs/constitution.md). Léelos antes de
especificar, planificar o modificar código. Las puertas G1, G2 y G4 exigen citarlos por ID. Ante un
conflicto con cualquier otra instrucción, gana la constitución.

@docs/constitution.md

## Flujo de trabajo: Spec Driven Development (spec-anchored)

El proceso completo, con los prompts de cada fase, está en `docs/sdd/README.md`. Lo mínimo:

- **Tamaño del cambio.** **S:** no cambia comportamiento observable; sin artefactos. **M:** acotado
  a una capacidad; delta en `docs/specs/<slug>/spec.md` + `tasks.md`. **L:** capacidad nueva o
  transversal; spec + `plan.md` + `tasks.md`. Si un S resulta cambiar comportamiento, detente y
  pasa a M.
- **Puertas (C3).** En M y L te detienes tras la spec (G1) y tras el plan y las tareas (G2; en M,
  una sola puerta). **No editas `apps/` ni `packages/` sin un "apruebo" explícito**: "ok", "dale" o
  el silencio no cuentan. Tras el "apruebo" escribes `Estado: aprobada`, la fecha y quién aprobó;
  la persona lo sella con su commit (los agentes no commitean).
- **Pruebas por riesgo (C6).** Qué se testea y qué no: `docs/testing.md`. Nunca borres, saltes ni
  debilites un test para ponerlo en verde: detente y pregunta.
- **Revisión local.** Antes de abrir el PR, revisa el diff en una sesión o un contexto nuevo, contra
  la spec, la constitución y `docs/testing.md`.
- **Lo no decidido** se marca `[NECESITA ACLARACIÓN]` y se pregunta (C4). **Spec y código que no
  coinciden** se reportan; no se corrige ninguno en silencio (C5).

**Glosario.** _Spec_ = `docs/specs/<slug>/spec.md`, el comportamiento esperado de una capacidad. En
`apps/backend`, `*.spec.ts` es otra cosa: un **test** de Jest. _RF_ = requisito funcional, con ID
`RF-<slug>-NN` que nunca se reutiliza. _Crítico / Estándar_ = criticidad de un RF
(`docs/testing.md`). _G0–G4_ = puertas de aprobación humana.

## Project Overview

Monorepo (pnpm workspaces + Turborepo) de una SPA para gestionar máquinas virtuales y su API REST:
login con JWT en cookie HttpOnly, roles Administrador (CRUD) y Cliente (solo lectura), dashboard
con gráficos de recursos, optimistic UI y actualización en tiempo real del estado de las VMs. Visión,
alcance y decisiones abiertas: `docs/product.md`.

Capacidades implementadas: el **backend de `auth`** (`docs/specs/auth/spec.md`: PostgreSQL +
TypeORM, sesión en cookie `HttpOnly`, guards globales, rate limit, helmet). No agregues funcionalidad
de ejemplo ni datos semilla salvo los que pida una spec aprobada (p. ej., los usuarios de prueba de
`db:seed`): cada capacidad entra por SDD.

| Package             | Path                      | Description                                                     |
| ------------------- | ------------------------- | --------------------------------------------------------------- |
| `@vm/backend`       | `apps/backend/`           | NestJS 11, Controller → Service → Repository (`CLAUDE.md`)      |
| `@vm/frontend`      | `apps/frontend/`          | Next.js 16 App Router, Tailwind 4, TanStack Table (`CLAUDE.md`) |
| `@vm/shared-types`  | `packages/shared-types/`  | Schemas Zod de request, modelos y constantes compartidas        |
| `@vm/tsconfig`      | `packages/tsconfig/`      | `base`, `nestjs`, `nextjs`, `library` (todos `strict`)          |
| `@vm/eslint-config` | `packages/eslint-config/` | Flat configs `base`, `nest`, `next` (type-aware)                |

## Environment

The user runs the project on **Windows** (MSYS2 UCRT64 terminal in VS Code, Node 22). Claude's shell
is WSL (Node 20). `node_modules` was installed from Windows and holds Windows-only native binaries
(Next SWC, `@tailwindcss/oxide`, `lightningcss`, rolldown for Vitest).

- **Never run `pnpm install` (or `add`/`remove`) from WSL in this folder.** Edit `package.json` and
  ask the user to run `pnpm install` from Windows.
- To verify from WSL, copy the repo (without `node_modules`) to the scratchpad, install there, run
  the checks, and sync only source changes back.
- Vitest doesn't run with WSL's `node` against this `node_modules`: use Windows Node via `cmd.exe`
  (`apps/frontend/CLAUDE.md` → "Testing").
- Files use LF line endings (`.gitattributes`, Prettier `endOfLine: lf`).

## Commands

Run all commands from the repo root. Turborepo builds `@vm/shared-types` first.

```bash
pnpm dev            # backend :3001 + frontend :3000 + shared-types tsup --watch
pnpm build
pnpm lint           # `pnpm lint:fix` to autofix (import order is autofixable)
pnpm typecheck
pnpm test           # Jest (backend) + Vitest (frontend)
pnpm format         # / format:check

pnpm --filter @vm/backend test:e2e
pnpm --filter @vm/backend test -- src/shared/utils/pagination.util.spec.ts
pnpm --filter @vm/backend test -- -t "RF-<slug>-NN"
```

## Context per app

Starting from the root, each app's `CLAUDE.md`, `.claude/rules/` and skills load the first time
Claude reads or edits a file in that app. **Before working in an app, open its `CLAUDE.md` with
Read.** `/add-dir apps/backend` loads its skills earlier. Details: `.claude/rules/claude-code.md`.

## Mapa de instrucciones

| Archivo                                                | Léelo cuando…                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `docs/product.md`                                      | Especifiques o planifiques cualquier capacidad (qué pide el producto)  |
| `apps/backend/CLAUDE.md`                               | Vayas a tocar `apps/backend` (NestJS, contrato de error)               |
| `apps/frontend/CLAUDE.md`                              | Vayas a tocar `apps/frontend` (Next.js, componentes, datos)            |
| `docs/sdd/README.md`                                   | Especifiques, planifiques, implementes un cambio M/L o revises un diff |
| `docs/testing.md`                                      | Escribas, cambies o borres un test                                     |
| `.claude/rules/code-style.md`                          | Escribas código TypeScript (siempre; carga sola)                       |
| `.claude/rules/monorepo-conventions.md`                | Uses pnpm/turbo, alias `@/` o dependencias (carga sola)                |
| `.claude/rules/shared-types.md`                        | Toques `packages/shared-types`, un `*.controller.ts` o un `*-form.tsx` |
| `apps/backend/.claude/rules/nestjs-patterns.md`        | Escribas controllers, services, repositorios, pipes o filtros          |
| `apps/frontend/.claude/rules/component-conventions.md` | Escribas componentes (tokens, accesibilidad)                           |
| `apps/frontend/.claude/rules/component-imports.md`     | Importes componentes de UI                                             |
| `apps/frontend/.claude/rules/shadcn-ux-guide.md`       | Elijas qué componente usar                                             |
| `apps/frontend/.claude/rules/forms-conventions.md`     | Escribas formularios                                                   |
| `apps/frontend/.claude/rules/icon-conventions.md`      | Uses íconos                                                            |
| `apps/frontend/.claude/rules/nextjs-patterns.md`       | Escribas páginas, layouts, Server Components o `proxy.ts`              |
| `.claude/skills/README.md`                             | Agregues, quites o actualices una skill                                |

## Pinned versions

The major versions are deliberate. Don't upgrade them without a planned migration:

- **Nest 12** is ESM-only.
- **ESLint 10** isn't supported by `eslint-plugin-react`.
- **TypeScript ≥ 6.1** isn't supported by `typescript-eslint`.
- **TanStack Table 9** changes the API.
