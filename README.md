# Gestor de Máquinas Virtuales

Single Page Application para gestionar máquinas virtuales (VMs), con una API REST de soporte y
actualización en tiempo real. Monorepo con pnpm workspaces y Turborepo: **Next.js 16** en el
frontend, **Nest.js 11** en el backend, **PostgreSQL 16** y **Socket.io 4**.

```bash
# Resumen de la puesta en marcha (detalle en "Puesta en marcha desde cero")
pnpm install
cp apps/backend/.env.example apps/backend/.env && cp apps/frontend/.env.example apps/frontend/.env.local
docker compose up -d --wait
pnpm --filter @vm/shared-types build
pnpm --filter @vm/backend db:migrate && pnpm --filter @vm/backend db:seed
pnpm dev   # web en http://localhost:3000 · API en http://localhost:3001
```

## Índice

1. [Qué hace](#qué-hace)
2. [Requisitos previos](#requisitos-previos)
3. [Puesta en marcha desde cero](#puesta-en-marcha-desde-cero)
4. [Credenciales de prueba y datos de ejemplo](#credenciales-de-prueba-y-datos-de-ejemplo)
5. [Problemas frecuentes](#problemas-frecuentes)
6. [Arquitectura](#arquitectura)
7. [Decisiones de arquitectura](#decisiones-de-arquitectura)
8. [Contrato de la API](#contrato-de-la-api)
9. [Despliegue fuera de local](#despliegue-fuera-de-local)
10. [Scripts](#scripts)
11. [Limitaciones y próximos pasos](#limitaciones-y-próximos-pasos)
12. [Bitácora de IA](#bitácora-de-ia)

## Qué hace

- **Acceso seguro:** login con email y contraseña; la sesión es un JWT en una cookie `HttpOnly`,
  `Secure` y `SameSite=Strict`, nunca en `localStorage`. El logout la revoca en el servidor.
- **Roles:** el **Administrador** crea, edita, enciende, apaga y elimina VMs; el **Cliente** solo
  las consulta. La UI no le dibuja los controles de escritura (no existen en el DOM) y la API los
  rechaza con `403`.
- **VMs:** listado en tarjetas, creación y edición en un modal con validación mientras se escribe
  (`name`, `cores`, `ram`, `disk`, `os`, `status`) y _optimistic UI_: cada cambio se ve al instante
  y se revierte si la API falla.
- **Panel de recursos:** indicadores y gráficos (Recharts) con la suma de cores, RAM y disco de las
  VMs encendidas frente al total asignado, y el aporte de cada VM.
- **Tiempo real:** cuando un Administrador cambia el estado de una VM, todas las pantallas
  conectadas lo ven al instante, con un destello en la tarjeta que cambió.
- **UX:** tema Claro / Oscuro / Sistema sin parpadeo, skeletons de carga, toasts, estados vacíos y
  navegación por teclado.

Visión completa y alcance: [`docs/product.md`](docs/product.md). Comportamiento esperado de cada
capacidad, con sus requisitos: [`docs/specs/`](docs/specs/README.md).

| Paquete             | Ruta                     | Stack                                                                                                        |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `@vm/backend`       | `apps/backend`           | Nest.js 11, TypeORM 1 + PostgreSQL 16, Zod 4, JWT en cookie, Argon2id, Socket.io 4                           |
| `@vm/frontend`      | `apps/frontend`          | Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui (Radix), TanStack Query 5, Recharts 3, Socket.io client 4 |
| `@vm/shared-types`  | `packages/shared-types`  | Contratos compartidos: schemas Zod, modelos y constantes (CJS + ESM vía tsup)                                |
| `@vm/tsconfig`      | `packages/tsconfig`      | Configuraciones TypeScript `strict` reutilizables                                                            |
| `@vm/eslint-config` | `packages/eslint-config` | ESLint 9 (flat config) + typescript-eslint con tipos                                                         |

## Requisitos previos

| Herramienta                 | Versión                                  | Para qué                                  | Cómo comprobarla                            |
| --------------------------- | ---------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| Git                         | Cualquiera reciente                      | Clonar el repositorio                     | `git --version`                             |
| Node.js                     | **22** (`.nvmrc`; `engines: >=22`)       | Correr todo el monorepo                   | `node -v` → `v22.x`                         |
| pnpm                        | **10.33.0** (fijada en `packageManager`) | Dependencias y scripts                    | `pnpm -v`. Si falla: `corepack enable pnpm` |
| Docker con Compose v2       | Docker Desktop o Docker Engine           | PostgreSQL 16 de desarrollo (recomendado) | `docker compose version`                    |
| PostgreSQL 16 (alternativa) | Solo si no usas Docker                   | Base de datos                             | `psql --version`                            |

Puertos que tienen que estar libres: **3000** (web), **3001** (API) y **5433** (PostgreSQL de
Docker; usa el 5433 para no chocar con un PostgreSQL local en el 5432).

## Puesta en marcha desde cero

Todos los comandos se corren en la raíz del repositorio.

### 1. Clonar e instalar las dependencias

```bash
git clone <url-del-repositorio> gestionar-maquinas-virtuales
cd gestionar-maquinas-virtuales
pnpm install
```

Debes ver `Done in …` sin errores. pnpm 10 solo ejecuta los scripts de instalación que autoriza
`pnpm-workspace.yaml` (`argon2`, `esbuild`, `sharp`, …).

### 2. Variables de entorno

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

En **PowerShell**: `Copy-Item apps/backend/.env.example apps/backend/.env` (y lo mismo con el
frontend). En **CMD**: `copy apps\backend\.env.example apps\backend\.env`.

Los valores de los `.env.example` funcionan tal cual en local. Qué hace cada variable:

| Variable              | Archivo                    | Valor de desarrollo                                    | Qué hace                                                                                      | ¿Cambiarla?                                                     |
| --------------------- | -------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `NODE_ENV`            | `apps/backend/.env`        | `development`                                          | Entorno. Con `production`, `COOKIE_SECURE=false` no arranca y el seed se niega a correr       | No, en local                                                    |
| `PORT`                | `apps/backend/.env`        | `3001`                                                 | Puerto de la API                                                                              | Solo si el 3001 está ocupado (y entonces `NEXT_PUBLIC_API_URL`) |
| `CORS_ORIGIN`         | `apps/backend/.env`        | `http://localhost:3000`                                | Orígenes permitidos (CORS, `Origin` de las escrituras y del socket), separados por comas      | Si la web corre en otro origen                                  |
| `DATABASE_URL`        | `apps/backend/.env`        | `postgres://vm:vm_dev_password@localhost:5433/vm_dev`  | Base de desarrollo                                                                            | Sin Docker, la de tu PostgreSQL                                 |
| `TEST_DATABASE_URL`   | `apps/backend/.env`        | `postgres://vm:vm_dev_password@localhost:5433/vm_test` | Base de los tests e2e: se vacía en cada corrida                                               | Nunca la apuntes a la de desarrollo                             |
| `JWT_SECRET`          | `apps/backend/.env`        | Un secreto de ejemplo                                  | Firma del JWT; al menos 32 bytes                                                              | **Sí**, fuera de local (el `.env.example` trae cómo generarlo)  |
| `COOKIE_SECURE`       | `apps/backend/.env`        | `true`                                                 | Cookie `Secure` (`__Host-vm_session`). `false` solo fuera de producción (cookie `vm_session`) | Solo para probar con Postman sobre `http://`                    |
| `TRUST_PROXY`         | `apps/backend/.env`        | `false`                                                | De qué proxy se acepta `X-Forwarded-For` (rate limit por IP)                                  | En producción (ver "Despliegue fuera de local")                 |
| `SEED_*` (4)          | `apps/backend/.env`        | Emails y contraseñas de "Credenciales de prueba"       | Usuarios que crea `db:seed`                                                                   | Opcional                                                        |
| `NEXT_PUBLIC_API_URL` | `apps/frontend/.env.local` | `http://localhost:3001`                                | A dónde reenvía Next `/api/*` (sin `/api` al final)                                           | Si la API corre en otra URL                                     |

### 3. Base de datos

```bash
docker compose up -d --wait
```

Debes ver `Container …-postgres-1  Healthy`. Levanta PostgreSQL 16 en el puerto **5433** con dos
bases: `vm_dev` (desarrollo) y `vm_test` (tests e2e; la crea `docker/postgres/init` la primera vez
que arranca el volumen).

**Sin Docker:** crea las bases `vm_dev` y `vm_test` en tu PostgreSQL 16 y ajusta `DATABASE_URL` y
`TEST_DATABASE_URL` en `apps/backend/.env`.

### 4. Compilar los contratos compartidos

```bash
pnpm --filter @vm/shared-types build
```

El backend y el frontend consumen `@vm/shared-types` **compilado** (`dist/`, que no está en git).
`pnpm dev` y `pnpm build` lo compilan solos, pero `db:migrate` y `db:seed` compilan solo el backend:
sin este paso fallan con `TS2307: Cannot find module '@vm/shared-types'`.

### 5. Esquema y datos de ejemplo

```bash
pnpm --filter @vm/backend db:migrate
pnpm --filter @vm/backend db:seed
```

Debes ver `Migration … has been executed successfully` y, del seed:

```text
[Seed] Administrador admin@example.com: creado
[Seed] Cliente cliente@example.com: creado
[Seed] VMs de ejemplo: 6 creadas
```

### 6. Levantar todo a la vez

```bash
pnpm dev
```

Turborepo compila `@vm/shared-types` y deja corriendo en paralelo, con la salida de cada paquete
por separado:

| Paquete            | Qué corre                       | Dónde                          |
| ------------------ | ------------------------------- | ------------------------------ |
| `@vm/shared-types` | `tsup --watch` de los contratos | —                              |
| `@vm/backend`      | API Nest.js en modo watch       | <http://localhost:3001/health> |
| `@vm/frontend`     | Next.js en modo desarrollo      | <http://localhost:3000>        |

`GET http://localhost:3001/health` responde `{ "success": true, "data": { "status": "ok", … } }`.
`Ctrl+C` detiene todo.

### 7. Entrar

Abre <http://localhost:3000>: sin sesión, la web lleva a `/login`. Entra con un usuario de
[Credenciales de prueba](#credenciales-de-prueba-y-datos-de-ejemplo). El navegador solo habla con
su mismo origen (`:3000`): Next reenvía `/api/*` y el WebSocket a la API.

**Ver la base:** `docker compose exec postgres psql -U vm -d vm_dev` (`\dt` lista las tablas), o
pgAdmin con `localhost:5433`, usuario `vm`, contraseña `vm_dev_password`.

> **Windows:** instala y corre el proyecto desde el **mismo sistema operativo** (PowerShell, CMD o
> la terminal de VS Code; o todo desde WSL). Next.js, Tailwind, Vitest y `argon2` usan binarios
> nativos que dependen del sistema operativo donde se corrió `pnpm install`.

## Credenciales de prueba y datos de ejemplo

Las crea `pnpm --filter @vm/backend db:seed` a partir de las variables `SEED_*` de
`apps/backend/.env`. **Solo para desarrollo:** están publicadas aquí, así que el seed se niega a
correr con `NODE_ENV=production`.

| Rol           | Email                 | Contraseña          | Qué puede hacer                                                                          |
| ------------- | --------------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| Administrador | `admin@example.com`   | `Admin-dev-2026!`   | Todo: ver, crear, editar, encender, apagar y eliminar VMs                                |
| Cliente       | `cliente@example.com` | `Cliente-dev-2026!` | Solo ver el Panel, los recursos y los cambios en tiempo real; sin controles de escritura |

**Qué hace `db:seed`:**

- Crea los dos usuarios si no existen; si ya existen, no los toca.
- Crea seis **VMs de ejemplo**, solo si no hay **ninguna** VM: en una base con datos no agrega ni
  repone nada. Con ellas, el panel de recursos arranca con 4 de 6 VMs encendidas: 18 de 28 cores,
  60 de 84 GB de RAM y 770 de 3068 GB de disco.
- Se puede correr las veces que haga falta. Para empezar de cero: `docker compose down -v` (borra
  el volumen de la base) y repite los pasos 3 y 5.

| VM          | Sistema operativo        | Cores | RAM (GB) | Disco (GB) | Estado    |
| ----------- | ------------------------ | ----- | -------- | ---------- | --------- |
| `web-01`    | Ubuntu                   | 2     | 4        | 50         | Encendida |
| `api-01`    | Debian                   | 4     | 8        | 100        | Encendida |
| `db-01`     | Rocky Linux              | 8     | 32       | 500        | Encendida |
| `ad-01`     | Windows Server           | 4     | 16       | 120        | Encendida |
| `erp-01`    | Red Hat Enterprise Linux | 8     | 16       | 250        | Apagada   |
| `backup-01` | Ubuntu                   | 2     | 8        | 2048       | Apagada   |

### Recorrido de revisión

Hacen falta dos sesiones a la vez: una ventana normal y una **ventana privada** (o otro navegador),
porque la cookie de sesión es una por perfil del navegador.

1. **Administrador** en la ventana normal: el Panel muestra el panel de recursos arriba y las seis
   tarjetas debajo, con "Crear máquina virtual" y, en cada tarjeta, el interruptor de encendido y
   el menú de acciones (⋮) con "Editar" y "Eliminar".
2. **Cliente** en la ventana privada: las mismas tarjetas y los mismos gráficos, sin ningún control
   de escritura.
3. Con el Administrador, enciende `erp-01`: su tarjeta cambia al instante. En la ventana del Cliente
   la tarjeta destella en cian y los totales se recalculan, sin recargar.
4. Con el Administrador, "Crear máquina virtual": los errores aparecen mientras escribes (p. ej., un
   nombre con espacios o `0` cores). Con datos válidos, la tarjeta aparece al instante como
   "Guardando…" y después un toast confirma.
5. Desde el menú ⋮ de una tarjeta, edita y elimina una VM (la eliminación pide confirmación). El
   Cliente ve las altas y bajas al volver a su pestaña o al recargar: el tiempo real difunde solo
   los cambios de estado.
6. _Optimistic UI con error:_ en las herramientas del navegador, bloquea las peticiones a
   `*/api/vms/*` (_More tools → Network request blocking_) y apaga una VM: la tarjeta cambia al
   instante, vuelve a como estaba y un toast explica el error. Quita el bloqueo al terminar. (Con
   _Network → Offline_ no falla: TanStack Query pausa la petición hasta que vuelva la red y
   entonces la envía.)
7. Cierra la sesión desde el menú de la cabecera (correo, rol y "Cerrar sesión").

### Probar la API con Postman

1. `POST http://localhost:3001/api/auth/login`, _Body → raw → JSON_:
   `{ "email": "admin@example.com", "password": "Admin-dev-2026!" }`. La respuesta trae solo el
   usuario; en la pestaña **Cookies** aparece `__Host-vm_session` con `HttpOnly`, `Secure` y
   `SameSite=Strict`.
2. `GET http://localhost:3001/api/auth/me`: Postman reenvía la cookie sola y responde el usuario.
3. `POST http://localhost:3001/api/auth/logout` y otra vez `GET /api/auth/me` → `401`.
4. Seis logins fallidos seguidos en menos de un minuto → `429` con `Retry-After`.
5. **Tiempo real:** _New → Socket.IO_, URL `http://localhost:3001`, y en _Settings_ el
   _Handshake path_ `/api/socket.io` y la versión v4. En _Headers_, `Cookie` con la cookie del
   login (y, si quieres probar el origen, `Origin: http://localhost:3000`). En _Events_, escucha
   `vm:status-changed` y conecta. Un `PUT http://localhost:3001/api/vms/<id>` con
   `{ "status": "Encendida" }` (o `Apagada`) hace llegar el evento con la VM. Esto prueba la API
   directa. A través de Next (`http://localhost:3000` con `pnpm dev`), el cliente tiene que pedir la
   ruta sin barra final (`REALTIME_CLIENT_OPTIONS`); si el tuyo agrega la barra, Next responde
   `308` y el socket no conecta.

Si tu Postman no reenvía la cookie `Secure` sobre `http://localhost`, pon `COOKIE_SECURE=false` en
`apps/backend/.env` (solo fuera de producción: la cookie pasa a llamarse `vm_session`) y reinicia
la API. Con `curl`: `curl -c jar.txt -H 'Content-Type: application/json' -d '{…}'
localhost:3001/api/auth/login` y después `curl -b jar.txt localhost:3001/api/auth/me`.

## Problemas frecuentes

| Síntoma                                                                             | Causa                                                                                              | Solución                                                                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `db:migrate` o `db:seed` fallan con `TS2307: Cannot find module '@vm/shared-types'` | `@vm/shared-types` todavía no está compilado                                                       | `pnpm --filter @vm/shared-types build` (paso 4)                                                            |
| La API no arranca: `Variables de entorno inválidas: … JWT_SECRET …`                 | Falta `apps/backend/.env` o una variable no valida (el mensaje nombra la variable, nunca su valor) | Copia el `.env.example` (paso 2) y corrige la variable que nombra                                          |
| `docker compose up` falla con `port is already allocated`                           | Otro proceso usa el puerto 5433                                                                    | Detén ese proceso, o cambia el puerto de `docker-compose.yml` y el de `DATABASE_URL` y `TEST_DATABASE_URL` |
| `pnpm dev` falla con `EADDRINUSE` en 3000 o 3001                                    | Otro proceso usa el puerto                                                                         | Detén ese proceso. Para mover la API: `PORT` y `NEXT_PUBLIC_API_URL`; para mover la web: `CORS_ORIGIN`     |
| Errores de binarios nativos al arrancar (Next SWC, Tailwind, `argon2`)              | `pnpm install` se corrió en otro sistema operativo (p. ej., WSL y después Windows)                 | Borra `node_modules` y corre `pnpm install` en el sistema donde vas a ejecutar el proyecto                 |
| El seed dice `VMs de ejemplo: omitidas, ya hay N VMs`                               | La base ya tiene VMs: el seed no mezcla datos de ejemplo con datos existentes                      | Es lo esperado. Para empezar de cero: `docker compose down -v` y los pasos 3 y 5                           |
| El login responde "Demasiados intentos…"                                            | Más de 5 intentos por minuto, por IP o por email (`429`)                                           | Espera un minuto                                                                                           |
| La web muestra un error con "Reintentar" en vez del Panel                           | La API no responde                                                                                 | Revisa la salida de `@vm/backend` en `pnpm dev` y que PostgreSQL esté arriba (`docker compose ps`)         |
| Los tests e2e fallan al conectar con `vm_test`                                      | El volumen de PostgreSQL existía antes del script que crea `vm_test`                               | `docker compose exec postgres createdb -U vm vm_test`                                                      |
| El indicador dice "Sin conexión en tiempo real" detrás de un proxy                  | El proxy no reenvía el upgrade de WebSocket en `/api/socket.io`                                    | Ver [Despliegue: WebSocket](#despliegue-websocket). El Panel sigue funcionando por REST                    |

## Arquitectura

El navegador solo habla con su mismo origen: Next reenvía `/api/*` a la API, también el upgrade de
WebSocket. La API valida la sesión (cookie `HttpOnly`) en cada petición REST y en el handshake del
socket. Dentro de la API, los módulos se avisan por eventos internos (EventEmitter2), sin
importarse entre sí.

```mermaid
flowchart LR
  subgraph browser["Navegador"]
    spa["Cliente: SPA Next.js<br/>TanStack Query + Socket.io client"]
  end
  subgraph next["Next.js :3000"]
    rewrite["rewrite /api/*<br/>HTTP y upgrade WebSocket"]
  end
  subgraph api["API Nest.js :3001"]
    rest["API REST<br/>/api/auth, /api/vms<br/>guards: origen, sesión, rol"]
    bus(("EventEmitter2"))
    ws["Tiempo real: Socket.io<br/>/api/socket.io<br/>handshake: Origin + cookie"]
  end
  db[("PostgreSQL 16")]

  spa -- "(1) fetch /api/* + cookie" --> rewrite
  spa -- "(2) WebSocket /api/socket.io + cookie" --> rewrite
  rewrite --> rest
  rewrite --> ws
  rest -- "(3) SQL" --> db
  ws -- "valida la sesión" --> db
  rest -- "(4) vm.status-changed<br/>auth.session-revoked" --> bus
  bus --> ws
  ws -- "(5) vm:status-changed { item }" --> spa
```

1. **REST.** Cada acción del Cliente (listar, crear, editar, encender, eliminar, login) es un
   `fetch` a `/api/*` en el mismo origen. La cookie viaja sola; Next la reenvía a la API, que aplica
   los guards (origen en las escrituras, sesión, rol) y valida el cuerpo con Zod.
2. **Conexión en tiempo real.** Al entrar al panel, el Cliente abre **una** conexión Socket.io por
   pestaña (solo WebSocket) en `/api/socket.io`. La API valida el `Origin` y la cookie en el
   handshake, y suma la conexión a la sala `vms`.
3. **Persistencia.** La API guarda en PostgreSQL. El cambio de estado de una VM se hace en una
   transacción (`SELECT … FOR UPDATE`), así se sabe el estado anterior sin carreras.
4. **Eventos internos.** Si el `status` cambió de verdad, el service de VMs emite
   `vm.status-changed` **después** de guardar; el logout emite `auth.session-revoked`. El módulo de
   tiempo real escucha: ni `virtual-machines` ni `auth` saben que existen los sockets.
5. **Difusión.** El gateway emite `vm:status-changed` con la VM completa a todas las conexiones. El
   Cliente valida la forma del evento y lo aplica si es más nuevo (`updatedAt`) que lo que tiene.

| Canal         | REST (HTTP)                                             | Tiempo real (WebSocket)                                                                          |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Quién inicia  | El navegador, en cada acción                            | El navegador abre la conexión; después solo el servidor emite                                    |
| Ruta          | `/api/auth/*`, `/api/vms`, `/api/vms/:id`               | `/api/socket.io` (sin barra final)                                                               |
| Autenticación | Cookie en cada petición; guards de origen, sesión y rol | Cookie y `Origin` en el handshake; la conexión se cierra al hacer logout o vencer la sesión      |
| Qué viaja     | JSON `{ success, data }` o `{ success: false, error }`  | `vm:status-changed` con `{ item }`; el cliente nunca emite                                       |
| Para qué      | Leer y modificar                                        | Avisar los cambios de estado a todas las pantallas                                               |
| Si falla      | Toast y reversión del cambio optimista                  | Indicador "Sin conexión en tiempo real"; el Panel sigue por REST y se resincroniza al reconectar |

Un cambio de estado, de punta a punta:

```mermaid
sequenceDiagram
  participant C as Cliente (navegador)
  participant A as Administrador (navegador)
  participant API as API Nest.js (vía Next)
  participant DB as PostgreSQL

  C->>API: WebSocket /api/socket.io + cookie
  API->>DB: valida la sesión (sin renovarla)
  API-->>C: conectado, en la sala "vms"
  A->>API: PUT /api/vms/:id { status: "Encendida" }
  API->>DB: SELECT … FOR UPDATE, UPDATE, relectura
  API-->>A: 200 { item }
  API--)C: vm:status-changed { item }
  API--)A: vm:status-changed { item } (sus otras pestañas)
```

La sesión en el frontend: el estado de Zustand nace del usuario que el servidor ya verificó con la
API, y nunca se guarda en el navegador. `proxy.ts` solo reenvía la renovación de la cookie: cada
página del panel verifica la sesión por su cuenta.

```mermaid
sequenceDiagram
  participant B as Navegador
  participant P as proxy.ts (Next)
  participant G as Página del panel (Next)
  participant API as API Nest.js

  B->>P: GET / + cookie
  P->>API: GET /api/auth/me + cookie
  API-->>P: 200 (+ Set-Cookie si renovó)
  P->>G: sigue (con el Set-Cookie para el navegador)
  G->>API: requireUser(): GET /api/auth/me
  alt sesión válida
    API-->>G: { user }
    G-->>B: HTML con AuthProvider(user) y los controles de su rol
  else 401
    G-->>B: 307 → /login
  else API caída
    G-->>B: página de error con "Reintentar"
  end
```

El estado de las VMs en el navegador: la caché de TanStack Query guarda solo versiones
**confirmadas** por el servidor; lo que espera respuesta se dibuja encima. Revertir es dejar de
dibujarlo, así nunca se restaura una copia vieja de la lista.

```mermaid
flowchart LR
  get["GET /api/vms<br/>(servidor, al montar, al volver a la pestaña, al conectar)"] --> cache
  resp["respuesta de POST / PUT / DELETE"] --> cache
  event["vm:status-changed<br/>(guarda de forma)"] --> cache
  cache[("caché ['vms']<br/>versiones confirmadas:<br/>gana el updatedAt más nuevo")] --> derive
  pending["mutaciones en curso<br/>(useMutationState)"] --> derive
  derive["listado visible<br/>confirmadas + pendientes"] --> cards["tarjetas"]
  derive --> panel["panel de recursos<br/>(totales y gráficos)"]
```

## Decisiones de arquitectura

### Tecnologías

| Capa            | Tecnología                                   | Por qué                                                                                                                                                                                              | Fuente                                                 |
| --------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Monorepo        | pnpm workspaces + Turborepo                  | Un solo repositorio para las dos apps y sus contratos. Turborepo ordena las tareas por dependencias (`shared-types` se compila antes) y las cachea; pnpm fija versiones exactas y aísla dependencias | `turbo.json`, `.claude/rules/monorepo-conventions.md`  |
| Contratos       | Zod 4 en `@vm/shared-types`                  | Un mismo schema valida el cuerpo en la API (`ZodValidationPipe`) y el formulario en la web: las reglas de una VM existen una sola vez. Los tipos de TypeScript salen del schema                      | Constitución C8 y C10                                  |
| Backend         | Nest.js 11                                   | Módulos e inyección de dependencias para separar Controller → Service → Repository; guards globales (toda ruta nace protegida), pipes y filtros para un contrato de error único. La 12 es ESM-only   | Constitución C7, `apps/backend/CLAUDE.md`              |
| Persistencia    | PostgreSQL 16 + TypeORM 1                    | Relacional, con las reglas también en la base (`CHECK`, índice único por nombre sin mayúsculas, enums) y cambios de esquema solo por migraciones; integración oficial con Nest                       | Plan del backend de `auth`; RNF-virtual-machines-01    |
| Sesión          | JWT en cookie `HttpOnly` + tabla de sesiones | El token nunca está al alcance de JavaScript; la fila de sesión permite revocar en el logout y vencer por inactividad. `SameSite=Strict` + validación de `Origin` contra CSRF                        | Spec `auth`                                            |
| Contraseñas     | Argon2id                                     | Recomendación de OWASP, con sal aleatoria por hash y parámetros no menores al mínimo (m = 19 MiB, t = 2, p = 1)                                                                                      | Constitución C8, RF-auth-12                            |
| Tiempo real     | Socket.io 4 (solo WebSocket)                 | Integración de Nest (`@nestjs/websockets`), salas, eventos tipados compartidos con el frontend y desconexión por sesión. Sin long-polling: un solo transporte que autenticar y endurecer             | Spec `realtime-vm-status`                              |
| Frontend        | Next.js 16 (App Router)                      | Server Components que verifican la sesión en cada página contra la API, el listado precargado en el HTML y el rewrite de `/api/*`, que deja la cookie en el mismo origen                             | Plan del frontend de `auth`                            |
| Estado servidor | TanStack Query 5                             | Recarga al volver a la pestaña, estados de carga y error con reintento, cancelación de recargas viejas y mutaciones con estado pendiente: base de la _optimistic UI_                                 | Plan `2026-10-11-frontend-vms`, D1                     |
| Estado de UI    | Zustand 5                                    | Estado propio de la interfaz (sesión, modales) con un store por árbol de React, nunca global: en el servidor de Next un store global compartiría el usuario entre pedidos                            | Plan del frontend de `auth`, D3                        |
| Formularios     | React Hook Form + `@hookform/resolvers`      | Validación mientras se escribe con los schemas de `@vm/shared-types`                                                                                                                                 | Spec `virtual-machines`, RF-17 a 20                    |
| Gráficos        | Recharts 3                                   | Componentes de React con capa de accesibilidad activa por defecto; se cargan en diferido para no demorar el Panel                                                                                    | Spec `resource-dashboard`                              |
| Estilos         | Tailwind CSS 4 + shadcn/ui (Radix)           | Primitivos accesibles (foco, teclado, ARIA) copiados y adaptados a una paleta cerrada de marca con tokens para claro y oscuro                                                                        | Plan de `app-shell`; `apps/frontend/src/app/theme.css` |
| Pruebas         | Jest + supertest (API) y Vitest (web)        | e2e de la API sobre `AppModule` y una base PostgreSQL real; lógica del frontend sin navegador                                                                                                        | `docs/testing.md`                                      |

### Estructura de carpetas

```
apps/
  backend/
    src/
      config/          # Variables de entorno validadas con Zod
      database/        # Conexión TypeORM, data source del CLI, migraciones, seed y VMs de ejemplo
      modules/auth/    # Login, sesión, guards (origen, JWT, roles), rate limit
      modules/users/   # Entidad, repositorio y service de usuarios
      modules/virtual-machines/ # CRUD de VMs
      modules/realtime/         # Socket.io: gateway, adapter (borde HTTP), handshake, monitor de sesiones
      modules/health/  # GET /health
      shared/          # exceptions/, filters/ (sobre de error), interceptors/ (sobre de éxito),
                       # pipes/ (ZodValidationPipe, ParseIdPipe), utils/ (paginación, origen,
                       # cabeceras de seguridad)
    test/              # e2e (supertest sobre AppModule) y su harness (support/)
  frontend/src/
    app/               # Rutas (App Router): layout raíz, not-found, error, (auth)/login y (panel)/
                       # con el shell (cada página verifica la sesión con requireUser)
    proxy.ts           # Reenvía la renovación de la cookie y lleva al Panel desde /login con sesión
    components/ui/     # Primitivos de shadcn adaptados (Radix, sonner) y DataTable (TanStack)
    components/feedback/  # EmptyState y skeletons (tarjetas, tabla, gráfico)
    components/layout/    # Shell: barra lateral, cabecera, menú móvil, encabezado de página
    components/auth/      # AuthProvider (store por árbol), AdminOnly, sincronización entre pestañas
    components/providers/ # QueryProvider (TanStack Query)
    components/realtime/  # RealtimeProvider (una conexión por pestaña), indicador, resaltes
    components/theme/     # Selector de tema y sincronización
    components/svg/       # Íconos de Tabler como componentes
    features/auth/     # Formulario de login, avisos y menú de la persona
    features/vms/      # Panel: tarjetas, formularios y modales, hooks de mutación, store de modales
    features/resource-dashboard/ # Indicadores y gráficos de Recharts (cargados en diferido)
    schemas/           # Schema del formulario de VMs (números como texto, nombre único, diff del PUT)
    config/            # Navegación, textos (login, Panel, toasts de VMs), cabeceras de seguridad
    types/api.ts       # Formas de respuesta de los endpoints de VMs
    lib/               # env.ts, utils.ts (cn), format.ts, api/ (api-error, fetch-wrapper,
                       # server-fetch), auth/ (store de Zustand, sesión del servidor, proxy, canal
                       # entre pestañas), theme/, query/ (QueryClient), vms/ (versiones, cambios
                       # pendientes, caché, pedidos), realtime/ (conexión, guarda del evento),
                       # resource-dashboard/ (totales y aporte por VM), hooks/
packages/
  shared-types/src/    # common/ (sobre, paginación, ids), auth/ (roles, AuthUser), dto/,
                       # virtual-machines/ (modelo y límites), realtime/ (eventos del socket)
  tsconfig/            # base, nestjs, nextjs, library
  eslint-config/       # base, nest, next
docker/                # Script que crea la base de los tests e2e
docker-compose.yml     # PostgreSQL 16 de desarrollo
docs/                  # Producto, constitución, SDD, política de pruebas, specs
scripts/               # Freno técnico de la puerta SDD para el agente de IA
.claude/               # Reglas, agentes y skills de Claude Code (y en cada app)
```

Reglas que sostienen esta estructura:

- **Las apps no se importan entre sí.** Lo que usan las dos (schemas, modelos, constantes, eventos
  del socket) vive en `packages/shared-types` (constitución C10).
- **Backend por capas y por módulo de negocio:** Controller → Service → Repository; un controller
  nunca inyecta un repositorio ni calcula, filtra o mapea (C7). Los módulos se comunican por
  services exportados o por eventos internos, nunca por repositorios. Imports con alias `@/`.
- **Frontend por Atomic Design + features.** Átomos en `components/svg/` y `components/ui/`;
  moléculas en `components/ui/` (wrappers de Radix) y `components/feedback/`; organismos en
  `components/layout/`, `components/theme/` y `features/<x>/`; plantillas y páginas en `app/`. La
  lógica pura (versiones, totales, guardas) vive en `lib/` y se prueba sin React. Detalle:
  `apps/frontend/.claude/rules/component-conventions.md`.

### Decisiones de diseño

**Seguridad (OWASP Top 10)**

- **La sesión se verifica en cada página, contra la API.** Un layout no se vuelve a renderizar al
  navegar y `proxy` no debe ser la única defensa (guía de autenticación de Next 16). `proxy.ts`
  solo reenvía la renovación de la cookie, que un Server Component perdería (plan del frontend de
  `auth`).
- **Los controles de escritura no existen para el Cliente:** no se ocultan con CSS, no se dibujan.
  La API igual responde `403` (spec `virtual-machines`).
- **Cerrar sesión recarga la página.** Una carga completa de `/login` descarta todo dato privado en
  memoria, incluida la caché del router: Atrás no recupera nada.
- **Cabeceras de seguridad estáticas.** `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy` y
  HSTS en producción; la CSP de scripts con nonce queda como riesgo aceptado (spec `auth`, "Análisis
  OWASP del frontend").
- **Rate limit del login** por IP y por email, y el mismo `401` para email inexistente, clave mala o
  usuario inactivo: no revela qué cuentas existen.

**Estado y optimistic UI**

- **TanStack Query para el estado de las VMs; Zustand solo para el estado propio de la interfaz**
  (sesión, modales), con un store por árbol, nunca global.
- **Optimistic UI por la interfaz, con versiones.** El patrón que escribe el cambio en la caché y
  revierte a una copia de toda la lista borraría lo que llegó mientras tanto (un evento, otra
  mutación). Acá la caché solo guarda versiones confirmadas (gana el `updatedAt` más nuevo) y lo
  pendiente se dibuja encima. La edición manda solo los campos cambiados, para no pisar el cambio
  de otro Administrador (spec `virtual-machines`, hallazgos V1 y V2).
- **El listado se precarga en el servidor.** `HydrationBoundary` dentro de un `Suspense` con
  skeletons: el Panel llega con las VMs en el HTML.
- **El tiempo real no se reconecta solo en todos los casos.** Socket.io no reintenta tras un
  rechazo del handshake ni tras un cierre del servidor; la conexión lo maneja (verifica la sesión o
  reintenta con espera creciente) y resincroniza el listado en cada conexión.

**Interfaz**

- **shadcn/ui copiado y adaptado, sin su CLI.** La paleta es cerrada y los íconos son propios:
  `shadcn add` traería `lucide-react` y tokens que no existen.
- **Tema propio en vez de `next-themes`.** Un script inline en el `<head>` pinta el tema correcto
  antes del primer cuadro y valida el valor guardado; `next-themes` 0.4.6 cae con un valor inválido
  en `localStorage` (plan de `app-shell`).
- **Formularios en modal, números como texto.** Validan mientras se escribe con los schemas de
  `@vm/shared-types`; `inputMode="numeric"` en vez de `type="number"`, que entrega vacío ante
  `2,5`. Si crear falla, el formulario se reabre con lo escrito.
- **Recharts cargado en diferido.** Los totales están en HTML; los gráficos (barras al 100 % y
  aporte por VM) cargan solo en el navegador. Colores con tokens validados para daltonismo y
  contraste: azul en claro, cian en oscuro.

### Proceso de desarrollo

El proyecto se construyó con **Spec Driven Development** (spec-anchored): ninguna funcionalidad
entra sin una spec aprobada por una persona.

- [`docs/constitution.md`](docs/constitution.md): doce principios no negociables (C1–C12), desde
  "la spec manda" hasta capas, seguridad y secretos fuera del repo.
- [`docs/sdd/README.md`](docs/sdd/README.md): el flujo, con **puertas de aprobación humana**: el
  agente de IA se detiene tras la spec y tras el plan, y no edita código sin un "apruebo" explícito.
- [`docs/specs/`](docs/specs/README.md): una spec viva por capacidad (`auth`, `virtual-machines`,
  `realtime-vm-status`, `app-shell`, `resource-dashboard`), con sus requisitos (RF) y su
  criticidad, y en `changes/` el plan y las tareas de cada cambio.
- [`docs/testing.md`](docs/testing.md): **pruebas por riesgo, no por cobertura**. Todo requisito
  Crítico (seguridad, datos, contratos, lógica no trivial, fallas silenciosas) tiene un test con su
  ID: `pnpm --filter @vm/backend test:e2e -t "RF-auth-04"`.
- **Revisión local** antes de cerrar cada cambio, con agentes revisores de contexto limpio
  (código, API, frontend, seguridad).

## Contrato de la API

- Éxito: `{ "success": true, "data": … }`.
- Error: `{ "success": false, "error": { "message": "…", "code": "…" } }`. En un 4xx, `message` está
  escrito para el usuario; en un 5xx o un error de validación es genérico (`INTERNAL_ERROR`,
  `VALIDATION_ERROR`) y el frontend muestra su propio texto.
- Rutas de negocio bajo `/api/…`.

| Método   | Ruta               | Acceso        | Descripción                                                                                   |
| -------- | ------------------ | ------------- | --------------------------------------------------------------------------------------------- |
| `GET`    | `/health`          | Público       | Estado del servicio                                                                           |
| `POST`   | `/api/auth/login`  | Público       | `{ email, password }` → cookie de sesión + `{ user: { id, email, role } }`                    |
| `POST`   | `/api/auth/logout` | Público       | Revoca la sesión (si hay) y expira la cookie                                                  |
| `GET`    | `/api/auth/me`     | Sesión        | El usuario de la sesión                                                                       |
| `GET`    | `/api/vms`         | Sesión        | Todas las VMs, de la más nueva a la más antigua: `{ items }`                                  |
| `POST`   | `/api/vms`         | Administrador | `{ name, cores, ram, disk, os, status? }` → `201` `{ item }` (`status` por defecto `Apagada`) |
| `PUT`    | `/api/vms/:id`     | Administrador | Cambia solo los campos enviados (al menos uno) → `{ item }`                                   |
| `DELETE` | `/api/vms/:id`     | Administrador | Borra la VM → `204` sin cuerpo                                                                |

**Sesión.** El JWT viaja **solo** en la cookie `__Host-vm_session` (`HttpOnly`, `Secure`,
`SameSite=Strict`, `Path=/`), nunca en el cuerpo. Vence tras 7 días sin uso o a los 30 días del
login, y el logout la revoca en el servidor. Toda ruta exige sesión salvo las públicas; las
restringidas por rol responden `403` al resto.

| Código                | Status | Cuándo                                                                 |
| --------------------- | ------ | ---------------------------------------------------------------------- |
| `INVALID_CREDENTIALS` | 401    | Login fallido (el mismo para email inexistente, clave mala o inactivo) |
| `UNAUTHENTICATED`     | 401    | Ruta protegida sin sesión válida                                       |
| `FORBIDDEN`           | 403    | Rol sin permiso, u `Origin` no permitido en `POST/PUT/PATCH/DELETE`    |
| `TOO_MANY_REQUESTS`   | 429    | Más de 5 intentos de login por minuto (por IP o por email)             |
| `VALIDATION_ERROR`    | 400    | Cuerpo con campos inválidos, o id de la ruta que no es un UUID         |
| `INVALID_BODY`        | 400    | Cuerpo que no es JSON válido (la API solo acepta `application/json`)   |
| `PAYLOAD_TOO_LARGE`   | 413    | Cuerpo de más de 100 KB                                                |
| `VM_NAME_TAKEN`       | 409    | Otra VM ya usa ese nombre (sin distinguir mayúsculas)                  |
| `VM_NOT_FOUND`        | 404    | El id no corresponde a ninguna VM                                      |

**VMs.** `name` de 1 a 63 caracteres (letras sin tilde, dígitos, `-`, `_`, `.`; empieza y termina
con letra o dígito), único sin distinguir mayúsculas; `cores` de 1 a 128; `ram` de 1 a 1024 GB;
`disk` de 1 a 65 536 GB; `os` uno de `Ubuntu`, `Debian`, `Rocky Linux`, `Red Hat Enterprise Linux`,
`Windows Server`; `status` `Encendida` o `Apagada`. Detalle: `docs/specs/virtual-machines/spec.md`.

### Tiempo real (Socket.io)

| Elemento            | Valor                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint            | `/api/socket.io` sin barra final (namespace `/`), mismo puerto que la API; el navegador entra por Next                                  |
| Cliente             | `REALTIME_CLIENT_OPTIONS` de `@vm/shared-types`: solo WebSocket y `addTrailingSlash: false`. Un handshake por long-polling recibe `400` |
| Autenticación       | La cookie de sesión en el handshake. Un token en `auth`, la query o `Authorization` se ignora                                           |
| Origen              | `Origin` fuera de `CORS_ORIGIN` → rechazo antes del upgrade. Sin `Origin` (Postman), se acepta                                          |
| Servidor → cliente  | `vm:status-changed` con `{ item }`: la VM completa, igual que la respuesta del `PUT`                                                    |
| Cliente → servidor  | Ninguno: el servidor ignora los eventos entrantes y cierra la conexión con un mensaje > 1 KB                                            |
| Error de conexión   | `connect_error` con `data: { message, code }`: `UNAUTHENTICATED` o `INTERNAL_ERROR`                                                     |
| Desconexión forzada | Motivo `io server disconnect`: tras el logout de esa sesión, o hasta 60 s después de vencer                                             |

- Se emite solo cuando un `PUT /api/vms/:id` **cambia** el `status` (no si trae el mismo, ni en
  altas, bajas o ediciones de otros campos), una vez a cada conexión, después de guardar.
- Conectarse no renueva la sesión: solo las peticiones HTTP la extienden.
- **Sin barra final:** Next redirige con `308` las URLs con barra final (`/api/socket.io/?…`, lo que
  pide Socket.io por defecto), y un upgrade redirigido se corta. Por eso el cliente usa
  `addTrailingSlash: false`.
- Contrato tipado en `@vm/shared-types` (`REALTIME_CLIENT_OPTIONS`, `REALTIME_EVENTS`,
  `ServerToClientEvents`, `ClientToServerEvents`). Detalle: `docs/specs/realtime-vm-status/spec.md`.

**Del lado del navegador** (`src/lib/realtime/`, `src/components/realtime/`):

- **Una conexión por pestaña** mientras dure el layout del panel: navegar entre sus páginas no
  reconecta. Fuera del panel (`/login`, la 404) no hay conexión. El cliente nunca emite eventos.
- **Cada evento pasa por una guarda** antes de tocar el estado: uno con otra forma se ignora. Uno
  válido reemplaza la VM solo si su `updatedAt` es más nuevo; si la VM no está en el listado, se
  recarga el listado.
- **Resincroniza en cada conexión** (la primera y cada reconexión), porque los eventos perdidos
  mientras no hubo conexión no se reenvían.
- **Resalta la tarjeta** que cambió con un destello cian de 2 s, solo si cambió lo que se ve (en la
  pestaña que hizo el cambio, no), y lo anuncia a los lectores de pantalla.
- **Indicador** "En vivo" / "Conectando…" / "Sin conexión en tiempo real". Un rechazo con
  `UNAUTHENTICATED`, o un cierre del servidor seguido de `/me` con `401`, lleva a `/login`; otro
  rechazo se reintenta con espera creciente (1 s … 30 s). Sin socket, el panel sigue por REST.

## Despliegue fuera de local

### Despliegue: IP real del cliente

El límite de intentos de login cuenta por IP y por email. El rewrite de Next **no agrega**
`X-Forwarded-For` y deja pasar el que mande el cliente, así que:

- **Producción:** pon delante de Next un proxy (nginx, balanceador) que **sobrescriba**
  `X-Forwarded-For` con la IP de la conexión, y corre la API con `TRUST_PROXY` apuntando a Next
  (`loopback` si están en el mismo host).
- **Sin ese proxy** (`TRUST_PROXY=false`, el valor por defecto): todo lo que entra por Next comparte
  su IP y el límite por IP queda compartido entre usuarios. Es aceptable solo en desarrollo.
- Nunca pongas un número de saltos sin el proxy: el `X-Forwarded-For` del cliente sería
  falsificable.

### Despliegue: WebSocket

El navegador abre el socket en su mismo origen (`/api/socket.io`) y Next reenvía el upgrade a la
API. El proxy que esté delante de Next en producción tiene que reenviar también el upgrade de
WebSocket en esa ruta (en nginx: `proxy_http_version 1.1` y las cabeceras `Upgrade` y
`Connection`). Sin eso, el tiempo real no conecta. Hoy hay una sola instancia de la API: con varias
haría falta el adapter de Redis de Socket.io.

### Despliegue: secretos

`JWT_SECRET` con al menos 32 bytes aleatorios propios, `COOKIE_SECURE=true` (la API no arranca con
`false` en producción) y las variables por el entorno de ejecución, nunca en el repositorio: solo
se versionan los `.env.example` (constitución C12). El seed no corre en producción.

## Scripts

| Script              | Descripción                                     |
| ------------------- | ----------------------------------------------- |
| `pnpm dev`          | Levanta backend y frontend en modo watch        |
| `pnpm build`        | Compila todo (respeta el orden de dependencias) |
| `pnpm lint`         | ESLint en todos los paquetes                    |
| `pnpm typecheck`    | `tsc --noEmit` en todos los paquetes            |
| `pnpm test`         | Jest (backend) + Vitest (frontend)              |
| `pnpm format`       | Prettier (escritura)                            |
| `pnpm format:check` | Prettier (verificación, ideal para CI)          |

Para un solo paquete: `pnpm --filter @vm/backend test:e2e` (necesita la base de test,
`TEST_DATABASE_URL`; la vacía en cada corrida). Un requisito concreto:
`pnpm --filter @vm/backend test:e2e -t "RF-virtual-machines-06"` (sin `--`).

| Script del backend                                                                 | Descripción                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm --filter @vm/backend db:migrate`                                             | Compila y aplica las migraciones pendientes                              |
| `pnpm --filter @vm/backend db:seed`                                                | Crea los usuarios de prueba si no existen y las VMs de ejemplo si no hay |
| `pnpm --filter @vm/backend db:migration:generate src/database/migrations/<Nombre>` | Genera una migración a partir de las entidades                           |

## Limitaciones y próximos pasos

Es un **producto mínimo viable**: cubre de punta a punta lo que pide el producto, con seguridad y
pruebas donde hay riesgo, y deja fuera de alcance, a conciencia, lo siguiente. Cada punto está
anotado en el "Fuera de alcance" o en los riesgos de su spec o plan.

| Tema              | Hoy                                                                                                        | Próximo paso                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Listado           | Completo, sin paginar; sin búsqueda, filtros ni orden configurable                                         | Paginación en la API (la utilidad ya existe) y búsqueda en la UI            |
| Concurrencia      | Gana la última escritura; el frontend manda solo los campos cambiados para no pisar a otro Administrador   | Control de concurrencia optimista en la API (`If-Match` o versión)          |
| Tiempo real       | Difunde solo cambios de estado; altas, bajas y ediciones se ven al volver a la pestaña o al reconectar     | Difundir todas las mutaciones                                               |
| Escala horizontal | Una instancia: rate limit en memoria y Socket.io sin adapter                                               | `ThrottlerStorage` y adapter de Socket.io en Redis                          |
| Seguridad         | CSP de scripts con nonce como riesgo aceptado (React escapa el texto; un solo script inline, constante)    | CSP con nonce                                                               |
| Rate limit        | Solo en el login                                                                                           | También en los endpoints de VMs                                             |
| Dominio           | Todo Cliente ve todas las VMs; una VM es un registro, no una máquina real                                  | Asignar VMs a usuarios; integración con un hipervisor                       |
| Pruebas           | Unitarias, de componentes y e2e de la API; los requisitos Estándar se comprueban a mano en cada validación | E2E de navegador si crecen los Críticos sin test automático                 |
| Operación         | Sin CI ni despliegue automatizado                                                                          | CI con lint, typecheck, tests y build; trazabilidad automática spec ↔ tests |

Con más tiempo, cada uno de estos puntos merece su propia spec, y el criterio con el que se
decidieron se puede profundizar con uso real y más pruebas.

## Bitácora de IA

### 1. ¿Qué herramientas de IA se utilizaron?

| Herramienta                 | Para qué                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code** (Anthropic) | Agente de terminal: borradores de specs, planes y tareas; implementación; tests; verificación en una copia limpia y en el navegador; revisión local con agentes revisores       |
| **Context7** (servidor MCP) | Documentación oficial y vigente de cada librería, consultada antes de usarla (constitución C11): Nest 11, Next 16, TypeORM 1, Zod 4, Socket.io 4, TanStack Query 5, Recharts 3… |

La IA no trabajó "a mano alzada": el repositorio la configura para que siga las reglas del
proyecto, y esa configuración se versiona con el código.

- **`CLAUDE.md`** en la raíz y en cada app: stack, comandos, convenciones y el mapa de reglas.
- **[`docs/constitution.md`](docs/constitution.md):** los principios no negociables, que el agente
  cita por ID en cada puerta de aprobación.
- **`.claude/rules/`:** reglas por tema (estilo de código, monorepo, contratos compartidos, Nest,
  componentes, formularios, íconos), que se cargan solas según los archivos que se tocan.
- **`.claude/agents/`:** revisores con contexto propio (`code-reviewer`, `api-reviewer`,
  `frontend-reviewer`, `security-auditor`) para la revisión local antes de cerrar cada cambio.
- **`.claude/skills/`:** `/sdd` para el flujo de trabajo y skills por app (`add-endpoint`,
  `generate-module`, `generate-component`, …).
- **Hook `scripts/sdd-gate.mjs`:** un freno técnico que pide confirmación si el agente intenta
  editar `apps/` o `packages/` sin un `tasks.md` aprobado.

### 2. ¿Qué se delegó y dónde hubo que intervenir?

La regla de trabajo fue **primero los requisitos, después el prompt**. La IA no recibió "haz un
login" o "haz un CRUD": recibió el problema, las restricciones y los criterios de aceptación, y lo
que no estaba decidido lo marcó como `[NECESITA ACLARACIÓN]` y lo preguntó en vez de inventarlo
(C4). Un buen requisito de entrada fue lo que más mejoró la calidad de la salida.

**Delegado a la IA (el trabajo pesado, siempre bajo una spec aprobada):**

- Borradores de las specs (requisitos en EARS con su criticidad), los planes y las tareas.
- Implementación: módulos de Nest (sesión revocable en cookie, guards, rate limit, CRUD de VMs,
  gateway de Socket.io), migraciones, schemas Zod compartidos, y componentes, hooks y formularios
  del frontend.
- Los tests de los requisitos Críticos (Jest + supertest sobre PostgreSQL real, Vitest).
- La verificación: copia limpia del repositorio, navegador sin interfaz contra la API real y
  revisión local con los agentes revisores.
- La redacción de la documentación, incluido este README.

**Intervención como desarrolladora (dirección, criterio y correcciones):**

| Área                    | Qué se decidió o corrigió                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requisitos              | Análisis y definición de los requisitos de cada capacidad antes de pedir nada, y respuesta a cada duda abierta del agente                                                                                                                                                                                                                                                                                                                                                                     |
| Proceso                 | Elección de **SDD** con constitución y puertas humanas: el agente se detiene tras la spec y tras el plan, y sin un "apruebo" explícito no toca el código. Lo refuerza un hook. Pruebas por riesgo en lugar de perseguir cobertura                                                                                                                                                                                                                                                             |
| Tecnologías y librerías | Elección propia del stack y de sus versiones fijadas (tabla de [Tecnologías](#tecnologías))                                                                                                                                                                                                                                                                                                                                                                                                   |
| Estructura              | Monorepo `apps/` + `packages/` con contratos compartidos; Controller → Service → Repository en el backend; Atomic Design + `features/` en el frontend                                                                                                                                                                                                                                                                                                                                         |
| Estilos                 | Identidad visual con paleta cerrada (azul, cian, azul marino), dark mode nativo, shadcn/ui adaptado sin su CLI e íconos propios                                                                                                                                                                                                                                                                                                                                                               |
| Seguridad               | Una spec del frontend de `auth` no se aprobó: se pidió "no asumas nada, analiza y valida si lo anterior sería lo más óptimo, escalable y seguro teniendo en cuenta OWASP". El análisis encontró fallas reales: páginas que se podían enmarcar (clickjacking), la contraseña en la URL si el formulario se enviaba antes de cargar el JavaScript y páginas privadas recuperables con Atrás tras cerrar sesión. Además, las contraseñas pasaron de scrypt, la propuesta inicial, a **Argon2id** |
| Alcance                 | No aceptar funcionalidades ni datos de ejemplo que ninguna spec pidiera: el proyecto crece solo por specs aprobadas                                                                                                                                                                                                                                                                                                                                                                           |

Es un **producto mínimo viable**: todavía admite mejoras (ver
[Limitaciones y próximos pasos](#limitaciones-y-próximos-pasos)), y con más tiempo cada decisión
se podría revisar con un criterio más profundo para lograr mejores resultados.

### 3. Prompts clave

**Prompt 1.** _Problema que resolvió:_

```text

```

**Prompt 2.** _Problema que resolvió:_

```text

```
