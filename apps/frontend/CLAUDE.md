# apps/frontend — Next.js (`@vm/frontend`)

Aplica también el `CLAUDE.md` raíz y `docs/constitution.md`, que manda sobre todo lo de este
archivo. El detalle de cada convención está en `.claude/rules/` (carga junto con este archivo).

## Stack

Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, TanStack Table 8, Zod 4 (vía
`@vm/shared-types`), Vitest + React Testing Library.

**Adoptado pero aún no instalado** (las reglas ya lo describen; se instala desde Windows cuando
haga falta): Radix UI / shadcn, `class-variance-authority`, `tw-animate-css`, `sonner`,
`react-hook-form` + `@hookform/resolvers`.

## API Communication

- El navegador llama a `/api/*`; `next.config.ts` lo reescribe a `${NEXT_PUBLIC_API_URL}/api/*`
  (el backend NestJS en :3001). Nunca se usa la URL del backend en código de cliente.
- Solo el código de **servidor** llama al backend directo: `src/lib/api/server-fetch.ts`.
- El backend responde `{ success: true, data }` o `{ success: false, error: { message, code } }`.
  Los helpers desenvuelven `data` y convierten el error en `ApiError`.

## Directory Structure

- `src/app/` — rutas (App Router). Hoy solo la portada; cada ruta que pida datos lleva su
  `error.tsx`.
- `src/components/ui/` — primitivos reutilizables (`data-table/`: tabla genérica de TanStack).
- `src/components/svg/` — íconos como componentes (`icon-conventions.md`); se crea con el primero.
- `src/features/<feature>/components/` — lo propio de cada feature (columnas, tabla, badges);
  todavía no hay features.
- `src/lib/api/` — `api-error.ts` (`ApiError`, `toUserMessage`), `server-fetch.ts`
  (`serverFetch`, `serverFetchResult`, `dataOrNotFound`), `fetch-wrapper.ts`
  (`get/post/put/patch/del`).
- `src/lib/env.ts` — `clientEnv`: variables públicas validadas con Zod al cargar.
- `src/lib/utils.ts` — `cn()` (clsx + tailwind-merge).
- `src/types/api.ts` — formas de respuesta de cada endpoint (se crea con el primero).
- `src/test/setup.ts` — setup de Vitest (`@testing-library/jest-dom`).

## Data Fetching

- **Server Components:** `serverFetch<T>()` (null ante error) o `serverFetchResult<T>()` +
  `dataOrNotFound()` cuando hay que distinguir 404 de "el API falló" (eso último cae en
  `error.tsx`).
- **Client Components:** helpers `get/post/put/patch/del`; errores con
  `toUserMessage(error, fallback)` — el fallback es el texto que se ve en 5xx, 429,
  `VALIDATION_ERROR` e `INTERNAL_ERROR`.
- Sin Server Actions.

## Design System

**Paleta cerrada:** `src/app/theme.css` borra la paleta de Tailwind y define solo
`primary` (azul `#003cde`), `secondary` (cian `#00e0ff`), `navy` (azul marino `#11153d`),
`surface` (grises), `white`, `black` y los estados `success`/`warning`/`error`. `src/app/globals.css`
agrega los tokens semánticos (`background`, `foreground`, `card`, `muted`, `border`, `ring`, `link`…)
que cambian solos en **dark mode azul marino** (`prefers-color-scheme`). `src/app/palette.test.ts`
falla ante cualquier color fuera de la paleta. Grilla de 8px, transiciones de 200ms. Tablas de
familias, tokens y contraste en `.claude/rules/component-conventions.md`.

## Commands

```bash
pnpm --filter @vm/frontend dev         # :3000
pnpm --filter @vm/frontend build
pnpm --filter @vm/frontend typecheck   # next typegen && tsc --noEmit
pnpm --filter @vm/frontend test        # vitest run
```

## Testing

**Qué** se testea: `docs/testing.md`. **Cómo**: Vitest (`vitest.config.ts`, jsdom, alias `@`) +
RTL. Hoy son tests de lógica del contrato con el backend (`api-error`, `fetch-wrapper`,
`server-fetch`) y la guarda de la paleta (`palette.test.ts`), sin tests de componente.

⚠️ **Vitest no corre con el `node` de WSL** contra este `node_modules` (instalado para win32: falta
el binding nativo de linux). Desde WSL se delega al Node de Windows:
`cmd.exe /c "cd /d <ruta Windows>\apps\frontend && node_modules\.bin\vitest.CMD run"`.
`tsc --noEmit` y `eslint` sí corren con el node de WSL.

## Do's and Don'ts

| DO                                                                  | DON'T                                                 |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| Llamar al backend vía `/api/*` (rewrite)                            | Usar la URL del backend en el cliente                 |
| `serverFetch` / `serverFetchResult` en Server Components            | `fetch()` crudo al backend                            |
| `get/post/put/patch/del` para pedidos de cliente                    | Manejar `response.ok` y parsear el error a mano       |
| Mostrar errores con `toUserMessage(error, fallback)`                | Mostrar el JSON, el status o la URL del error         |
| Escribir un fallback que sirva como texto final                     | Tratarlo como decorativo (en 5xx/429 es el que se ve) |
| `react-hook-form` + `zodResolver` con schemas de `@vm/shared-types` | `useState` por campo o schemas Zod inline             |
| Íconos desde `@/components/svg/`                                    | `<svg>` inline o librerías de íconos                  |
| Columnas de TanStack con referencia estable                         | Columnas recreadas en cada render                     |
| `'use client'` solo en las hojas que lo necesitan                   | Server Actions (`'use server'`)                       |
| Tokens semánticos (`bg-card`, `text-muted-foreground`)              | Escala + `dark:` para superficies y texto genérico    |
| Colores de `theme.css` (`primary-*`, `navy-*`…)                     | `zinc-*`, `bg-[#…]`, hex o `rgb()` en TS (no existen) |
| Cian (`secondary-*`) como acento o fondo                            | Cian como texto sobre fondo claro (1.6:1)             |
