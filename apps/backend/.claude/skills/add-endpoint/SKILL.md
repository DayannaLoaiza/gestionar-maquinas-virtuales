---
name: add-endpoint
description: 'Add a new REST endpoint to an existing NestJS module in apps/backend'
disable-model-invocation: true
allowed-tools: [Read, Write, Edit, Grep, Glob]
argument-hint: '<module-name> <HTTP-method> <path>'
---

<!--
disable-model-invocation: edita código; la lanza la usuaria con /add-endpoint.
Mandan apps/backend/CLAUDE.md y apps/backend/.claude/rules/nestjs-patterns.md: esta skill solo
lista lo que se suele olvidar al agregar un endpoint.
-->

# Add Endpoint

Arguments: `$ARGUMENTS` (module, HTTP method, path).

0. **SDD:** si el endpoint cambia comportamiento observable es un cambio M o L
   (`docs/sdd/README.md`): sin `tasks.md` aprobado no se edita `apps/` ni `packages/`.
1. Read the module's controller, service and repository (`apps/backend/src/modules/<module>/`).
   Follow what they already do; don't introduce a new pattern.
2. **Controller** — HTTP only (`nestjs-patterns.md` → "Layer Separation"):
   - **Never inject a repository**, and don't filter, compute or map data here: parse the input,
     call one service, return `{ resource }` (+ `message`). Query strings are converted here
     (`active === 'true'`, `normalizePagination(page, pageSize)`); the service gets real types.
   - The route lives under the controller's `@Controller('api/<module>')`.
   - Ids with `ParseUUIDPipe`.
   - Body with `@Body(new ZodValidationPipe(Schema))`; `@HttpCode(201)` on creations (Nest's
     default for `@Post`), `@HttpCode(200)` on POST actions that don't create.
   - Return the value directly; `ResponseInterceptor` wraps it in `{ success, data }`.
   - Once an `auth` module exists: writes carry `@Roles(ROLES.ADMIN)`; `@Public()` only with a
     reason.
3. **DTO** — if there's a request body, the schema goes in `packages/shared-types/src/dto/`
   (schema and type with the same name, messages in Spanish), then
   `pnpm --filter @vm/shared-types build`: both apps read `dist/`.
4. **Service** — business logic. Errors are **thrown** (Nest exceptions with a user-facing message
   or domain exceptions from `src/shared/exceptions/`, never inline classes, never returned). A
   4xx `message` is shown to the user as-is: write it for them, don't echo the input.
5. **Repository** — only if new data access is needed. Filters belong in the query, not in memory
   after fetching everything.
   - Imports that climb a folder use `@/…` (`../` is a lint error).
6. **Response** — never include `passwordHash`, tokens or `deletedAt`: map to the shared model.
7. **Test** — only what `docs/testing.md` requires (Critical RFs, with the RF id in the name). If
   the endpoint validates input, the e2e (`test/*.e2e-spec.ts`) proves the pipe runs. Run
   `pnpm --filter @vm/backend test` and `test:e2e`.
8. **Front** — the frontend reaches it through the `/api/*` rewrite; its response shape goes in
   `apps/frontend/src/types/api.ts`.
