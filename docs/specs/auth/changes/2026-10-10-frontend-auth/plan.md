# Plan — Frontend de `auth`: login, estado global, rutas privadas y roles en la UI (auth)

Spec: `docs/specs/auth/spec.md` · Añade: RF-auth-17…34, RNF-auth-09…13 · Modifica: RF-app-shell-01
y 03 (texto, spec `app-shell`) · Retira: — · Constitución: v1.0.0

## Chequeo de constitución (puerta: antes de diseñar; se revisa en G2)

| ID  | Aplica | Cómo se cumple                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Solo se implementa lo de la spec aprobada (G1, 2026-10-10) y el delta tras el plan (RF-auth-26, 27), que se aprueba en G1 junto con esta G2                                                                                                                                                                                                                                                                                                                       |
| C2  | Sí     | El delta de RF-auth-26 y 27 ya está escrito en la spec, antes que el código. Si algo más la cambia durante la implementación, me detengo y vuelvo a G1 por ese delta                                                                                                                                                                                                                                                                                              |
| C3  | Sí     | No se toca `apps/` ni `packages/` hasta el "apruebo" de G2                                                                                                                                                                                                                                                                                                                                                                                                        |
| C4  | Sí     | Sin dudas abiertas. Las decisiones técnicas (D1–D11) quedan en este plan y se aprueban en G2                                                                                                                                                                                                                                                                                                                                                                      |
| C5  | Sí     | Se reportan: el error de mi análisis en "Descartado" (F9, corregido en el delta de la spec); `nextjs-patterns.md` con refresh token inexistente y `proxy.ts` "hoy no existe"; `forms-conventions.md` sin la excepción de `window.location`; `component-imports.md` sin `Input` ni `Label`. Las reglas se corrigen en T9                                                                                                                                           |
| C6  | Sí     | Un test por RF Crítico (13), según la tabla de abajo; RF-auth-27 además con verificación manual. Ningún test para un Estándar. No se retira ni se reescribe ningún test                                                                                                                                                                                                                                                                                           |
| C7  | No     | Sin cambios en el backend                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| C8  | Sí     | Ver "Seguridad y permisos": `LoginDTO` en el cliente, `isAuthUser` sobre toda respuesta de sesión, verificación en cada página, cabeceras, credenciales nunca en la URL                                                                                                                                                                                                                                                                                           |
| C9  | Sí     | Sin `any`; funciones < 50 líneas; `'use client'` solo en el proveedor, el formulario, el menú de la persona, `AdminOnly`, `SessionSync`, la verificación de `/login` y `error.tsx`                                                                                                                                                                                                                                                                                |
| C10 | Sí     | `LoginDTO`, `AuthUser`, `Role`, `ROLES` y `ROLE_VALUES` de `@vm/shared-types`, sin redefinirlos; sin imports entre apps                                                                                                                                                                                                                                                                                                                                           |
| C11 | Sí     | Consultados el 2026-10-10 y 11: con Context7, Zustand (guía de Next.js), `@hookform/resolvers` (Zod 4 y transformaciones), Next 16 (autenticación, `cookies()`, CSP, caché del cliente, `poweredByHeader`, `headers()`), OWASP Cheat Sheets y MDN; los docs de `next` 16.4 en `node_modules/next/dist/docs/` (`proxy.md`: runtime Node, `matcher` con `missing`, cabeceras RSC; `error.md`: `retry`, alcance de la boundary); npm (versiones, fechas y peer deps) |
| C12 | No     | Sin secretos ni variables de entorno nuevas: `proxy` usa la `NEXT_PUBLIC_API_URL` que ya existe                                                                                                                                                                                                                                                                                                                                                                   |

Sin excepciones técnicas.

## Enfoque

### Arquitectura

```text
Navegador                         Servidor de Next                                API (sin cambios)
─────────                         ────────────────                                ─────────────────
pedido de página ──────────────▶  proxy.ts  (si hay cookie, salvo prefetch)
                                    │  GET /api/auth/me ─────────────────────────▶ guard: valida y
                                    │  ◀──────── 200 / 401 + Set-Cookie si renovó ─  renueva (≤ 1 c/5 min)
  ◀──── Set-Cookie reenviado ───────┤  /login con sesión válida → 307 a /
                                    ▼
                                  (panel)/layout.tsx y cada page.tsx
                                    requireUser()  ── cache() ── GET /api/auth/me ▶  (sin renovar: el
                                      401 / mal formado → redirect('/login')          proxy acaba de
                                      5xx / red        → throw → app/error.tsx        renovar)
                                    ▼
  ◀──── HTML + RSC con el usuario ── <AuthProvider initialUser={user}>  (un store de Zustand por árbol)

fetch-wrapper (navegador → /api/* por el rewrite)
  401 → handleSessionExpired(): una sola vez, carga completa de /login?aviso=sesion-expirada
login / logout → BroadcastChannel('vm-session') → las demás pestañas recargan
```

### D1. Dónde se verifica la sesión (RF-auth-24, 25, 31; hallazgo F6)

- **`src/lib/auth/session.ts`** (`server-only`), la capa de acceso a datos de la guía de
  autenticación de Next 16:
  - `getCurrentUser()`: `cache()` de React sobre
    `serverFetchResult<AuthUserResponse>('/api/auth/me')` (reenvía la cookie, `no-store`). Así el
    layout y la página de un mismo pedido comparten una sola llamada.
  - `requireUser()`: respuesta válida y `isAuthUser` → el usuario; `401` o forma inesperada →
    `redirect('/login')`; cualquier otra falla → `throw`, que atrapa `app/error.tsx`.
  - `requireAdmin()`: `requireUser()` y, si no es Administrador, `notFound()` (RF-auth-31, D2 de
    G1).
- **Quién la llama:** `(panel)/layout.tsx` (para darle el usuario al proveedor en la carga completa)
  y la primera línea de **cada** `(panel)/**/page.tsx`. El layout no se vuelve a renderizar al
  navegar (doc de Next), así que la página es la que protege la navegación. Un test estructural
  falla si una página del panel no llama a `requireUser()` o `requireAdmin()`.
- **`src/app/error.tsx`** (`'use client'`, fuera del shell): "No pudimos verificar tu sesión" y un
  botón "Reintentar" con `retry()` (estable desde Next 16.3). Va en la raíz porque una boundary no
  envuelve al layout de su mismo segmento (`error.md`), y la falla puede venir de
  `(panel)/layout.tsx`.

### D2. `proxy.ts`: renovación y rebote de `/login` (RF-auth-27, 21; hallazgo F9)

- **`src/proxy.ts`**, runtime Node (el de por defecto en Next 16). `matcher`: las páginas (excluye
  `api`, `_next/static`, `_next/image` y archivos con extensión), con `missing` para las cabeceras
  `next-router-prefetch` y `purpose: prefetch`: los prefetch no llaman a la API.
- **Lógica**, en funciones puras de `src/lib/auth/proxy-session.ts`:
  1. Sin cabecera `cookie` → sigue sin llamar a la API.
  2. Con cookie → `GET ${NEXT_PUBLIC_API_URL}/api/auth/me` con esa cabecera, `cache: 'no-store'` y
     un tiempo máximo de 5 s.
  3. Cada `Set-Cookie` de esa respuesta (`headers.getSetCookie()`) se copia a la respuesta de la
     página: así la renovación llega al navegador (RF-auth-27).
  4. En `/login`, con `200` → redirección a `/`, con los `Set-Cookie` (parte de servidor de
     RF-auth-21).
  5. `401`, error o tiempo agotado → sigue sin redirigir. Decide la página (D1).
- **Lo que `proxy` no hace, a propósito:**
  - No redirige las rutas privadas sin sesión: lo hace `requireUser()`. Así una ruta inexistente
    sigue dando la 404 de `app-shell` (RF-app-shell-12) y no hace falta una lista de rutas privadas
    que se desactualice.
  - No le pasa el usuario a la página por una cabecera: si `proxy` se saltea (el caso
    CVE-2025-29927), un atacante podría mandar esa cabecera. La página siempre pregunta a la API.
- **Por qué la página no reemite la renovación:** cuando la página llama a `/me`, `proxy` acaba de
  renovar, así que la API no vuelve a renovar (≤ 1 vez cada 5 min) y no se pierde ningún token. El
  token que trae el pedido sigue valiendo hasta su propio vencimiento.
- **Costo:** por página pedida con cookie, una llamada a `/me` en `proxy` y otra en la página (las
  del layout y la página se deduplican). `/me` es una lectura indexada de la sesión, igual que la
  que ya hace el guard en todo endpoint. Prefetch y visitantes sin cookie: ninguna.

### D3. Estado de autenticación con Zustand (RF-auth-22, 23; RNF-auth-09, 10)

- **`src/lib/auth/auth-store.ts`:** `createAuthStore(initialUser)` con `createStore` de
  `zustand/vanilla` (guía de Next.js). Estado `{ user: AuthUser | null }` y tres acciones con los
  nombres del pedido:
  - `login(credentials: LoginDTO)` → `post('/api/auth/login')`; solo guarda el usuario si pasa
    `isAuthUser` (si no, lanza y el estado queda vacío);
  - `logout()` → D5;
  - `checkSession(options)` → `get('/api/auth/me')`; guarda el usuario o `null`.
  - Selectores: `selectUser`, `selectRole`, `selectIsAuthenticated` (`user !== null`, derivado).
  - Sin `persist`: nada sale de la memoria.
- **`src/lib/auth/auth-user.ts`:** `isAuthUser(value)` (id y email strings, rol de `ROLE_VALUES`) e
  `isAdmin(user)`. Puras; las usan el store, la capa de datos y `AdminOnly`.
- **`src/components/auth/auth-provider.tsx`** (`'use client'`): crea el store con
  `useState(() => createAuthStore(initialUser))`, uno por montaje y por pedido (RF-auth-23), y lo
  expone por contexto. `useAuthStore(selector)` (`use-auth-store.ts`) falla fuera del proveedor.
  Ningún Server Component lee el store: usan `requireUser()`.
- **Dos proveedores:** `(panel)/layout.tsx` con el usuario verificado en el servidor, y
  `(auth)/layout.tsx` con `null`. Al entrar al panel se monta un store nuevo con el usuario del
  servidor, sin pedidos extra desde el navegador ni diferencias de hidratación.
- **"Verificación de sesión al montar la aplicación"** (pedido): la hace el servidor antes del
  primer pintado (RF-auth-24) y el store nace con ese resultado. `checkSession` queda para la
  verificación desde el navegador de `/login` (RF-auth-21).

### D4. Página de login (RF-auth-17–21, 32; RNF-auth-11)

- **Rutas:** `src/app/(auth)/layout.tsx` (columna centrada, selector de tema, `AuthProvider` con
  `null`) y `src/app/(auth)/login/page.tsx` (metadata "Iniciar sesión"; lee `searchParams.aviso`).
- **`features/auth/components/login-form.tsx`** (`'use client'`):
  - `useForm` con `zodResolver(LoginDTO)` (los tipos se infieren: la transformación de `LoginDTO`
    es string → string), `mode: 'onBlur'`, `defaultValues` vacíos y `noValidate`;
  - `<form method="post">` y el botón deshabilitado hasta hidratar (`useSyncExternalStore`), con
    `isSubmitting` y con `isSubmitSuccessful`: antes de que cargue el JS no hay envío nativo, y si
    lo hubiera iría por POST, sin credenciales en la URL (RF-auth-32);
  - éxito → `announceSessionChange()` y `router.replace('/')` (RF-auth-19);
  - error → toast según el status (`LOGIN_ERROR_MESSAGES`, RF-auth-20), `resetField('password')`
    y `setFocus('password')`;
  - campos con `autocomplete` `email` y `current-password`, sin `maxLength` (un pegado largo da el
    error de campo, no se recorta).
- **`login-session-check.tsx`** (`'use client'`, sin interfaz): al montar,
  `checkSession({ onUnauthorized: 'ignore' })`; con usuario → `router.replace('/')`. Cubre la
  entrada desde otro sitio con `SameSite=Strict` (RF-auth-21, F4).
- **`login-notice.tsx`:** si `aviso` es un código de `LOGIN_NOTICES`
  (`src/config/auth.ts`: `sesion-expirada`, `sesion-cerrada`), muestra su texto fijo en un aviso
  dentro de la página (`role="status"`); si no, nada.
- **Primitivos nuevos** en `components/ui/`, copiados del registro de shadcn (`new-york-v4`) y
  traducidos a los tokens: `input.tsx` y `label.tsx`. Íconos de Tabler nuevos en
  `components/svg/`: `loader-2` (progreso del botón), `logout`, `user-circle` e `info-circle`.
- **Dirección visual** (la de `app-shell`: líneas en vez de sombras, una sola acción azul, Archivo
  semi-expandida en el título):

  ```text
  ┌──────────────────────────────────────────────┐
  │                                        [◐]   │
  │                                              │
  │        ◆ Gestor de VMs                       │
  │                                              │
  │        Inicia sesión                         │ ← h1 semi-expandido
  │        Accede al panel de tus máquinas       │
  │        virtuales.                            │
  │        ┌────────────────────────────────┐    │
  │        │ ⓘ Tu sesión expiró. Inicia…    │    │ ← aviso, solo con ?aviso= válido
  │        └────────────────────────────────┘    │
  │        Correo                                │
  │        [______________________________]      │
  │        Contraseña                            │
  │        [______________________________]      │
  │        [        Iniciar sesión        ]      │ ← primary-500, ancho completo
  └──────────────────────────────────────────────┘
   columna de 360 px máx., centrada; en 320 px, márgenes de 16 px
  ```

### D5. `401` y cierre de sesión (RF-auth-26, 29; hallazgo F3)

- **`src/lib/auth/session-navigation.ts`** (solo navegador): `goToLogin(notice)` →
  `window.location.replace('/login?aviso=<código>')`; `handleSessionExpired()` lo llama una sola
  vez por documento (bandera de módulo; la carga completa la reinicia).
- **`fetch-wrapper.ts`:** acepta `RequestOptions { onUnauthorized?: 'redirect' | 'ignore' }`. Ante
  un `401`, salvo en `/api/auth/login` o con `'ignore'`, llama a `handleSessionExpired()` y sigue
  lanzando `ApiError`, para que quien llamó no continúe. Las firmas actuales siguen valiendo (el
  parámetro es opcional).
- **`notify.apiError`** no muestra los `UNAUTHENTICATED`: el aviso de `/login` es el feedback, y un
  toast desaparecería con la recarga.
- **`logout()`:** `post('/api/auth/logout')` → `announceSessionChange()` →
  `goToLogin('sesion-cerrada')`. Si falla, lanza sin tocar el estado, y `UserMenu` muestra
  `No se pudo cerrar sesión. Revisa tu conexión e intenta de nuevo.` (texto que la spec deja al
  plan).
- **Excepción a `forms-conventions.md`** ("nunca `window.location`"): solo estas dos salidas, por
  seguridad (F3). Se documenta en la regla (T9).

### D6. Sincronización entre pestañas (RF-auth-33)

- **`src/lib/auth/session-channel.ts`:** un único `BroadcastChannel('vm-session')` por pestaña,
  creado al primer uso; mensaje constante `'session-changed'`, sin datos. `announceSessionChange()`
  y `subscribeSessionChange(onChange)` comparten esa instancia, así la pestaña que avisa no se
  recibe a sí misma (MDN).
- **`components/auth/session-sync.tsx`** (`'use client'`, en el layout raíz): ante el mensaje,
  `window.location.reload()`. Cada pestaña vuelve a verificar con la API: con la sesión nueva
  muestra al usuario nuevo; sin sesión, termina en `/login` (D1). Mensajes desconocidos se
  ignoran; sin `BroadcastChannel`, no hace nada (queda el comportamiento de RF-auth-25 y 26).

### D7. Roles en la UI (RF-auth-30, 31)

- **`components/auth/admin-only.tsx`** (`'use client'`): con la forma literal del pedido,
  `role === ROLES.ADMIN && children` (o `null`), con el rol de `useAuthStore(selectRole)`. Como el
  store nace con el usuario del servidor, el HTML del servidor ya sale sin el control para un
  Cliente o un rol desconocido.
- **En Server Components:** `isAdmin(await requireUser()) && <Control />`.
- **Rutas solo de Administrador:** `await requireAdmin()` en la primera línea de la página. Hoy no
  hay ninguna; las de crear y editar VM las agrega el frontend de `virtual-machines`.

### D8. Menú de la persona (RF-auth-28)

`features/auth/components/user-menu.tsx` (`'use client'`), en `AppHeader`, a la derecha del
selector de tema. Usa el `DropdownMenu` existente:

- disparador: ícono `user-circle`, con el correo visible desde `sm` y `aria-label` "Cuenta de
  <correo>";
- contenido: el correo, el rol, un separador y "Cerrar sesión" (ícono `logout`).

### D9. Cabeceras de seguridad (RF-auth-34; hallazgo F1, decisión F1)

- **`src/config/security-headers.ts`:** `buildSecurityHeaders({ isProduction })` devuelve:
  - `Content-Security-Policy: frame-ancestors 'none'`;
  - `X-Frame-Options: DENY`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - solo en producción, `Strict-Transport-Security: max-age=31536000; includeSubDomains` (el mismo
    valor que manda `helmet` en la API).
- **`next.config.ts`:** `poweredByHeader: false` y `headers()` con `source: '/((?!api/).*)'`. Las
  respuestas de `/api/*` siguen con las cabeceras de la API (RF-auth-10), sin duplicarlas.

### D10. Versiones (RNF-auth-09)

Exactas, con al menos dos semanas publicadas y peer deps compatibles con React 19 y Zod 4:

| Paquete               | Versión | Publicada  | Peer deps relevantes                                           |
| --------------------- | ------- | ---------- | -------------------------------------------------------------- |
| `zustand`             | 5.0.15  | 2026-08-13 | `react >=18` (`immer` y `use-sync-external-store`, opcionales) |
| `react-hook-form`     | 7.89.0  | 2026-09-26 | `react ^19`                                                    |
| `@hookform/resolvers` | 5.9.1   | 2026-08-17 | `react-hook-form ^7.55.0`, `zod ^3.25 \|\| ^4`                 |

**Instalación:** edito `apps/frontend/package.json` y verifico en el scratchpad (`pnpm install`,
`pnpm audit`, typecheck, lint, build). Tú corres `pnpm install` desde Windows, que actualiza
`pnpm-lock.yaml`.

### D11. Tipos de respuesta

`src/types/api.ts` (se crea con el primer endpoint, como dice `apps/frontend/CLAUDE.md`):
`AuthUserResponse = { user: AuthUser }`. Su forma se valida en tiempo de ejecución con
`isAuthUser`, nunca solo con el tipo.

## Cambios por paquete

| Paquete            | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vm/shared-types` | Ninguno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `@vm/backend`      | Ninguno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `@vm/frontend`     | Dependencias: `zustand` 5.0.15, `react-hook-form` 7.89.0, `@hookform/resolvers` 5.9.1. Nuevos: `src/proxy.ts`; `src/lib/auth/` (`auth-user`, `auth-store`, `session`, `proxy-session`, `session-navigation`, `session-channel`); `src/components/auth/` (`auth-provider`, `use-auth-store`, `admin-only`, `session-sync`); `src/features/auth/components/` (`login-form`, `login-notice`, `login-session-check`, `user-menu`); `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/error.tsx`; `src/config/auth.ts`, `src/config/security-headers.ts`; `src/types/api.ts`; `components/ui/input.tsx`, `label.tsx`; cuatro íconos. Cambian: `next.config.ts`, `app/layout.tsx` (`SessionSync`), `(panel)/layout.tsx` y `(panel)/page.tsx`, `components/layout/app-header.tsx`, `lib/api/fetch-wrapper.ts`, `components/ui/toast.ts` |
| Docs               | `apps/frontend/CLAUDE.md` (stack, estructura, auth); reglas del frontend (`nextjs-patterns.md`, `forms-conventions.md`, `component-imports.md`, `component-conventions.md`); `CLAUDE.md` raíz y `README.md` (estado, login y flujo de sesión); `docs/specs/README.md` y el campo `Código` de la spec `auth`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Compatibilidad entre apps (`docs/sdd/README.md`)

No cambia ningún contrato. El frontend consume los tres endpoints de `auth` tal como están, la API
no cambia y `@vm/shared-types` tampoco. Lo único nuevo para la API es más tráfico a
`GET /api/auth/me` (D2), que ya existe y no tiene límite de tasa.

## Seguridad y permisos (C8)

- **A01, control de acceso:** la API decide siempre (RF-auth-07, RF-virtual-machines-02). En el
  frontend, la sesión y el rol se verifican en cada página contra la API (D1), no solo en `proxy`
  ni en un layout; `AdminOnly` y `requireAdmin()` fallan cerrado ante un rol desconocido.
- **A02, configuración:** cabeceras de D9, sin `X-Powered-By`. La CSP de scripts queda fuera (riesgo
  aceptado en la spec).
- **A07, autenticación y sesión:**
  - El token nunca llega a JavaScript: cookie `HttpOnly` y `credentials: 'include'`.
  - Credenciales solo en el cuerpo de `POST /api/auth/login`: el formulario es `method="post"` y no
    se envía antes de hidratar (RF-auth-32).
  - Mensajes de error del login fijos por status, sin enumeración.
  - Salida con carga completa (F3) y avisos entre pestañas sin datos (RF-auth-33).
  - Los avisos de `/login` salen de una lista cerrada de códigos: la URL nunca aporta texto.
- **A03, dependencias:** versiones exactas y `pnpm audit` (D10).
- **A09, logs:** nada registra contraseñas, cookies ni tokens; `proxy` no registra nada.
- **A10, condiciones excepcionales:** la API caída da una página de error con reintento, nunca
  contenido privado ni un login engañoso; `proxy` con error o sin respuesta sigue y decide la
  página.
- **CSRF del login:** lo cubre la API (`Origin`, solo JSON, `SameSite=Strict`).

## Pruebas por requisito (`docs/testing.md`)

| RF         | Criticidad     | Test (nivel)                                                         | Qué verifica                                                                                                                                                                                                                           | Archivo                                            |
| ---------- | -------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| RF-auth-19 | Crítico K1, K3 | RTL de componente (borde: `fetch` y `next/navigation`)               | Con datos válidos, dos clics en "Iniciar sesión" producen **un** `POST /api/auth/login` con `credentials: 'include'` y el cuerpo normalizado; con `200`, `router.replace('/')`                                                         | `src/features/auth/components/login-form.test.tsx` |
| RF-auth-32 | Crítico K1     | Render de servidor (`renderToString`)                                | El HTML inicial del formulario tiene `method="post"` y el botón de envío deshabilitado                                                                                                                                                 | `src/features/auth/components/login-form.test.tsx` |
| RF-auth-22 | Crítico K1, K3 | Vitest de lógica (borde: `fetch`)                                    | `login` y `checkSession` guardan el usuario de una respuesta válida; una respuesta mal formada o con un rol desconocido deja `user` en `null`; `selectIsAuthenticated` sigue a `user`; `localStorage` y `sessionStorage` siguen vacíos | `src/lib/auth/auth-store.test.ts`                  |
| RF-auth-29 | Crítico K1     | Vitest de lógica (borde: `fetch`, `window.location`, canal)          | Logout correcto: avisa a las pestañas y navega a `/login?aviso=sesion-cerrada`. Logout fallido: lanza, `user` no cambia, no navega ni avisa                                                                                            | `src/lib/auth/auth-store.test.ts`                  |
| RF-auth-23 | Crítico K1, K5 | RTL de componente                                                    | Dos `AuthProvider` con usuarios distintos en el mismo documento muestran cada uno el suyo: no comparten estado                                                                                                                         | `src/components/auth/auth-provider.test.tsx`       |
| RF-auth-24 | Crítico K1, K3 | Vitest de lógica (borde: `fetch`, `next/headers`, `next/navigation`) | `requireUser()` devuelve el usuario con `200` válido; con `5xx` o error de red lanza un error que no es una redirección                                                                                                                | `src/lib/auth/session.test.ts`                     |
| RF-auth-25 | Crítico K1     | Vitest de lógica (mismo archivo)                                     | Con `401` o una respuesta mal formada, `requireUser()` redirige a `/login`                                                                                                                                                             | `src/lib/auth/session.test.ts`                     |
| RF-auth-25 | Crítico K1     | Guarda estructural (recorre el código)                               | `(panel)/layout.tsx` y cada `(panel)/**/page.tsx` llaman a `requireUser()` o `requireAdmin()`                                                                                                                                          | `src/app/(panel)/session-guard.test.ts`            |
| RF-auth-31 | Crítico K1     | Vitest de lógica (`session.test.ts`)                                 | `requireAdmin()` llama a `notFound()` para un Cliente y devuelve el usuario para un Administrador                                                                                                                                      | `src/lib/auth/session.test.ts`                     |
| RF-auth-26 | Crítico K1, K4 | Vitest de lógica (borde: `fetch`, `window.location`)                 | Un `401` en `/api/vms` navega a `/login?aviso=sesion-expirada`; tres `401` simultáneos navegan una vez; un `401` en el login o con `'ignore'` no navega; siempre lanza `ApiError`                                                      | `src/lib/api/fetch-wrapper.test.ts`                |
| RF-auth-27 | Crítico K1, K5 | Vitest de lógica (borde: `fetch`)                                    | Con cookie y una respuesta de `/me` con `Set-Cookie`, la respuesta de `proxy` lleva ese `Set-Cookie`; sin cookie, no llama a la API; con error de red, sigue sin redirigir                                                             | `src/proxy.test.ts`                                |
| RF-auth-27 | Crítico K1, K5 | Manual (spec, "Verificación manual")                                 | La renovación llega al navegador de punta a punta                                                                                                                                                                                      | —                                                  |
| RF-auth-30 | Crítico K1     | RTL de componente + `renderToString`                                 | `AdminOnly` muestra su contenido a un Administrador; para un Cliente, un rol desconocido o sin usuario, no existe en el DOM ni en el HTML del servidor                                                                                 | `src/components/auth/admin-only.test.tsx`          |
| RF-auth-33 | Crítico K1     | Vitest de lógica (`BroadcastChannel` de Node)                        | Un aviso de otra "pestaña" (otra instancia del canal) llega al suscriptor; el aviso propio no se recibe a sí mismo; un mensaje desconocido se ignora                                                                                   | `src/lib/auth/session-channel.test.ts`             |
| RF-auth-34 | Crítico K1, K5 | Vitest de configuración                                              | `headers()` aplica a las páginas y no a `/api/*` las cuatro cabeceras; HSTS solo en producción; `poweredByHeader` es `false`                                                                                                           | `src/config/security-headers.test.ts`              |

Los RF Estándar (17, 18, 20, 21, 28) se comprueban en G4, con una línea cada uno y capturas de claro,
oscuro, escritorio y móvil. `palette.test.ts` cubre los archivos nuevos sin cambios. Los tests se
corren con el Node de Windows (`apps/frontend/CLAUDE.md`, "Testing").

### Tests que se retiran o reescriben

| Test (archivo › nombre)                                                                                                                   | Señal                                                                                                                                                                                                                                         | Qué lo reemplaza                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server-fetch.test.ts` › `serverFetchResult` › "RF-app-shell-15 reenvía las cookies del pedido al backend, sin caché, y desenvuelve data" | Cambio de comportamiento aprobado por Dayanna el 2026-10-11 (hallazgo L2 de la revisión local): `serverFetchResult` agrega un tiempo máximo (`signal`) para cumplir RF-auth-24, y la aserción comparaba el objeto exacto `{ cache, headers }` | La misma URL, la misma cookie cruda y `no-store`, más `signal` de tipo `AbortSignal`; sigue exigiendo que no haya otras opciones (ni `revalidate`) |

Los tests actuales de `fetch-wrapper.test.ts` no usan `401` y siguen igual; los nuevos de RF-auth-26
se agregan al archivo.

## Revisión de arquitectura

| Hallazgo                                                                                       | Evidencia (archivo:línea o doc oficial)                                                                                                                                                                | Cambio                                                   |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| La renovación de un pedido de servidor se pierde y además le gana la ventana al navegador (F9) | `apps/backend/src/modules/auth/auth.service.ts:158-160` (`renew()` → `touch`); `session-expiry.ts` (`shouldRenewSession`); doc de `cookies()`: solo Route Handlers y Server Functions escriben cookies | `proxy` reenvía la renovación (D2)                       |
| El layout no protege la navegación ni impide que la página llegue en el RSC                    | Guía de autenticación de Next 16 ("Layouts and auth checks")                                                                                                                                           | `requireUser()` en cada página + guarda estructural (D1) |
| `proxy` corre en Node, admite `missing` para excluir prefetch y no ve las cabeceras RSC        | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` ("Runtime", "Matcher", "RSC headers")                                                                               | `matcher` de D2                                          |
| Una boundary no envuelve al layout de su segmento                                              | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:96`                                                                                                                  | `app/error.tsx` en la raíz (D1)                          |
| El rewrite reenvía `Set-Cookie` al navegador                                                   | `next/dist/server/lib/router-utils/proxy-request.js` (httpxy)                                                                                                                                          | Los pedidos del navegador renuevan solos                 |
| `fetch-wrapper` hace un cast de `data`                                                         | `apps/frontend/src/lib/api/fetch-wrapper.ts:61`                                                                                                                                                        | `isAuthUser` en toda respuesta de sesión (D3)            |
| Zustand no debe ser global en el servidor                                                      | Guía de Zustand para Next.js ("No global stores")                                                                                                                                                      | Store por proveedor (D3)                                 |
| `zodResolver` infiere tipos con transformaciones del mismo tipo                                | Docs de `@hookform/resolvers` (Zod con transform)                                                                                                                                                      | `useForm` sin genéricos (D4)                             |
| El frontend no manda cabeceras de seguridad y sí `X-Powered-By`                                | `apps/frontend/next.config.ts`                                                                                                                                                                         | D9                                                       |
| `nextjs-patterns.md` prevé refresh token y dice que `proxy.ts` no existe                       | `apps/frontend/.claude/rules/nextjs-patterns.md` ("Client Components", "Proxy")                                                                                                                        | Se corrige en T9                                         |

## Riesgos y decisiones (incluidas las que trascienden el cambio)

- **Dos `/me` por página del panel** (D2 y D1): es el costo de no confiar en `proxy` como única
  defensa. Si algún día pesa, la alternativa es que la página use su propio pedido de datos como
  verificación; no se hace ahora.
- **`proxy` y la API lenta:** el tiempo máximo de 5 s evita colgar la navegación; pasado ese tiempo,
  la página decide (y muestra el error si la API sigue caída). `serverFetch` no tenía tiempo
  máximo: tras la revisión local lleva 10 s (ver "Desvíos").
- **Nombre de la cookie:** `proxy` no necesita conocerlo (`__Host-vm_session` o `vm_session`):
  reenvía la cabecera `cookie` y decide la API.
- **`/login` es dinámica:** lee `searchParams`, y `proxy` corre en ella. Es una página chica; no
  pierde nada relevante.
- **Sin CSP de scripts** (decisión F1): si se agrega más adelante, el script del tema y `proxy` ya
  están listos para un nonce.
- **Navegadores sin `BroadcastChannel`:** sin sincronización entre pestañas; quedan RF-auth-25 y 26.
- **G3 propuesto:** ⏸ tras T8 (la página de login), para que revises el diseño en claro, oscuro y
  móvil antes de la documentación.
- **Verificación visual y manual:** como en `app-shell`, con `puppeteer-core` contra el Chrome de
  Windows en modo headless, con un perfil temporal; la API real con `pnpm dev` y los usuarios de
  `db:seed`.

## Desvíos durante la implementación

| Desvío                                                                     | Motivo                                                                                                                                                                                                                                    | Dónde                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `login()` del store reutiliza el pedido en curso si llega un segundo envío | El test de RF-auth-19 mostró que dos envíos dentro del mismo lote de React salían como dos pedidos (el botón aún no se había deshabilitado). En vez de ajustar el test, la garantía pasó al store, independiente de los tiempos de render | `lib/auth/auth-store.ts`                                     |
| El aviso entre pestañas tras el login lo da el store, no el formulario     | Login y logout avisan desde el mismo lugar                                                                                                                                                                                                | `lib/auth/auth-store.ts`                                     |
| `StandalonePage`, el marco de las páginas fuera del shell                  | La 404, la página de error y el login repetían el mismo marco (C9, DRY); `not-found.tsx` pasa a usarlo sin cambiar lo que muestra                                                                                                         | `components/layout/standalone-page.tsx`, `app/not-found.tsx` |
| `cleanup()` de RTL en el setup de Vitest                                   | Sin `globals: true`, RTL no desmonta lo renderizado y el DOM de un test se filtraba al siguiente; hasta ahora no había tests de componente                                                                                                | `src/test/setup.ts`                                          |
| `setError('root.server', …)` sin pintarlo cuando falla el login            | Si no, RHF da el envío por exitoso y `isSubmitSuccessful` deja el botón deshabilitado; se documentó en `forms-conventions.md`                                                                                                             | `features/auth/components/login-form.tsx`                    |
| `.claude/rules/shared-types.md` también se corrigió                        | Decía que nadie valida respuestas en runtime; desde RF-auth-22 el frontend valida `AuthUser` con `isAuthUser` (C5)                                                                                                                        | `.claude/rules/shared-types.md`                              |
| Entre T3 y T8, `typecheck` falló por `redirect('/login')`                  | Con `typedRoutes`, la ruta tiene que existir; se resolvió al crear `/login` en T8. Sin efecto en el resultado                                                                                                                             | `lib/auth/session.ts`                                        |
| Verificación de RF-auth-27 con `curl` además del navegador                 | El guion de Chrome no ve la cabecera `Set-Cookie` del documento (CDP no la expone); el vencimiento avanzó (+331 s) y `curl` confirmó el `Set-Cookie` reenviado por `proxy` con todos sus atributos                                        | —                                                            |

**Tras la revisión local** (`code-reviewer`, `frontend-reviewer`, `security-auditor`, 2026-10-11):

| Desvío                                                                                            | Motivo                                                                                                                                                                                                                                                                                                   | Dónde                                                    |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `readAuthUser` copia solo `id`, `email` y `role`                                                  | Devolvía el objeto de la API tal cual: un campo nuevo habría llegado al store y al payload RSC (RF-auth-22). Hallazgo de `code-reviewer` y `security-auditor`                                                                                                                                            | `lib/auth/auth-user.ts`                                  |
| `proxy` exige un `AuthUser` válido para llevar de `/login` al Panel                               | Con solo el `200`, un cuerpo inválido (rol desconocido) habría hecho un bucle `/login` ↔ `/` (caso límite de la spec). Mismo criterio que `requireUser()`                                                                                                                                                | `lib/auth/proxy-session.ts`                              |
| `AdminOnly` solo en árboles de cliente; en Server Components, `isAdmin(await requireUser()) && …` | Desde un Server Component, los `children` viajarían en el payload RSC del Cliente (RF-auth-30). Hoy no hay usos; queda en el JSDoc y en `component-imports.md`                                                                                                                                           | `components/auth/admin-only.tsx`, `component-imports.md` |
| La guarda de RF-auth-25 exige la llamada como primera instrucción                                 | Antes aceptaba la cadena en cualquier lugar del archivo (hasta en un comentario); ahora coincide con la regla "primera línea"                                                                                                                                                                            | `app/(panel)/session-guard.test.ts`                      |
| Sin `src/types/api.ts` (`AuthUserResponse`, D11)                                                  | Quedó sin uso: las respuestas de sesión entran como `unknown` y se validan con `isAuthUser`                                                                                                                                                                                                              | —                                                        |
| `serverFetchResult` con tiempo máximo de 10 s (`AbortSignal.timeout`)                             | Sin él, una API que acepta la conexión y no responde colgaba `requireUser()` y nunca se llegaba al error con "Reintentar" (RF-auth-24); además agotaba el servidor del frontend. Hallazgo L2 de `security-auditor`; aprobado por Dayanna el 2026-10-11 con la reescritura del test de la tabla de arriba | `lib/api/server-fetch.ts`                                |

**Observaciones fuera de alcance:**

- Con el correo vacío, el error es "Ingresa un correo válido" y no "Ingresa tu correo": lo decide
  `NormalizedEmail` en `@vm/shared-types` (el string vacío pasa el tipo y falla el formato).
  Cambiarlo toca el contrato compartido: sería un cambio aparte.
- `pnpm audit` informa una vulnerabilidad alta en `braces`, que llega por `@vm/eslint-config` →
  `@next/eslint-plugin-next` (herramienta de lint, previa a este cambio). Las dependencias nuevas no
  tienen ninguna.
