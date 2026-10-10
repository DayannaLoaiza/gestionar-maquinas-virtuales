# Monorepo Conventions

## Package Manager

Use pnpm exclusively (versión fijada en `packageManager`). Never use npm or yarn.

## Workspace Commands

Run commands in a specific package using the filter flag:

```bash
pnpm --filter @vm/backend <command>
pnpm --filter @vm/frontend <command>
pnpm --filter @vm/shared-types <command>
```

Todos los paquetes llevan el scope `@vm/`, también las apps: `--filter backend` no encuentra nada.
`turbo.json` no declara ningún filtro; se pasa siempre por línea de comandos.

## Turbo Pipeline

- `pnpm build` builds all packages in dependency order (`dependsOn: ["^build"]`).
- `pnpm dev` runs both apps plus `tsup --watch` of `shared-types`.
- `lint`, `typecheck` y `test` también dependen de `^build`: corren después de compilar
  `shared-types`.

## Shared Packages

- `@vm/shared-types` — schemas Zod de request, modelos compartidos y constantes `as const`
  (ver `.claude/rules/shared-types.md`).
- `@vm/tsconfig` — configuraciones TypeScript (`base`, `nestjs`, `nextjs`, `library`).
- `@vm/eslint-config` — flat configs (`base`, `nest`, `next`).
- Referenced in app `package.json` as `"workspace:*"`.
- **`shared-types` se consume compilado:** sus `exports` apuntan a `dist/` (tipos incluidos). Tras
  cualquier cambio, `pnpm --filter @vm/shared-types build` (o tener `pnpm dev` corriendo). Sin el
  build, ni los tipos ni el runtime ven el cambio.

## Path Aliases

- Cada app mapea `@/*` a `./src/*` en su propio `tsconfig.json`. El alias es de la app: no resuelve
  entre apps.
- **`apps/backend`:** `./` solo para la misma carpeta o sus subcarpetas; todo lo que sube de nivel va
  con `@/`. Lo hace cumplir `no-restricted-imports` en `apps/backend/eslint.config.mjs`. Detalle en
  `apps/backend/.claude/rules/nestjs-patterns.md` → "Imports".
- 🔴 **En el backend el alias depende del cwd del build.** Next resuelve `@/` en su bundler, pero
  `nest build` lo reescribe con un hook de `tsconfig-paths` que resuelve contra el **directorio
  actual**. Corrido fuera de `apps/backend`, deja `require("@/…")` en `dist/` **sin error de
  compilación** y el API cae al arrancar. `pnpm --filter @vm/backend build` y `turbo` corren en
  `apps/backend`, y el script `build` termina con `scripts/check-dist-aliases.mjs`, que falla si
  quedó alguno.
- **Por qué `@/` y no relativos:** un import dice qué módulo o capa usa sin contar `../`; un
  `grep "@/modules/users"` lista todos los dependientes; mover un archivo solo rompe a quienes lo
  importan. El costo (la guarda y la regla de lint) es fijo.

## Dependency Placement

- App-specific dependencies go in that app's `package.json` (e.g., `next` in `apps/frontend/package.json`).
- Shared dev tools (prettier, turbo, typescript) go in the root `package.json`.
- Una librería que usa en runtime un paquete y además las apps (p. ej. `zod`) se declara en cada
  `package.json` que la importa, con la misma versión.
- Never install app-specific dependencies at the root level.
- Las versiones se fijan exactas. Los majors de Nest, ESLint, TypeScript y TanStack Table están
  fijados a propósito (ver `CLAUDE.md` → "Pinned versions").

## Cross-App Imports

Never import directly between `apps/frontend` and `apps/backend`. If code needs to be shared, move
it to a package in `packages/`.
