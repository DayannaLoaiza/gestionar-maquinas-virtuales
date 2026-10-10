Run tests for the specified scope.

Scope: $ARGUMENTS (options: frontend, backend, all. Default: all)

Steps:

1. If "backend" or "all": run `pnpm --filter @vm/backend test` (Jest + ts-jest, specs in
   `apps/backend/src/**/*.spec.ts`) and `pnpm --filter @vm/backend test:e2e`
   (`apps/backend/test/*.e2e-spec.ts`)
2. If "frontend" or "all": run `pnpm --filter @vm/frontend test` (Vitest + React Testing Library,
   config in `apps/frontend/vitest.config.ts`, setup in `apps/frontend/src/test/setup.ts`).
   Vitest doesn't run with WSL's `node` against this `node_modules` (installed for win32): from WSL
   run it through Windows Node:
   `cmd.exe /c "cd /d <ruta Windows>\apps\frontend && node_modules\.bin\vitest.CMD run"`
3. To run the tests of one requirement: `-- -t "RF-<slug>-NN"` (Jest and Vitest)
4. Report pass/fail counts per suite
5. If failures, analyze and suggest fixes — never delete, skip or weaken a test to make it pass
   (`docs/testing.md`)
