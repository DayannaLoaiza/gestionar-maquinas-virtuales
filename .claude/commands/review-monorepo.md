Review code changes in this monorepo.

Scope: $ARGUMENTS (default: all changed files)

Steps:

1. Run `git diff --name-only` (against the base branch) to identify changed files
2. Categorize by package: `apps/frontend/`, `apps/backend/`, `packages/` (shared)
3. For frontend changes: delegate to the frontend-reviewer agent
4. For backend changes: delegate to the api-reviewer agent
5. For shared changes: verify both apps compile (`pnpm typecheck`)
6. Run `pnpm lint`
7. Output a consolidated review report with severity levels
