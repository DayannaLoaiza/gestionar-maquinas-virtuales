# Next.js 16 Patterns — apps/frontend

## Data Fetching Strategy

- **No Server Actions** (`'use server'`) — all data flows through API endpoints.
- `next.config.ts` rewrites `/api/:path*` to the NestJS backend: the browser never calls Nest
  directly (no CORS in the browser path, one origin).
- Only **server** code calls the backend directly (the rewrite exists for the browser):
  `server-fetch.ts` builds the URL with `NEXT_PUBLIC_API_URL`.

## Client Components

Usar los helpers `get/post/put/patch/del` de `@/lib/api/fetch-wrapper`: parsean el JSON,
desenvuelven `data` del sobre `{ success, data }` y **lanzan `ApiError`** (con `status` y `code`)
ante un status de error, que es lo que permite a `toUserMessage` decidir qué mostrar.

- Never use bare `fetch()` with manual `response.ok` handling in a screen: queda fuera de la
  política de `toUserMessage`.
- **`401`: no hay refresh token** (spec `auth`, "Duración de la sesión"). Un `401` de un pedido del
  navegador, salvo el login, lleva a `/login?aviso=sesion-expirada` con una carga completa, una sola
  vez aunque haya varios simultáneos (`handleSessionExpired`, RF-auth-26), y sigue lanzando
  `ApiError`. Donde un `401` solo significa "no hay sesión" (la verificación de `/login`):
  `get(path, { onUnauthorized: 'ignore' })`. `notify.apiError` ignora los `UNAUTHENTICATED`.

## Server Components

- `serverFetch<T>()` de `@/lib/api/server-fetch`: arma la URL, parsea el JSON, desenvuelve `data` y
  devuelve `null` ante cualquier error.

  ```ts
  const result = await serverFetch<ThingsResponse>('/api/things?pageSize=100');
  ```

- Cuando la página tiene que distinguir "no existe / sin acceso" de "el API falló", usar
  `serverFetchResult<T>()` (`{ ok, data } | { ok: false, status }`) con
  `dataOrNotFound(result, mensaje)`: 400/403/404 → `notFound()` (se responden igual para no revelar
  qué existe), el resto → `throw`, que atrapa el `error.tsx` de la ruta (con botón de reintentar).
- `serverFetch` y `serverFetchResult` reenvían la cabecera `cookie` del pedido de la página (la
  sesión), solo a `NEXT_PUBLIC_API_URL` (RF-app-shell-15): ningún otro camino servidor → API arma
  cookies a mano. Leen `headers()` **fuera** de su `try/catch`: en el prerender, `headers()` lanza
  a propósito para volver dinámica la ruta, y atraparlo rompería esa señal.
- **Sesión en cada página del panel:** la primera línea es `await requireUser()` (o
  `await requireAdmin()` si es solo de Administrador) de `@/lib/auth/session`. El layout no alcanza:
  no se vuelve a renderizar al navegar ni impide que la página llegue en el RSC (guía de
  autenticación de Next 16). `src/app/(panel)/session-guard.test.ts` falla si una página lo olvida.
  `requireUser()` redirige a `/login` sin sesión y lanza si la API no responde (lo atrapa
  `app/error.tsx`, nunca el login).
- Un `Set-Cookie` que la API mande a un pedido de servidor (la renovación de la sesión) **no llega
  al navegador**: un Server Component no escribe cookies. Por eso `proxy.ts` pregunta antes por la
  sesión y reenvía la renovación (RF-auth-27); cuando la página llama a la API, ya no hay nada que
  renovar.
- `<Suspense fallback={<TableSkeleton />}>` (o el skeleton de `components/feedback/` que tenga la
  forma del contenido) alrededor de hijos async.
- React `cache()` solo para que dos piezas del mismo request (p. ej. `generateMetadata` y la
  página) compartan un pedido.
- **Datos que el cliente va a mutar (VMs): TanStack Query.** El Server Component los precarga con un
  `QueryClient` nuevo (`queryClient.query(…).catch(…)`, porque `prefetchQuery` está deprecado) y los
  pasa con `HydrationBoundary`, dentro de un `Suspense` con skeletons (`VmsPrefetch`). Un Client
  Component **fuera** de ese `Suspense` no lee esa query: en el servidor la crearía vacía antes de
  hidratarla y el HTML saldría sin datos (error de hidratación).
- **Librerías solo de navegador (Recharts):** `next/dynamic` con `ssr: false` desde un Client
  Component (`lazy-loading.md` de Next), con el skeleton como `loading`.
- **Datos de un layout que la página no necesita esperar:** pasar la **promesa** sin `await` a un
  Client Component y leerla con `use()` dentro de su propio `Suspense`; resolverla a `null` ante un
  error en vez de dejarla rechazar.
- `redirect()` en una página bajo un `loading.tsx` llega como 200 con
  `<meta http-equiv="refresh">` en una carga completa (el shell ya se mandó): es el comportamiento
  documentado de streaming, no un error.

## TanStack Table

- La tabla genérica es `components/ui/data-table/data-table.tsx` (orden, búsqueda global,
  paginación en cliente): cada feature le pasa sus columnas y datos.
- Column definitions need a **stable reference**: a module-level `const` (en el
  `components/columns.tsx` de la feature) or, inside a component, `useMemo(() => [...], [])` with
  **empty** deps. Callbacks or unstable values in the deps cause infinite re-renders.
- `ColumnDef` contienen funciones: no cruzan de Server a Client Component. Un wrapper
  `'use client'` de la feature (p. ej. `things-table.tsx`) es dueño de las columnas y renderiza
  `DataTable`.
- En las celdas, `row.original` para acceso tipado.
- `useReactTable` lleva un `eslint-disable` intencional de `react-hooks/incompatible-library`
  (TanStack Table v8 no es compatible con React Compiler).

## Rendering Strategy

- Datos siempre frescos: `serverFetch` usa `cache: 'no-store'` y lee las cookies del pedido, así
  que la ruta que lo llama es dinámica. No tiene `revalidate`: toda respuesta de la API depende de
  la sesión (RF-auth-06) y la Data Cache podría servírsela a otra persona. Si algún día existe un
  endpoint público y cacheable, va en una función aparte, sin cookies.

## Rutas y layouts

- `app/layout.tsx` (raíz): `<html lang="es">`, la fuente, el `<script>` inline del tema en el
  `<head>` (`THEME_INIT_SCRIPT`, con `suppressHydrationWarning` en `<html>`), `ThemeSync` y
  `Toaster`. No lleva shell.
- `app/(panel)/`: las páginas dentro del shell (`AppShell`). Una sección nueva crea su página acá y
  se agrega a `NAV_SECTIONS` (`src/config/navigation.ts`). Su layout monta `AuthProvider`,
  `QueryProvider` y `RealtimeProvider` (una conexión de tiempo real por pestaña, que sobrevive a la
  navegación entre páginas del panel).
- `app/not-found.tsx`: el 404 de toda ruta inexistente, fuera del shell.
- `app/error.tsx`: la API caída, con "Reintentar" (`retry()`). Está en la raíz porque una boundary no
  envuelve al layout de su mismo segmento, y la falla puede venir de `(panel)/layout.tsx`.
- `app/(auth)/`: el login (`/login`), fuera del shell, con su `AuthProvider` vacío.
- **Estado de autenticación:** `(panel)/layout.tsx` monta `AuthProvider` con el usuario de
  `requireUser()`; los Client Components lo leen con `useAuthStore(selector)`. Nunca un store de
  Zustand global (en el servidor se compartiría entre pedidos) y nunca leído desde un Server
  Component (ahí, `requireUser()`).

## Dynamic route params

- Los `params` y `searchParams` son asíncronos (`await params`).
- **Llegan codificados** (`encodeURIComponent`): decodificar **una vez** antes de validar. Con UUID
  no se nota.

## Proxy (antes `middleware`)

- En Next 16 `middleware.ts` se llama **`proxy.ts`** (`src/proxy.ts`), con runtime Node.
- Con cookie, y salvo en los prefetch (`matcher` con `missing`), pregunta a `/api/auth/me` para dos
  cosas: reenviar al navegador la renovación de la cookie y llevar al Panel a quien abre `/login`
  con sesión.
- **No protege rutas ni le pasa el usuario a la página.** Eso lo hace `requireUser()` en cada
  página: `proxy` no debe ser la única defensa, y si se salteara, una cabecera con el usuario la
  podría mandar cualquiera. No agregar acá redirecciones de rutas privadas ni gating por rol.
- Los parámetros de redirección se validan contra open redirect (empiezan con `/`, sin `//` ni
  `://`).

## Imports & Aliases

- `@/` para todo import local (mapeado en `tsconfig.json`).
- Tipos y schemas compartidos: `import { … } from '@vm/shared-types'`.
- Formas de respuesta de los endpoints: `src/types/api.ts`.
- `typedRoutes` está activo: un `Link href` tiene que apuntar a una ruta existente.
