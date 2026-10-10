# Code Style Rules

## TypeScript

- Never use the `any` type. Use `unknown` with type guards instead.
- `strict` está activo **igual en todo el monorepo**: todos los paquetes extienden
  `packages/tsconfig/base.json` (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnused*`). No relajarlo por paquete.
- Prefer named exports over default exports (salvo donde el framework exige `default`: páginas y
  layouts de Next, archivos de config).
- Orden de imports: lo hace cumplir `import-x/order` (`packages/eslint-config/base.mjs`):
  externos, internos (`@vm/*`, `@/…`), relativos y al final los `import type`, con una línea en
  blanco entre grupos. `pnpm lint:fix` lo corrige.
- En `apps/backend`, los imports que suben de carpeta (`../`) son error de lint: se usa `@/…`. Ver
  `apps/backend/.claude/rules/nestjs-patterns.md` → "Imports".

## Functions

- Keep functions under 50 lines. If a function exceeds this, split it.
- Single responsibility: each function does one thing.
- Use early returns to avoid deep nesting. Never nest more than 3 levels.

## Naming

- Use descriptive names. No abbreviations like `usr`, `mgr`, `btn`, `idx`.
- Boolean variables start with `is`, `has`, `can`, or `should`.
- Constants use UPPER_SNAKE_CASE. Variables and functions use camelCase. Types and classes use PascalCase.

## DRY

- When code appears 2 or more times, extract it into a reusable function, hook, or component.
- Check existing utilities in `apps/frontend/src/lib/` and `apps/backend/src/shared/utils/` before
  writing new helpers.

## Logging and Comments

- No `console.log` in production code. Use the NestJS `Logger` in the backend.
- Write comments only when the logic is non-obvious. Code should be self-documenting through clear naming.
- Never commit commented-out code.

## Error Handling

- Always handle errors explicitly. Never swallow exceptions silently (use `logger.debug()` if catching is intentional).
- Backend: excepciones de dominio en `src/shared/exceptions/` — nunca definir clases de excepción
  dentro de un service. Las de Nest (`NotFoundException`, `ConflictException`…) con un mensaje
  escrito para el usuario también valen.
- Never return error objects manually — always throw.

## Configuration (Backend)

- Use `ConfigService` from `@nestjs/config` — never access `process.env` directly in services, guards, or repositories.
- `process.env` is only acceptable in bootstrap files (`main.ts`).
