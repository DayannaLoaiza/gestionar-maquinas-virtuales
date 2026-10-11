# apps/frontend — Next.js (`@vm/frontend`)

Aplica también el `CLAUDE.md` raíz y `docs/constitution.md`, que manda sobre todo lo de este
archivo. El detalle de cada convención está en `.claude/rules/` (carga junto con este archivo).

## Stack

Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, TanStack Table 8, Zod 4 (vía
`@vm/shared-types`), shadcn/ui sobre Radix UI (`radix-ui`), `class-variance-authority`,
`tw-animate-css`, `sonner`, Zustand 5 (sesión y modales), TanStack Query 5 (estado de las VMs),
Recharts 3 (panel de recursos, cargado en diferido), `socket.io-client` 4 (tiempo real),
`react-hook-form` + `@hookform/resolvers`, fuente Archivo (`next/font`), Vitest + React Testing
Library.

## API Communication

- El navegador llama a `/api/*`; `next.config.ts` lo reescribe a `${NEXT_PUBLIC_API_URL}/api/*`
  (el backend NestJS en :3001). Nunca se usa la URL del backend en código de cliente.
- Solo el código de **servidor** llama al backend directo: `src/lib/api/server-fetch.ts`, que
  reenvía las cookies del pedido de la página (la sesión) y nunca cachea.
- La cookie de sesión es `HttpOnly`: el cliente nunca la lee ni guarda el token. Los pedidos del
  navegador van con `credentials: 'include'` (RF-app-shell-14).
- El backend responde `{ success: true, data }` o `{ success: false, error: { message, code } }`.
  Los helpers desenvuelven `data` y convierten el error en `ApiError`.
- **Sesión** (spec `auth`, RF-auth-17…34): sin refresh token. Un `401` en el navegador lleva a
  `/login?aviso=sesion-expirada` con una carga completa. `src/proxy.ts` reenvía la renovación de la
  cookie que pediría un Server Component; cada página del panel verifica la sesión con
  `requireUser()` (`nextjs-patterns.md`).

## Directory Structure

- `src/app/` — rutas (App Router). `layout.tsx` (raíz: fuente, script del tema, `ThemeSync`,
  `SessionSync`, `Toaster`), `not-found.tsx` (404 fuera del shell), `error.tsx` (la API caída, con
  "Reintentar"), el grupo `(auth)/` (`/login`, fuera del shell) y el grupo `(panel)/` (layout con
  `AuthProvider`, `QueryProvider`, `RealtimeProvider` y el shell; el Panel en `/` con el panel de
  recursos y las VMs; cada página empieza con `await requireUser()`).
- `src/proxy.ts` — con cookie, pregunta a `/api/auth/me`: reenvía la renovación de la cookie y lleva
  al Panel desde `/login` con sesión. No protege rutas.
- `src/components/ui/` — primitivos de shadcn adaptados (`button`, `input`, `label`,
  `native-select`, `switch`, `dialog`, `alert-dialog`, `dropdown-menu`, `sheet`, `skeleton`,
  `empty`, `status-badge`, `sonner` + `toast.ts`) y `data-table/` (tabla genérica de TanStack).
- `src/components/feedback/` — listos para las features: `EmptyState`, `CardGridSkeleton`,
  `TableSkeleton`, `ChartSkeleton`.
- `src/components/layout/` — el shell: `AppShell`, `AppSidebar`, `AppHeader`, `MobileNav`,
  `NavLinks`, `SkipLink`, `PageHeader`, `Brand`; y `StandalonePage` (404, error y login).
- `src/components/auth/` — `AuthProvider` (un store de Zustand por árbol), `useAuthStore`,
  `AdminOnly` (controles solo de Administrador) y `SessionSync` (recarga ante login o logout en
  otra pestaña).
- `src/components/theme/` — `ThemeSync`, `ThemeToggle`, `useTheme`.
- `src/components/providers/` — `QueryProvider` (el `QueryClient` de `getQueryClient`).
- `src/components/realtime/` — `RealtimeProvider` (una conexión por pestaña, en el layout del
  panel), `RealtimeIndicator`, `useRealtimeStatus` y `useVmHighlight` (`realtime-context.ts`).
- `src/components/svg/` — íconos de Tabler como componentes (`icon-conventions.md`).
- `src/config/` — `navigation.ts` (secciones de la barra lateral, `NAV_SECTIONS`; cada feature agrega
  la suya al crear su página), `auth.ts` (avisos y textos de error del login) y
  `security-headers.ts` (cabeceras de las páginas, que aplica `next.config.ts`).
- `src/features/<feature>/` — lo propio de cada feature. Hoy: `features/auth/` (formulario y
  avisos del login, menú de la persona), `features/vms/` (`components/`: Panel, tarjetas,
  formularios y modales; `hooks/`: `useVisibleVms` y las mutaciones optimistas; `store/`: los
  modales, con la reapertura de una creación fallida) y `features/resource-dashboard/`
  (indicadores y gráficos de Recharts).
- `src/schemas/` — schemas de formulario solo del frontend: `vm-form.ts` (números como texto, nombre
  único, `buildUpdatePayload`).
- `src/lib/auth/` — `auth-store.ts` (store de Zustand: `login`, `logout`, `checkSession`),
  `session.ts` (`requireUser`, `requireAdmin`; solo servidor), `auth-user.ts` (`isAuthUser`,
  `isAdmin`), `proxy-session.ts`, `session-navigation.ts` (`goToLogin`, `handleSessionExpired`) y
  `session-channel.ts` (aviso entre pestañas).
- `src/lib/theme/` — preferencia de tema, script inicial (`THEME_INIT_SCRIPT`) y store.
- `src/lib/query/` — `getQueryClient()`: uno por pedido en el servidor y uno por pestaña en el
  navegador.
- `src/lib/vms/` — el estado de las VMs: `vm-versions` (gana el `updatedAt` más nuevo),
  `pending-changes` (`deriveVisibleVms`: confirmadas + pendientes), `vm-cache`, `vms-query`,
  `vms-api`, `vms-server` (precarga del servidor) y `apply-vm-event`.
- `src/lib/realtime/` — `realtime-connection` (estados, resincronización, fin de sesión,
  reintentos), `realtime-socket` (opciones del contrato) y `vm-status-event` (guarda del evento).
- `src/lib/resource-dashboard/` — `summarizeResources` y `rankContributions`.
- `src/lib/format.ts` — números en `es` (`formatInteger`, `formatGb`, `formatShare`).
- `src/lib/api/` — `api-error.ts` (`ApiError`, `toUserMessage`), `server-fetch.ts`
  (`serverFetch`, `serverFetchResult`, `dataOrNotFound`), `fetch-wrapper.ts`
  (`get/post/put/patch/del`, con `onUnauthorized`).
- `src/lib/env.ts` — `clientEnv`: variables públicas validadas con Zod al cargar.
- `src/lib/utils.ts` — `cn()` (clsx + tailwind-merge).
- `src/types/api.ts` — formas de respuesta de cada endpoint (`VmListResponse`, `VmItemResponse`;
  las respuestas de sesión entran como `unknown` y se validan con `isAuthUser`).
- `src/test/setup.ts` — setup de Vitest (`@testing-library/jest-dom` y `cleanup()` de RTL tras
  cada test).

## Data Fetching

- **Server Components:** `serverFetch<T>()` (null ante error) o `serverFetchResult<T>()` +
  `dataOrNotFound()` cuando hay que distinguir 404 de "el API falló" (eso último cae en
  `error.tsx`). Los dos reenvían las cookies del pedido, usan `cache: 'no-store'` y esperan como
  mucho 10 s (pasado eso, cuentan como API caída). El usuario de
  la sesión, con `requireUser()` (`@/lib/auth/session`), nunca leyendo el store.
- **Client Components:** helpers `get/post/put/patch/del`; errores con
  `toUserMessage(error, fallback)` — el fallback es el texto que se ve en 5xx, 429,
  `VALIDATION_ERROR` e `INTERNAL_ERROR`.
- **VMs: TanStack Query.** El Panel precarga `['vms']` en el servidor (`VmsPrefetch` +
  `HydrationBoundary`) y el cliente lo lee con `useVisibleVms()`. La caché guarda solo versiones
  confirmadas; las mutaciones (`useCreateVm`, `useUpdateVm`, `useDeleteVm`, `mutationKey: ['vms']`)
  se dibujan encima mientras esperan respuesta, y al terminar escriben la versión del servidor e
  invalidan el listado. Nunca `onMutate` + restaurar una copia de la lista.
- Sin Server Actions.

## Design System

**Paleta cerrada:** `src/app/theme.css` borra la paleta de Tailwind y define solo
`primary` (azul `#003cde`), `secondary` (cian `#00e0ff`), `navy` (azul marino `#11153d`),
`surface` (grises), `white`, `black` y los estados `success`/`warning`/`error`. `src/app/globals.css`
agrega los tokens semánticos (`background`, `foreground`, `card`, `muted`, `border`, `ring`, `link`…)
que cambian solos en **dark mode azul marino**. `src/app/palette.test.ts` falla ante cualquier color
fuera de la paleta. Grilla de 8px, transiciones de 200ms, tipografía Archivo (títulos
semi-expandidos: `font-stretch-semi-expanded`). Tablas de familias, tokens y contraste en
`.claude/rules/component-conventions.md`.

**Tema (Claro / Oscuro / Sistema).** El modo oscuro es la clase `dark` de `<html>`, no la media
query: `@custom-variant dark` hace que `dark:` siga la elección. `THEME_INIT_SCRIPT` (inline en el
`<head>`) la pone antes del primer pintado, desde `localStorage['vm-theme']`; `ThemeSync` la
mantiene al día (otras pestañas, sistema operativo). Para leer o cambiar el tema: `useTheme()`.

## Commands

```bash
pnpm --filter @vm/frontend dev         # :3000
pnpm --filter @vm/frontend build
pnpm --filter @vm/frontend typecheck   # next typegen && tsc --noEmit
pnpm --filter @vm/frontend test        # vitest run
```

## Testing

**Qué** se testea: `docs/testing.md`. **Cómo**: Vitest (`vitest.config.ts`, jsdom, alias `@`) +
RTL. Hoy hay:

- tests de lógica del contrato con el backend (`api-error`, `fetch-wrapper`, `server-fetch`), de la
  sesión (`auth-store`, `session`, `session-channel`, `proxy`) y de las cabeceras
  (`security-headers`);
- tests de componente, solo para RF Críticos de UI (`AdminOnly`, `AuthProvider`, `LoginForm`,
  `VmCard`);
- tests de hooks con un `QueryClient` real (`renderHook` + `src/test/query-test-utils.tsx`) y la red
  falsa de `src/test/api-test-utils.ts`; la conexión de tiempo real con `src/test/fake-socket.ts`;
- el script inicial del tema (`theme-script.test.ts`);
- las guardas estructurales de la paleta (`palette.test.ts`) y de la sesión en cada página del panel
  (`(panel)/session-guard.test.ts`).

Los bordes se mockean así: `next/navigation`, `next/headers` y `server-only` con `vi.mock`; la red
con `vi.stubGlobal('fetch', …)`; la navegación con `vi.stubGlobal('location', { replace })`. Un
test con `next/server` (`proxy.test.ts`) corre con `// @vitest-environment node`.

⚠️ **Vitest no corre con el `node` de WSL** contra este `node_modules` (instalado para win32: falta
el binding nativo de linux). Desde WSL se delega al Node de Windows:
`cmd.exe /c "cd /d <ruta Windows>\apps\frontend && node_modules\.bin\vitest.CMD run"`.
`tsc --noEmit` y `eslint` sí corren con el node de WSL.

## Do's and Don'ts

| DO                                                                      | DON'T                                                            |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Llamar al backend vía `/api/*` (rewrite)                                | Usar la URL del backend en el cliente                            |
| `serverFetch` / `serverFetchResult` en Server Components                | `fetch()` crudo al backend                                       |
| `get/post/put/patch/del` para pedidos de cliente                        | Manejar `response.ok` y parsear el error a mano                  |
| Mostrar errores con `toUserMessage(error, fallback)`                    | Mostrar el JSON, el status o la URL del error                    |
| Escribir un fallback que sirva como texto final                         | Tratarlo como decorativo (en 5xx/429 es el que se ve)            |
| `react-hook-form` + `zodResolver` con schemas de `@vm/shared-types`     | `useState` por campo o schemas Zod inline                        |
| Íconos desde `@/components/svg/`                                        | `<svg>` inline o librerías de íconos                             |
| Columnas de TanStack con referencia estable                             | Columnas recreadas en cada render                                |
| `'use client'` solo en las hojas que lo necesitan                       | Server Actions (`'use server'`)                                  |
| Tokens semánticos (`bg-card`, `text-muted-foreground`)                  | Escala + `dark:` para superficies y texto genérico               |
| Colores de `theme.css` (`primary-*`, `navy-*`…)                         | `zinc-*`, `bg-[#…]`, hex o `rgb()` en TS (no existen)            |
| Cian (`secondary-*`) como acento o fondo                                | Cian como texto sobre fondo claro (1.6:1)                        |
| Toasts con `notify` (`@/components/ui/toast`)                           | `toast` de `sonner` directo                                      |
| `EmptyState` y los skeletons de `@/components/feedback/`                | Estados vacíos o de carga armados a mano por pantalla            |
| Leer el tema con `useTheme()`                                           | `localStorage['vm-theme']` o `matchMedia` a mano                 |
| `await requireUser()` en la primera línea de cada página del panel      | Confiar en el layout o en `proxy` para proteger                  |
| Usuario y rol desde `useAuthStore(selector)` o `requireUser()`          | Guardar el usuario o el token en el navegador                    |
| Controles de Administrador dentro de `AdminOnly`                        | Ocultarlos con CSS, `hidden` o `disabled` según rol              |
| Mutar VMs con los hooks de `features/vms/hooks/`                        | `setQueryData` optimista y revertir a una copia de la lista      |
| Leer las VMs con `useVisibleVms()` dentro del `Suspense` de la precarga | Leer la query `['vms']` fuera de ese `Suspense` (HTML sin datos) |
