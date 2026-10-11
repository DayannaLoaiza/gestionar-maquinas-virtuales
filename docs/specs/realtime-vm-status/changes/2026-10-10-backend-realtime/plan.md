# Plan — backend del tiempo real (realtime-vm-status)

Spec: `docs/specs/realtime-vm-status/spec.md` · Añade: módulo `realtime` (gateway Socket.io,
adapter, middleware del handshake, monitor de sesiones), eventos internos de VMs y de `auth`,
contrato de tiempo real en `@vm/shared-types` · Modifica: `VirtualMachineRepository.updateById` y
`VirtualMachinesService.update` (estado anterior y evento), `AuthService` (validar sin renovar,
evento de logout, sesiones terminadas), `SessionCookieService.read`, `OriginGuard` (regla de origen
compartida), `app.setup.ts`, `app.module.ts`, `package.json` del backend, `README.md` y la
documentación de módulos · Retira: nada · Constitución: v1.0.0

## Chequeo de constitución (puerta: antes de diseñar; se revisa en G2)

| ID  | Aplica | Cómo se cumple                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Cada tarea cita sus RF; nada fuera de la spec aprobada en G1 (y su delta de RF-10, que se aprueba junto con G2)                                                                                                                                                                                                                                                                                       |
| C2  | Sí     | El delta de RF-10 y la verificación manual de RF-08 entran a la spec antes del código, en el mismo PR                                                                                                                                                                                                                                                                                                 |
| C3  | Sí     | Sin "apruebo" en G2 no se toca `apps/` ni `packages/`                                                                                                                                                                                                                                                                                                                                                 |
| C4  | Sí     | Sin dudas abiertas; lo que surja al implementar se pregunta                                                                                                                                                                                                                                                                                                                                           |
| C5  | Sí     | RF-10 no se cumplía tal como estaba escrito (rechazo del upgrade y preflight sin middleware, ver "Revisión de arquitectura"): se reporta y se propone el delta. Los desvíos de la implementación van en "Desvíos durante la implementación"                                                                                                                                                           |
| C6  | Sí     | Los 10 RF son Críticos: cada uno con su test e2e con el ID en el nombre, más dos verificaciones manuales en la spec (RF-01/05 a través de Next, plazo de RF-08). No se retira ni debilita ningún test; los e2e de `auth` y `virtual-machines` deben seguir en verde                                                                                                                                   |
| C7  | Sí     | El gateway es el borde (como un controller): no inyecta repositorios; valida la sesión con `AuthService` y no tiene reglas de negocio. La regla "cambió el estado" vive en `VirtualMachinesService`; el estado anterior lo lee el repositorio. Los módulos se comunican por eventos internos, sin dependencias cruzadas                                                                               |
| C8  | Sí     | Borde del socket: `Origin` en `allowRequest` antes del upgrade (RF-04), cookie verificada con la misma lógica que el guard (RF-03), sin handlers de eventos entrantes y `maxHttpBufferSize` de 1 KB (RF-09), `helmet` en Engine.IO (RF-10). CORS sin `credentials`. A09: logs sin cookie ni token                                                                                                     |
| C9  | Sí     | Sin `any`: `Server` y `Socket` tipados con los mapas de eventos y `SocketData`; funciones < 50 líneas; early returns                                                                                                                                                                                                                                                                                  |
| C10 | Sí     | Ruta, nombres de evento, payload, mapas de eventos y datos del error del handshake en `@vm/shared-types` (`src/realtime/`). `@vm/shared-types` no importa `socket.io`: los mapas son tipos puros                                                                                                                                                                                                      |
| C11 | Sí     | Consultado el 2026-10-10: docs de Socket.io v4 (`engine.use`, `allowRequest`, `err.data` en `connect_error`; Context7), docs de Nest (gateways, opciones del decorador, `afterInit`; Context7), y el código publicado de `engine.io` 6.6.11, `socket.io` 4.8.3, `@nestjs/platform-socket.io` 11.2.7 y `@nestjs/event-emitter` 3.1.0 (descargados con `npm pack`), además del de Next 16.4.0 instalado |
| C12 | No     | Sin secretos ni variables de entorno nuevas                                                                                                                                                                                                                                                                                                                                                           |

Sin excepciones técnicas.

**Dependencias nuevas** (versiones exactas; `pnpm install` lo corres tú desde Windows, nunca desde
WSL):

| Paquete                      | Versión | Dónde             | Por qué esa versión                                                                           |
| ---------------------------- | ------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `@nestjs/websockets`         | 11.2.7  | `dependencies`    | La misma que `@nestjs/core` y `@nestjs/common` (11.2.7)                                       |
| `@nestjs/platform-socket.io` | 11.2.7  | `dependencies`    | Ídem; depende de `socket.io` 4.8.3 exacto                                                     |
| `socket.io`                  | 4.8.3   | `dependencies`    | El backend importa sus tipos (`Server`, `Socket`): se declara con la versión de la plataforma |
| `@nestjs/event-emitter`      | 3.1.0   | `dependencies`    | Última para Nest 11 (`peerDependencies` `^10 \|\| ^11`); la 12.x es para Nest 12              |
| `socket.io-client`           | 4.8.3   | `devDependencies` | Cliente de los e2e, la misma versión del protocolo que el servidor                            |

## Enfoque

**Recorrido de un evento** (lo que documentan los comentarios del código, RNF-04):

```text
PUT /api/vms/:id ─► VirtualMachinesService.update
                     ├─ repositorio: transacción con SELECT … FOR UPDATE → UPDATE → relectura
                     │  (devuelve la VM y su estado anterior)
                     ├─ si status cambió: EventEmitter2.emit('vm.status-changed', { item })
                     └─ responde 200 (el listener corre después: { async: true })
                                   │
                     RealtimeGateway @OnEvent('vm.status-changed')
                     └─ server.to('vms').emit('vm:status-changed', { item })  → todas las conexiones

POST /api/auth/logout ─► AuthService.logout → revoca → emit('auth.session-revoked', { sessionId })
                     RealtimeGateway @OnEvent → server.in('session:<id>').disconnectSockets(true)

cada 60 s ─► RealtimeSessionMonitor → ids de sesión de los sockets abiertos
          → AuthService.findEndedSessionIds(ids) (una consulta) → gateway.disconnectSessions(ended)
```

**Por qué eventos internos (`@nestjs/event-emitter`) y no inyectar el gateway en los services.**
Inyectarlo crearía `virtual-machines → realtime → auth` y, para el logout, `auth → realtime → auth`:
un ciclo. Con eventos, `virtual-machines` y `auth` solo anuncian lo que pasó y `realtime` escucha.
Ninguno de los dos sabe que existen los sockets. El listener corre con `{ async: true }`: la
difusión no demora la respuesta del `PUT`. `suppressErrors` vale `true` por defecto: un error del
listener se registra y nunca llega al `emit` (RF-07).

**Contratos (`@vm/shared-types`, `src/realtime/realtime-events.ts`).**

- `REALTIME_PATH = '/api/socket.io'`.
- `REALTIME_EVENTS = { VM_STATUS_CHANGED: 'vm:status-changed' } as const`.
- `interface VmStatusChangedEvent { item: VirtualMachine }`.
- `interface ServerToClientEvents { [REALTIME_EVENTS.VM_STATUS_CHANGED]: (event: VmStatusChangedEvent) => void }`.
- `type ClientToServerEvents = Record<string, never>`: el cliente no emite nada.
- `type RealtimeConnectionErrorData = ApiErrorBody['error']` (`{ message, code }`): el `data` del
  `connect_error`, con la misma forma que el error REST.

**Servidor y borde HTTP del socket.**

- `RealtimeGateway` con `@WebSocketGateway({ path: REALTIME_PATH, transports: ['websocket'],
serveClient: false, maxHttpBufferSize: 1024 })`: las opciones fijas quedan junto al gateway, y
  aunque faltara el adapter no habría polling ni un `/socket.io` público.
- `RealtimeIoAdapter extends IoAdapter` (`realtime-io.adapter.ts`). Agrega lo que depende de la
  configuración, que el decorador no puede leer:
  - `cors: { origin: CORS_ORIGIN, credentials: false }` (RF-04, RNF-auth-05).
  - `allowRequest`: rechaza con `403` un handshake cuyo `Origin` no esté en `CORS_ORIGIN`, antes del
    upgrade, y registra la IP (`warn`, RNF-03). Es la forma que documenta Socket.io ("Handling
    CORS"). Sin `Origin`, pasa (RF-04).
  - `engine.use(helmet(...))` con las mismas opciones que Express (RF-10) y
    `engine.use(cookieParser())`, para que el handshake lea la cookie igual que el guard.
  - Se registra en `configureHttpApp` con `app.useWebSocketAdapter(...)`, antes de `init()`: así
    `main.ts` y el harness de e2e lo usan igual.
- La regla de origen (`origin === undefined || allowed.has(origin)`) pasa a
  `shared/utils/origin.util.ts` (`isOriginAllowed`), y la usan `OriginGuard` y el adapter (DRY).
- La configuración de `helmet` pasa a `createSecurityHeaders(isProduction)` en `app.setup.ts`, y la
  usan Express y Engine.IO.

**Handshake (`handshake-auth.middleware.ts`).** Es una fábrica
`createHandshakeAuth(authService, sessionCookie, logger)` que devuelve el middleware de Socket.io
(`server.use`), registrado en `afterInit`:

1. Lee el token con `SessionCookieService.read(socket.request)`: solo la cookie. `auth`, la query y
   `Authorization` no se miran (RF-03).
2. Llama a `AuthService.verifySession(token)`, que valida sin renovar (RF-02).
3. Si sale bien, guarda `socket.data = { user, sessionId }` y llama `next()`.
4. Si lanza `UnauthenticatedException`, rechaza con un `Error` cuyo `data` es
   `exception.getResponse()`: el mismo `{ message, code }` que el `401`.
5. Cualquier otro error (base caída) termina en `{ message: 'Internal server error', code:
'INTERNAL_ERROR' }`, con el error real solo en el log (RNF-03).

**Gateway** (`realtime.gateway.ts`, tipado con `Server<ClientToServerEvents, ServerToClientEvents,
DefaultEventsMap, SocketData>`):

- `afterInit(server)` registra el middleware del handshake.
- `handleConnection(socket)` une el socket a la sala `vms` (todas las conexiones autenticadas) y a
  `session:<sessionId>`, y registra la conexión a nivel `debug`.
- **Sin `@SubscribeMessage`:** un evento entrante no tiene handler y Socket.io lo descarta (RF-09).
- `@OnEvent(VM_DOMAIN_EVENTS.STATUS_CHANGED, { async: true })` emite a la sala `vms`, dentro de un
  `try/catch` que registra el id de la VM si falla (RF-07).
- `@OnEvent(AUTH_DOMAIN_EVENTS.SESSION_REVOKED)` desconecta la sala de la sesión (RF-08).
- `openSessionIds()` usa `fetchSockets()` de la sala `vms` (memoria local) y devuelve los
  `sessionId` sin repetir.
- `disconnectSessions(ids, reason)` hace `in(session:<id>).disconnectSockets(true)` y deja una
  línea de log por sesión, con el id del usuario.

**Monitor de sesiones** (`realtime-session-monitor.ts`, provider del módulo):

- Con `setInterval` de 60 s (`unref()`), se arranca en `onApplicationBootstrap` y se limpia en
  `onModuleDestroy`.
- En cada ronda: `gateway.openSessionIds()`, después `authService.findEndedSessionIds(ids, now)` (una
  consulta `WHERE id IN (…)` con el usuario) y por último `gateway.disconnectSessions(ended)`.
- Un error en una ronda se registra y no tumba el proceso. Sin dependencia nueva
  (`@nestjs/schedule` no hace falta para un intervalo).

**`auth`** (sin cambiar su comportamiento HTTP):

- `AuthService.verifySession(token)`: la validación de `authenticate` sin la renovación. Las dos
  comparten un método privado, así no hay dos copias de las reglas de RF-auth-06.
- `AuthService.logout` emite `auth.session-revoked` con el `sessionId` tras revocar.
- `AuthService.findEndedSessionIds(ids, now)`: devuelve las sesiones de esa lista que ya no valen
  (no existen, revocadas, vencidas o de un usuario inactivo). Aplica `isSessionActive` (la única
  fuente de las reglas de expiración) sobre las filas de esos ids. El filtro por id va en la
  consulta; las reglas de tiempo no se duplican en SQL.
- `SessionRepository.findManyWithUser(ids)`: una consulta con `In(ids)` y la relación `user`.
- `SessionCookieService.read(request: { cookies?: unknown })`: acepta la petición de Express y la
  del handshake, que tienen las mismas cookies.
- `AuthModule` exporta además `SessionCookieService`.

**`virtual-machines`** (sin cambiar sus respuestas):

- `updateById` pasa a ser una transacción:
  1. `findOne` con `lock: { mode: 'pessimistic_write' }`; sin fila, `not-found`.
  2. `update`.
  3. Relectura.

  Devuelve `{ outcome: 'saved', vm, previousStatus }`. El bloqueo hace que dos `PUT` simultáneos
  vean el estado anterior real: el segundo `Encendida` encuentra la VM ya encendida y no emite
  (caso límite de la spec). Un `DELETE` concurrente sigue dando `404` y nunca revive la fila
  (RF-virtual-machines-10). El `409` del índice único sigue saliendo de `catchNameTaken`: la
  transacción se revierte y el error se traduce igual.

- `VirtualMachinesService.update` emite `vm.status-changed` con `{ item }`, la misma VM que
  devuelve, solo si `previousStatus !== vm.status` (RF-05, RF-06). `create` y `remove` no emiten.
- Eventos internos y sus payloads en `virtual-machine.events.ts` y `auth.events.ts` (constantes
  `as const`, tipos solo del backend).

**`AppModule`**: `EventEmitterModule.forRoot()` y `RealtimeModule`.

## Cambios por paquete

| Paquete            | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vm/shared-types` | `src/realtime/realtime-events.ts`, exportado en `src/index.ts`                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `@vm/backend`      | `package.json` (5 dependencias); `src/modules/realtime/` (module, gateway, adapter, middleware del handshake, monitor, tipos y constantes); `auth.service.ts`, `auth.events.ts`, `auth.module.ts`, `session.repository.ts`, `session-cookie.service.ts`, `origin.guard.ts`; `virtual-machine.repository.ts`, `virtual-machines.service.ts`, `virtual-machine.events.ts`; `shared/utils/origin.util.ts`; `app.setup.ts`, `app.module.ts`; tests e2e y `test/support/socket-helpers.ts` |
| `@vm/frontend`     | Nada (el frontend del tiempo real es un cambio posterior; el rewrite `/api/*` ya cubre `/api/socket.io`)                                                                                                                                                                                                                                                                                                                                                                              |
| Documentación      | `README.md` (contrato de tiempo real, Postman, diagrama, requisito de despliegue), `apps/backend/CLAUDE.md` (stack y módulos), `nestjs-patterns.md` ("Existing Modules" y una nota de gateways), `.claude/rules/shared-types.md` ("Hoy:"), `CLAUDE.md` raíz (capacidades implementadas), `docs/specs/README.md`                                                                                                                                                                       |

## Compatibilidad entre apps (`docs/sdd/README.md`)

Solo se agregan un endpoint de Socket.io y tipos; no cambia ningún contrato REST ni ningún código
de error existente. El frontend actual no se conecta al socket, así que backend y frontend se
despliegan en cualquier orden. El rewrite de Next ya reenvía `/api/socket.io` con su upgrade (ver
"Revisión de arquitectura"). Para producción, la spec deja el requisito de despliegue
(RF-realtime-vm-status-01): el proxy delante de Next tiene que reenviar el upgrade.

## Seguridad y permisos (C8)

- **A01 / CSWSH.**
  - Un `Origin` ajeno se rechaza antes del upgrade, aunque la cookie sea válida (`allowRequest`).
  - `SameSite=Strict` ya impide que la cookie viaje en un handshake cross-site; el control de
    `Origin` cubre los orígenes del mismo sitio que no están en la lista.
- **A07 / sesión.**
  - El handshake aplica las mismas reglas que RF-auth-06, sin renovar la sesión.
  - El logout corta los sockets de esa sesión al instante, y la revalidación cada 60 s corta los
    vencidos y los de usuarios desactivados.
  - El token solo se acepta desde la cookie.
- **Superficie mínima:** ningún evento entrante tiene handler, mensajes de hasta 1 KB, sin polling
  y sin servir el cliente JS (`serveClient: false`).
- **A02 / cabeceras.** `helmet` en Engine.IO con la configuración de Express. CORS con la lista
  explícita y sin `credentials`.
- **A09.**
  - Los rechazos (origen, sesión) y las desconexiones forzadas van a `warn`, con la IP o el id de
    usuario. Nunca la cookie, el token ni el `sessionId`.
  - Los errores al emitir van a `error`.
- **Fuga de información.** El evento lleva la VM como `VirtualMachine` (sin `createdBy`,
  RF-virtual-machines-11). Un error interno del handshake sale genérico.

## Pruebas por requisito (`docs/testing.md`)

Todos son e2e sobre `AppModule` con la base de test, en dos archivos nuevos:

- `test/realtime.e2e-spec.ts`: difusión y fin de sesión.
- `test/realtime-handshake.e2e-spec.ts`: arranque, autenticación, origen, canal y cabeceras.

El servidor escucha en un puerto efímero (`app.listen(0)`), y los clientes son `socket.io-client`
con `transports: ['websocket']`, `reconnection: false` y la cookie y el `Origin` en `extraHeaders`.
Helpers en `test/support/socket-helpers.ts`: conectar, esperar `connect`, `connect_error`,
`disconnect` o un evento, y **centinela**. Para afirmar que algo **no** emitió sin esperar un tiempo
fijo, después se hace un cambio que sí emite y se verifica que el primer evento recibido es el del
centinela: es determinista y no depende de tiempos.

| RF                       | Criticidad | Test          | Qué verifica                                                                                                                                                                                                                                                                                                                                                                                                    | Archivo              |
| ------------------------ | ---------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| RF-realtime-vm-status-01 | K5         | HTTP + socket | Un cliente con cookie válida se conecta por WebSocket en `/api/socket.io`, en el mismo puerto que la API; un handshake por long-polling (`GET /api/socket.io/?EIO=4&transport=polling`) recibe `400`                                                                                                                                                                                                            | `realtime-handshake` |
| RF-realtime-vm-status-02 | K1         | socket        | Administrador y Cliente se conectan. Con `last_used_at` de hace 10 minutos, conectarse no lo cambia, y el `101` no trae `Set-Cookie` (upgrade manual con `node:http`)                                                                                                                                                                                                                                           | `realtime-handshake` |
| RF-realtime-vm-status-03 | K1         | socket        | `it.each`: sin cookie, token alterado, sesión revocada, vencida (`last_used_at` de hace 8 días), usuario inactivo, token válido solo en `auth`, en la query o en `Authorization`. Cada caso da `connect_error` con `data` `{ code: 'UNAUTHENTICATED', message }` (el de `auth`). Con la consulta de sesión fallando (espía del repositorio que rechaza), `INTERNAL_ERROR`                                       | `realtime-handshake` |
| RF-realtime-vm-status-04 | K1         | socket + HTTP | Con cookie válida, `Origin` `http://evil.test` y `http://localhost:3000.evil.com` dan `connect_error` sin `data`. Sin `Origin` y con el permitido, conecta. Una petición al endpoint con el `Origin` permitido recibe `Access-Control-Allow-Origin` con ese origen y sin `Access-Control-Allow-Credentials`                                                                                                     | `realtime-handshake` |
| RF-realtime-vm-status-05 | K3, K5     | socket + HTTP | Con un Cliente y un Administrador con dos conexiones, un `PUT` que cambia `status` hace que cada conexión reciba **un** `vm:status-changed` con `item` igual al cuerpo del `PUT` y `GET /api/vms` muestre ese estado. Un `PUT` que cambia `status` y `name` lleva el nombre nuevo. Dos `PUT` simultáneos a `Encendida` producen un solo evento (centinela)                                                      | `realtime`           |
| RF-realtime-vm-status-06 | K4         | socket + HTTP | Ningún evento (centinela) tras: un `PUT` sin `status`, uno con el mismo `status`, un `400`, un `403` del Cliente, un `404`, un `409`, un `POST` con `Encendida` y un `DELETE`                                                                                                                                                                                                                                   | `realtime`           |
| RF-realtime-vm-status-07 | K5         | socket + HTTP | Con el `to()` del servidor espiado para que lance, el `PUT` responde `200`, el cambio queda en `GET` y el error se registra (espía de `Logger.prototype.error`). Después, sin el espía, el siguiente cambio sí se difunde                                                                                                                                                                                       | `realtime`           |
| RF-realtime-vm-status-08 | K1         | socket + HTTP | El logout cierra al instante las dos conexiones de esa sesión (motivo `io server disconnect`) y no la de otra sesión del mismo usuario. Con la sesión vencida en la base, o el usuario desactivado, una ronda del monitor (`revalidateOpenSessions()`) cierra esa conexión y deja abierta una válida                                                                                                            | `realtime`           |
| RF-realtime-vm-status-09 | K1         | socket + HTTP | Un cliente emite `vm:update` con un cuerpo de cambio: la VM no cambia y la conexión sigue recibiendo eventos (centinela). Un mensaje de más de 1 KB cierra la conexión. Con el primer handshake retenido (espía de `verifySession` con una promesa pendiente), otros `CONNECT` por la misma conexión (`engine.send`) la cierran y `verifySession` se llama una sola vez (delta aprobado tras la revisión local) | `realtime-handshake` |
| RF-realtime-vm-status-10 | K1         | HTTP          | El `400` al handshake por polling y el `101` del upgrade (manual con `node:http`) llevan `X-Content-Type-Options: nosniff`, `Content-Security-Policy` y `X-Frame-Options`, sin `X-Powered-By`                                                                                                                                                                                                                   | `realtime-handshake` |

El intervalo real de 60 s de RF-08 no se automatiza (un test que espera 60 s es lento y frágil): va
en la verificación manual de la spec. Se automatiza la ronda, que es la que decide.

### Tests que se retiran o reescriben

Ninguno. Siguen en verde sin cambios:

- `virtual-machines*.e2e-spec.ts`, que protegen el `updateById` con transacción: RF-virtual-machines-06,
  07, 10 y 12.
- `auth*.e2e-spec.ts`, que protegen el logout y el guard.

## Revisión de arquitectura

| Hallazgo                                                                                                                                                        | Evidencia (archivo:línea o doc oficial)                                                                                                                                                                                                       | Cambio                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| El rewrite externo de Next reenvía el upgrade de WebSocket; el proxy de `ws` no aplica el `proxyTimeout` de 30 s                                                | `next` 16.4.0 `dist/server/lib/router-server.js:797` (`proxyRequest(req, socket, …)` en `upgradeHandler`); `dist/server/lib/router-utils/proxy-request.js:34` (`ws: true`) y `:37`                                                            | Ruta `/api/socket.io`, dentro del rewrite existente               |
| El bloqueo cross-site del dev server de Next solo aplica a `/_next` y `/__nextjs`                                                                               | `next` 16.4.0 `dist/server/lib/router-utils/block-cross-site-dev.js:64` y `:85` (`isInternalEndpoint`)                                                                                                                                        | Ninguno                                                           |
| Los middlewares de Engine.IO corren antes de `verify`, también en el upgrade; sus cabeceras van al `101` y a los rechazos HTTP (`abortRequest` usa `writeHead`) | `engine.io` 6.6.11 `build/server.js:562` y `:599` (`_applyMiddlewares`), `:491` (`headers` del `ws`), `:726` (`abortRequest`); Socket.io v4 docs, "Middlewares › Compatibility with Express middleware" (`io.engine.use(helmet())`, Context7) | `engine.use(helmet(...))` en el adapter                           |
| El rechazo de un upgrade se escribe directo en el socket (`400` fijo, sin cabeceras de middleware), y CORS es el primer middleware y responde el preflight      | `engine.io` 6.6.11 `build/server.js:744-760` (`abortUpgrade`) y `:68-69` (`this.use(require("cors")(…))`)                                                                                                                                     | **Delta de la spec:** RF-10 los excluye de forma explícita (C5)   |
| `allowRequest` corre solo en el handshake, antes del upgrade, y responde `403`                                                                                  | `engine.io` 6.6.11 `build/server.js:170-178`; Socket.io v4 docs, "Handling CORS" (Context7)                                                                                                                                                   | Control de `Origin` en `allowRequest`                             |
| `maxHttpBufferSize` es el `maxPayload` del WebSocket                                                                                                            | `engine.io` 6.6.11 `build/server.js:488`                                                                                                                                                                                                      | `maxHttpBufferSize: 1024` (RF-09)                                 |
| Un error de `next(err)` en `io.use` llega al cliente como `connect_error` con `err.data`                                                                        | Socket.io v4 docs, "Middlewares › Handling middleware error" (Context7)                                                                                                                                                                       | `data` con el `{ message, code }` de la excepción                 |
| `IoAdapter.createIOServer(port, options)` reutiliza el servidor HTTP con `port === 0`; las opciones del decorador llegan ahí                                    | `@nestjs/platform-socket.io` 11.2.7 `adapters/io-adapter.js:31`; docs de Nest, "Gateways" (Context7)                                                                                                                                          | Subclase que agrega `cors` y `allowRequest` desde `ConfigService` |
| Los listeners de `@OnEvent` se envuelven en `try/catch` async y `suppressErrors` vale `true` por defecto: un error nunca vuelve al `emit`                       | `@nestjs/event-emitter` 3.1.0 `dist/event-subscribers.loader.js:106` y `:111`                                                                                                                                                                 | `{ async: true }` y log propio con el id de la VM                 |
| `authenticate` renueva la sesión (escribe y emite un token nuevo); en un handshake, la cookie nueva no llegaría al navegador                                    | `apps/backend/src/modules/auth/auth.service.ts:83` y `:94`                                                                                                                                                                                    | `verifySession` sin renovar (RF-02), con la validación compartida |
| `SessionCookieService.read` está tipado con el `Request` de Express                                                                                             | `apps/backend/src/modules/auth/session-cookie.service.ts:27`                                                                                                                                                                                  | Parámetro `{ cookies?: unknown }`                                 |
| `updateById` hace `UPDATE` y relectura sin saber el estado anterior, y no es atómico                                                                            | `apps/backend/src/modules/virtual-machines/virtual-machine.repository.ts:87` y `:95`                                                                                                                                                          | Transacción con `pessimistic_write` que devuelve `previousStatus` |
| La regla de origen vive dentro de `OriginGuard`                                                                                                                 | `apps/backend/src/modules/auth/guards/origin.guard.ts:33`                                                                                                                                                                                     | `isOriginAllowed` en `shared/utils/origin.util.ts`                |
| La configuración de `helmet` vive dentro de `configureHttpApp`                                                                                                  | `apps/backend/src/app.setup.ts:38`                                                                                                                                                                                                            | `createSecurityHeaders(isProduction)` compartida                  |

## Riesgos y decisiones (incluidas las que trascienden el cambio)

- **`pnpm install` desde Windows.** Cambio `apps/backend/package.json` y me detengo (⏸ en T1) para
  que corras `pnpm install` en la raíz desde tu terminal de Windows. Para verificar, copio el repo
  al scratchpad e instalo ahí, como en los cambios anteriores.
- **Cierre del servidor en los e2e.** `io.close()` también cierra el servidor HTTP que comparte con
  Nest. Si `app.close()` del harness falla o deja handles abiertos, lo resuelvo en el gateway o en el
  adapter, sin tocar los tests existentes. Si no se puede, me detengo y pregunto.
- **Costo extra del `PUT`:** una transacción con `SELECT … FOR UPDATE` (una consulta más). Es
  despreciable para el volumen esperado, y además corrige la carrera de leer el estado anterior.
- **Revalidación cada 60 s:** una consulta por ronda, sea cual sea el número de conexiones. Con
  miles de sesiones abiertas, la lista de `IN (…)` crece; si llegara a pesar, se parte en lotes.
- **Instancia única.** `fetchSockets` y `disconnectSockets` son locales. Con varias instancias y el
  adapter de Redis funcionarían en todo el clúster, pero eso queda fuera de alcance.
- **Verificación desde WSL.** e2e contra `TEST_DATABASE_URL` en la copia del scratchpad. Si la base
  no es accesible desde WSL, me detengo y te pido que corras los e2e desde Windows.
- **Lo que viene para el frontend:** `socket.io-client` con `path: REALTIME_PATH` y
  `transports: ['websocket']`, tipado con `ServerToClientEvents`. Al reconectar, vuelve a pedir
  `GET /api/vms`.

## Desvíos durante la implementación

Ninguno cambia comportamiento ni contratos; todos son de forma o de ubicación.

- **`createSecurityHeaders` vive en `shared/utils/security-headers.util.ts`**, no en
  `app.setup.ts`: `app.setup.ts` importa el adapter, y si el adapter importara `app.setup.ts`
  habría un ciclo.
- **`UNAUTHENTICATED_ERROR`** (`shared/exceptions/auth.exceptions.ts`): una constante con el
  `{ message, code }` de la sesión inválida, que comparten `UnauthenticatedException` y el rechazo
  del handshake. Así no hay dos copias del texto (DRY). El `401` no cambia.
- **`SessionCookieService.read(request: IncomingMessage)`** en lugar de `{ cookies?: unknown }`:
  TypeScript rechaza pasar un `IncomingMessage` a un tipo con todas sus propiedades opcionales
  ("weak type"). El valor se lee con `'cookies' in request`, sin casts.
- **`SessionRevokedEvent` lleva también `userId`**, para la línea de log de la desconexión forzada
  (RNF-realtime-vm-status-03).
- **`RealtimeIoAdapter.createIOServer` devuelve `unknown`**, con un `instanceof Server` antes de
  configurar Engine.IO: la base devuelve `any`, y tiparlo como `Server` es un `no-unsafe-return` de
  `strictTypeChecked`.
- **`RealtimeEvent`** (tipo del objeto `REALTIME_EVENTS`) en `@vm/shared-types`, por la convención
  "objeto `as const` + tipo".
- **Sesiones de los e2e con `AuthService.login`** (`sessionCookieFor` en `socket-helpers.ts`), no
  por `POST /api/auth/login`: el rate limit del login (5 por minuto) no deja crear en una misma app
  las sesiones que necesita cada archivo.
- **README:** además de lo de RNF-05, se actualizaron la nota "Estado" y la sección "Estructura",
  que no mencionaban el backend de `virtual-machines` (estaban desactualizadas desde el cambio
  anterior; C5).
- **Comprobación de que el centinela detecta fallos** (no queda en el repo): en la copia del
  scratchpad, con el service emitiendo en todo `PUT`, los dos casos de RF-06 con `PUT` exitoso sin
  cambio de estado fallaron, como se esperaba. Después se restauró el archivo.
- **Correcciones de la revisión local** (`code-reviewer`, `api-reviewer`, `security-auditor`):
  - El monitor revisa **cada 30 s**, no cada 60: el intervalo más la duración de una ronda podía
    pasar apenas de los 60 s que admite RF-realtime-vm-status-08. Son dos consultas por minuto en
    lugar de una.
  - `disconnectSession` deja la línea de log solo si la sesión tenía conexiones: un logout sin
    sockets no es una desconexión forzada (RNF-realtime-vm-status-03).
  - `onSessionRevoked` atrapa y registra sus errores de forma explícita. `@nestjs/event-emitter` ya
    los atrapaba (`suppressErrors` vale `true` por defecto), así que el logout nunca podía responder
    `500`; ahora no depende de ese valor por defecto.
- **Ruta sin barra final (hallazgo de la verificación manual, delta aprobado).**
  - El problema: Socket.io pide por defecto `/api/socket.io/?EIO=4…`, con barra final. Next 16
    redirige con `308` las URLs con barra final, un upgrade redirigido se corta, y el socket no
    conectaba a través del rewrite.
  - Por qué los e2e no lo vieron: van directo a Nest.
  - La corrección: `addTrailingSlash: false` en el servidor (Engine.IO compara por prefijo, así que
    acepta la ruta con o sin barra) y `REALTIME_CLIENT_OPTIONS` para el cliente.
  - `REALTIME_GATEWAY_OPTIONS` pasa a tiparse con `Partial<ServerOptions>` de Socket.io:
    `GatewayMetadata` de Nest no declara `addTrailingSlash`.
  - La hipótesis de la revisión de arquitectura ("el rewrite reenvía el upgrade") era correcta, pero
    incompleta: faltaba esta redirección.
