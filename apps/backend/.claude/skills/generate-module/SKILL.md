---
name: generate-module
description: 'Generate a complete NestJS module in apps/backend with controller, service, and repository'
disable-model-invocation: true
allowed-tools: [Read, Write, Edit, Grep, Glob]
argument-hint: '<module-name>'
---

<!--
disable-model-invocation: crea archivos y edita app.module.ts; la lanza la usuaria.
Edit está porque registrar el módulo en app.module.ts es una edición, no un archivo nuevo. Sin Bash:
los comandos de verificación los aprueba .claude/settings.json (`pnpm *`).
-->

# Generate Module

Arguments: `$ARGUMENTS` (module name, kebab-case, plural: `snapshots`).

0. **SDD:** un módulo nuevo es una capacidad nueva: cambio **L** (`docs/sdd/README.md`). Sin spec y
   `tasks.md` aprobados no se crea código.
1. Check `apps/backend/.claude/rules/nestjs-patterns.md` ("Existing Modules") and
   `apps/backend/src/modules/`: don't create one that already exists.
2. Create in `apps/backend/src/modules/<name>/`:
   - `<name>.module.ts` — `controllers`, `providers` (service + repository); `exports` only the
     services another module imports (never a repository).
   - `<name>.controller.ts` — `@Controller('api/<name>')`. It injects services only, never the
     repository.
   - `<name>.service.ts` — logic; maps internal rows to the shared model; errors are thrown.
   - `<singular>.repository.ts` — data access only. If the project still has no database, stop and
     ask: choosing the persistence technology is a decision of its own (recorded in the plan).
   - Pure logic, if any, in its own file with a unit spec.
   - `<name>.service.spec.ts` — only for Critical requirements (`docs/testing.md`).
   - Imports from outside the module folder use `@/…` (`@/shared/pipes/zod-validation.pipe`);
     `../` is a lint error.
3. Request schemas and the shared model go in `packages/shared-types` (`src/dto/` and
   `src/<name>/`), exported from `src/index.ts`; the first DTO also adds `zod` to that package's
   `package.json` (same version as the apps). Then `pnpm --filter @vm/shared-types build`.
4. Register the module in `apps/backend/src/app.module.ts` (`imports`).
5. For every endpoint, follow the `add-endpoint` checklist (pipes, DTO in `shared-types` + build,
   4xx messages written for the user).
6. Verify: `pnpm --filter @vm/backend build` (includes `check-dist-aliases`),
   `pnpm --filter @vm/backend test` and `test:e2e`.
