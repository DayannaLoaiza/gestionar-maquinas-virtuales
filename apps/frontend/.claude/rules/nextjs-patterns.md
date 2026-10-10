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
- Cuando exista autenticación, el refresh del token en 401 va dentro de `fetch-wrapper`
  (`authenticatedFetch`, con los 401 concurrentes encolados en un único refresh).

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
- Cuando exista autenticación, `serverFetch` reenvía las cookies de sesión: ningún otro camino
  servidor → API las arma a mano.
- `<Suspense fallback={<Skeleton />}>` alrededor de hijos async.
- React `cache()` solo para que dos piezas del mismo request (p. ej. `generateMetadata` y la
  página) compartan un pedido.
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

- Datos mutables: siempre frescos. `serverFetch` usa `next: { revalidate: 0 }` por defecto (sin
  Data Cache), y eso hace dinámica la ruta. Si alguna vez una página de solo lectura tolera datos viejos, documentar acá su
  `revalidate`.

## Dynamic route params

- Los `params` y `searchParams` son asíncronos (`await params`).
- **Llegan codificados** (`encodeURIComponent`): decodificar **una vez** antes de validar. Con UUID
  no se nota.

## Proxy (antes `middleware`)

- En Next 16 `middleware.ts` se llama **`proxy.ts`** (`src/proxy.ts`). Hoy no existe.
- Cuando haya autenticación: redirecciones de auth, refresh automático, gating por rol de
  `/admin/*`. No duplicar los chequeos de auth en las páginas.
- Los parámetros de redirección se validan contra open redirect (empiezan con `/`, sin `//` ni
  `://`).

## Imports & Aliases

- `@/` para todo import local (mapeado en `tsconfig.json`).
- Tipos y schemas compartidos: `import { … } from '@vm/shared-types'`.
- Formas de respuesta de los endpoints: `src/types/api.ts`.
- `typedRoutes` está activo: un `Link href` tiene que apuntar a una ruta existente.
