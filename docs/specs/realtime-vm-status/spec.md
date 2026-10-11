# Especificación — Estado de las VMs en tiempo real

| Campo                         | Valor                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Estado                        | vigente                                                                                                                                                                                                                                                                                                      |
| Aprobada por / fecha          | Dayanna — 2026-10-10 (puerta G1)                                                                                                                                                                                                                                                                             |
| Capacidad                     | `realtime-vm-status`                                                                                                                                                                                                                                                                                         |
| Responsable                   | Dayanna                                                                                                                                                                                                                                                                                                      |
| Constitución                  | revisada contra v1.0.0                                                                                                                                                                                                                                                                                       |
| Última verificación vs código | 2026-10-10 (sobre `43474d7`, sin commitear)                                                                                                                                                                                                                                                                  |
| Código                        | `apps/backend/src/modules/realtime/`, `apps/backend/src/modules/auth/auth.events.ts`, `apps/backend/src/modules/virtual-machines/virtual-machine.events.ts`, `apps/backend/src/shared/utils/origin.util.ts`, `apps/backend/src/shared/utils/security-headers.util.ts`, `packages/shared-types/src/realtime/` |

## Contexto y objetivo

`docs/product.md` → "Tiempo real": si un Administrador cambia el estado de una VM (p. ej., de
`Apagada` a `Encendida`), la tarjeta de esa VM se actualiza al instante en la pantalla de **todos
los clientes conectados**. Hoy la API solo responde peticiones: quien no hizo el cambio no se entera
hasta volver a pedir `GET /api/vms`.

Esta spec cubre la parte de **backend**: un servidor Socket.io dentro de la misma API NestJS, la
autenticación de cada conexión con la cookie de sesión de `auth` y la difusión del cambio de estado
que hace `PUT /api/vms/:id`. El frontend (conectarse, actualizar la tarjeta con una animación leve,
volver a sincronizar al reconectar) entra en un cambio posterior de esta misma spec.

Usa sin cambiarlos la sesión de `auth` (RF-auth-05, RF-auth-06, RF-auth-08) y el `PUT` de
`virtual-machines` (RF-virtual-machines-07, RF-virtual-machines-12). Cómo se conecta el service de
VMs con el servidor de sockets (inyección directa o eventos internos, p. ej. `@nestjs/event-emitter`)
y cómo se organizan las salas se decide en el plan: aquí solo cuenta lo observable.

**Ruta del socket.** El navegador nunca llama directo al backend: todo pasa por el rewrite `/api/*`
de Next (`apps/frontend/next.config.ts`). Next 16.4 reenvía también el upgrade de WebSocket de una
ruta reescrita a un destino externo (`next/dist/server/lib/router-server.js`, `upgradeHandler`, que
llama a `proxyRequest`; `next/dist/server/lib/router-utils/proxy-request.js`, `ws: true`). Por eso
el socket vive en `/api/socket.io`: el navegador se conecta a su mismo origen, la cookie `HttpOnly`
viaja sola y CORS no hace falta para el navegador.

## Actores y permisos

Roles de `ROLES` (`@vm/shared-types`, spec `auth`). Todo usuario ve todas las VMs (spec
`virtual-machines`, "Fuera de alcance"), así que todas las conexiones autenticadas reciben todos los
eventos: no hay suscripción por VM ni por usuario.

| Actor         | Puede                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| Anónimo       | Nada: su conexión se rechaza (RF-realtime-vm-status-03)                                    |
| Cliente       | Conectarse y recibir eventos. No envía nada por el socket                                  |
| Administrador | Lo mismo que el Cliente. Sus cambios de estado por `PUT /api/vms/:id` originan los eventos |

## Requisitos funcionales (EARS)

- **RF-realtime-vm-status-01** · crítico (K5) — CUANDO la API arranca, el sistema debe aceptar
  conexiones Socket.io en la ruta `/api/socket.io`, en el mismo servidor y puerto HTTP de la API
  (`PORT`), sin abrir otro puerto y sin que el arranque falle por el servidor de sockets. El único
  transporte es WebSocket: un handshake por long-polling HTTP se rechaza con `400`. La ruta se
  acepta **sin barra final** (`/api/socket.io?EIO=4…`), que es como la pide el cliente
  (`REALTIME_CLIENT_OPTIONS`, `addTrailingSlash: false`). Next redirige con `308` las URLs con barra
  final, y un upgrade redirigido se corta: con la barra, el socket no pasaría por el rewrite.
  **Requisito de despliegue:** el proxy que esté delante de Next en producción debe reenviar el
  upgrade de WebSocket (`Upgrade` y `Connection`) en `/api/socket.io`.
- **RF-realtime-vm-status-02** · crítico (K1) — CUANDO llega un handshake con la cookie de una
  sesión válida (RF-auth-06), de un Administrador o de un Cliente, el sistema debe aceptar la
  conexión y, desde ese momento, entregarle los eventos de RF-realtime-vm-status-05. Validar la
  sesión en el handshake **no** la renueva ni reemite la cookie: solo las peticiones HTTP extienden
  la sesión (RF-auth-05), para que una pestaña abierta sin uso no la mantenga viva.
- **RF-realtime-vm-status-03** · crítico (K1) — SI el handshake llega sin cookie de sesión, o con un
  token alterado, mal firmado, expirado, de una sesión revocada o de un usuario inactivo o
  inexistente (los casos de RF-auth-06), ENTONCES el sistema debe rechazar la conexión con un
  `connect_error` cuyo `data` sea `{ code: 'UNAUTHENTICATED', message }`, con el mismo mensaje que
  el `401` de `auth`, sin entregarle ningún evento. El token solo se acepta desde la cookie: uno
  enviado en el `auth` del handshake, en la query o en la cabecera `Authorization` se ignora.
- **RF-realtime-vm-status-04** · crítico (K1) — SI el handshake trae una cabecera `Origin` que no
  está en `CORS_ORIGIN` (comparación exacta, como RF-auth-11), ENTONCES el sistema debe rechazar la
  conexión antes de validar la sesión, aunque la cookie sea válida. WebSocket no está sujeto a CORS:
  sin este control, una página de otro origen podría abrir un socket con la cookie de la víctima
  (Cross-Site WebSocket Hijacking). Un handshake sin `Origin` (Postman, clientes que no son
  navegador) sigue RF-realtime-vm-status-02 y 03. La configuración CORS del endpoint usa la misma
  lista `CORS_ORIGIN` y no habilita `credentials` (RNF-auth-05).
- **RF-realtime-vm-status-05** · crítico (K3, K5) — CUANDO un `PUT /api/vms/:id` responde `200` y
  el `status` guardado es distinto del que la VM tenía justo antes de ese `PUT`, el sistema debe
  emitir el evento `vm:status-changed` **una vez** a cada conexión autenticada en ese momento, de
  los dos roles e incluidas las del Administrador que hizo el cambio (sus otras pestañas). El
  payload es `VmStatusChangedEvent`: `{ item }`, con la VM completa como `VirtualMachine`
  (RF-virtual-machines-11), la misma que devuelve ese `PUT`. El evento sale después de que el
  cambio quedó guardado: quien lo recibe y pide `GET /api/vms` ve el mismo estado.
- **RF-realtime-vm-status-06** · crítico (K4) — SI el `PUT` no se completa (`400`, `401`, `403`,
  `404`, `409`, `500`), o se completa sin cambiar el `status` (no lo trae, o trae el que la VM ya
  tenía), ENTONCES el sistema no debe emitir ningún evento. `POST` y `DELETE` tampoco emiten.
- **RF-realtime-vm-status-07** · crítico (K5) — SI emitir el evento falla, ENTONCES la respuesta del
  `PUT` no debe cambiar (la VM ya se guardó: responde `200` con la VM actualizada) y el error debe
  quedar en el log del backend, nunca en silencio.
- **RF-realtime-vm-status-08** · crítico (K1) — SI la sesión de una conexión abierta deja de ser
  válida, ENTONCES el sistema debe desconectarla: de inmediato tras el `POST /api/auth/logout` de
  esa sesión (todas sus conexiones, en cualquier pestaña), y en como mucho 60 segundos si la sesión
  vence (RF-auth-05) o el usuario se desactiva. La desconexión la decide el servidor, así que el
  cliente de Socket.io no reintenta solo. Una conexión de otra sesión, aunque sea del mismo usuario,
  sigue abierta.
- **RF-realtime-vm-status-09** · crítico (K1) — El canal debe ser de solo bajada: el sistema no
  atiende eventos enviados por el cliente. Uno entrante se ignora sin cambiar datos ni salas, y un
  mensaje de más de 1 KB cierra la conexión. Una conexión WebSocket abre un solo socket: SI llega
  otro intento de conexión (paquete `CONNECT`) por la misma conexión, ENTONCES el sistema debe
  cerrarla sin consultar la sesión, para que un cliente no multiplique los handshakes ni las
  consultas a la base. Las mutaciones siguen solo por REST, con sus guards
  (RF-virtual-machines-02).
- **RF-realtime-vm-status-10** · crítico (K1) — Las respuestas del endpoint `/api/socket.io` que
  pasan por su cadena de middleware deben llevar las cabeceras de seguridad de RF-auth-10 y no
  llevar `X-Powered-By`. Son el `101` que acepta el WebSocket y las respuestas a peticiones HTTP
  comunes, también las de rechazo (p. ej., el `400` a un handshake por long-polling). El servidor
  de Socket.io atiende esa ruta antes que Express, así que no hereda `helmet` por sí solo. Quedan
  fuera dos respuestas sin contenido para una página, que no pasan por esa cadena:
  - el rechazo de un upgrade WebSocket, que Engine.IO escribe directo sobre el socket: un `400` con
    un texto fijo, que la API WebSocket del navegador no expone a la página;
  - el `204` sin cuerpo al preflight CORS, que responde el middleware CORS antes que `helmet`.

## Requisitos no funcionales

- **RNF-realtime-vm-status-01** — Eficiencia con muchas conexiones: un evento se arma una vez y se
  difunde a una sala de Socket.io, sin consultar la base ni recorrer las conexiones en código
  propio. El handshake hace las mismas consultas que validar una petición HTTP. La revalidación de
  las sesiones abiertas (RF-realtime-vm-status-08) es una consulta en bloque por ronda, no una por
  conexión.
- **RNF-realtime-vm-status-02** — El contrato vive en `@vm/shared-types` (C10): la ruta, los nombres
  de evento (objeto `as const`), el tipo del payload, los mapas `ServerToClientEvents` y
  `ClientToServerEvents` (vacío) y los códigos de error del handshake. El backend tipa su `Server`
  con esos mapas, y el frontend los usará para tipar su `Socket`.
- **RNF-realtime-vm-status-03** — Cada conexión rechazada (motivo: origen o sesión, e IP), cada
  desconexión forzada (motivo e id de usuario) y cada falla al emitir dejan una línea en el log del
  backend; las conexiones aceptadas y los eventos emitidos, a nivel `debug`. Nunca se registra la
  cookie ni el token (A09).
- **RNF-realtime-vm-status-04** — Sin `// TODO`, métodos vacíos ni implementaciones simuladas;
  tipado estricto, `pnpm lint` y `pnpm typecheck` sin errores ni advertencias. Un comentario explica
  el recorrido del evento donde cruza de módulo (de la mutación a la sala).
- **RNF-realtime-vm-status-05** — El `README.md` documenta el contrato de tiempo real (ruta,
  transporte, evento, payload y errores del handshake), cómo probarlo con Postman (petición
  Socket.IO) y el diagrama base cliente ↔ API ↔ tiempo real que pide `docs/product.md` →
  "Documentación que el README debe tener".

## Casos límite

- Administrador con dos pestañas que cambia el estado desde una: las dos reciben el evento
  (RF-realtime-vm-status-05).
- `PUT` que cambia `status` y `name` a la vez: un solo evento, con la VM completa, así que el
  payload ya lleva el nombre nuevo (RF-realtime-vm-status-05).
- `PUT` con el mismo `status` que ya tiene (`200`, RF-virtual-machines-12): ningún evento
  (RF-realtime-vm-status-06).
- `PUT` que cambia solo `name` o `ram`: ningún evento; las otras pantallas lo ven al volver a pedir
  el listado (RF-realtime-vm-status-06).
- `POST` de una VM ya `Encendida` o `DELETE` de una VM encendida: ningún evento
  (RF-realtime-vm-status-06).
- `PUT` de un Cliente (`403`), con cuerpo inválido (`400`), sobre un id inexistente (`404`) o con
  nombre repetido (`409`): ningún evento (RF-realtime-vm-status-06).
- Dos `PUT` simultáneos que ponen `Encendida` a la misma VM `Apagada`: un solo evento; el segundo ya
  la encuentra encendida (RF-realtime-vm-status-05, 06).
- Handshake con un token válido en `auth: { token }` y sin cookie: `UNAUTHENTICATED`
  (RF-realtime-vm-status-03).
- Handshake desde `http://localhost:3000.evil.com` con una cookie válida: rechazado
  (RF-realtime-vm-status-04).
- Base de datos caída durante el handshake: la conexión se rechaza con `code: 'INTERNAL_ERROR'`,
  nunca con `UNAUTHENTICATED`, que haría al frontend mandar a iniciar sesión a alguien con una
  sesión válida.
- Cliente que emite `vm:update` u otro evento por el socket: se ignora y la VM no cambia
  (RF-realtime-vm-status-09).
- Cliente que manda una ráfaga de paquetes `CONNECT` (`40`) por la misma conexión mientras su
  handshake se valida: la conexión se cierra y la sesión se consulta una sola vez
  (RF-realtime-vm-status-09).
- Conexión caída mientras se emite un evento: ese evento se pierde para ella; no hay reenvío. Al
  reconectar, el frontend vuelve a pedir `GET /api/vms` (cambio de frontend).
- Pestaña abierta 7 días sin peticiones HTTP: la sesión vence (RF-auth-05) aunque el socket siga
  abierto, y el servidor lo desconecta en como mucho 60 segundos (RF-realtime-vm-status-08).
- Logout en una pestaña: las conexiones de esa sesión en las demás pestañas se cierran al instante;
  las de otra sesión del mismo usuario (otro navegador) siguen (RF-realtime-vm-status-08).
- Logout en el mismo instante en que esa sesión completa un handshake (entre la validación de la
  sesión y la entrada del socket a sus salas): esa conexión no se cierra con el logout, sino en la
  siguiente revalidación, en como mucho 60 segundos (RF-realtime-vm-status-08). Riesgo aceptado:
  la ventana es de milisegundos, y la sesión ya está revocada para toda petición HTTP.
- Handshake por long-polling (`?transport=polling`): `400` (RF-realtime-vm-status-01).
- Dos Administradores cambian el estado de la misma VM en el mismo instante: los dos eventos pueden
  llegar en cualquier orden. Gana la última escritura (spec `virtual-machines`, "Fuera de alcance"),
  y el estado final es el que devuelve `GET /api/vms`. Riesgo aceptado: exige dos escrituras sobre
  la misma VM en milisegundos.
- Varias instancias del backend detrás de un balanceador: cada una difunde solo a sus conexiones
  (ver "Fuera de alcance").

## Fuera de alcance

- Frontend: conectarse, actualizar la tarjeta con la animación, volver a sincronizar al reconectar.
  Cambio posterior de esta spec.
- Difundir altas, bajas y ediciones que no cambian el estado (decidido en la clarificación, D1).
- Respaldo de long-polling para redes que bloquean WebSocket (D4).
- Varias instancias del backend (adapter de Redis): hoy hay una.
- Reenviar los eventos perdidos durante una desconexión (connection state recovery de Socket.io):
  el frontend vuelve a pedir el listado.
- Límite de conexiones por usuario o por IP, y rate limit del handshake.
- Comandos por socket (encender, apagar): las mutaciones siguen solo por REST.
- Suscripción selectiva (salas por VM o por usuario a pedido del cliente).
- Exponer quién hizo el cambio.
- Integración con un hipervisor real: el evento refleja un cambio de registro.

## Contratos visibles

| Elemento                  | Valor                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint                  | Socket.io en `/api/socket.io`, sin barra final, namespace `/`, mismo puerto que la API; por el rewrite de Next. El cliente usa `REALTIME_CLIENT_OPTIONS` (`path`, `transports: ['websocket']`, `addTrailingSlash: false`) |
| Transporte                | Solo WebSocket; un handshake por long-polling recibe `400`                                                                                                                                                                |
| Autenticación             | Cookie de sesión de `auth` en el handshake (`__Host-vm_session`, o `vm_session` fuera de producción)                                                                                                                      |
| Servidor → cliente        | `vm:status-changed` con `VmStatusChangedEvent`: `{ item: VirtualMachine }`                                                                                                                                                |
| Cliente → servidor        | Ninguno                                                                                                                                                                                                                   |
| Error de conexión         | `connect_error` con `data: { code, message }`: `UNAUTHENTICATED` (mensaje de `auth`) o `INTERNAL_ERROR` (`Internal server error`). El rechazo por `Origin` no lleva `data`: no es para un usuario legítimo                |
| Desconexión por el server | Motivo `io server disconnect` en el cliente (RF-realtime-vm-status-08)                                                                                                                                                    |

En `@vm/shared-types` (RNF-realtime-vm-status-02): la ruta, los nombres de evento, el payload, los
mapas de eventos y los códigos de error del handshake. No hay endpoints REST nuevos ni cambia
ninguno existente.

## Verificación contra la constitución

| ID  | Aplica | Cómo se cumple                                                                                                                                         |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Sí     | Todo el comportamiento del tiempo real está en esta spec antes de implementarse                                                                        |
| C2  | Sí     | Spec antes que código, en el mismo PR                                                                                                                  |
| C3  | Sí     | G1 sobre esta spec; G2 sobre plan y tareas antes de tocar `apps/` y `packages/`                                                                        |
| C4  | Sí     | Las cuatro dudas (D1–D4, incluido el nombre del evento, que el pedido dejó sin escribir) se resolvieron en la clarificación (2026-10-10)               |
| C5  | Sí     | RF-auth-10 dice "toda respuesta de la API" y el endpoint de Socket.io no pasa por Express: se reporta y se cubre con RF-realtime-vm-status-10          |
| C6  | Sí     | Todos los RF son Críticos (K1, K3, K4, K5): test con su ID. Además, verificación manual de RF-01 y 05 a través de Next, y del plazo de RF-08           |
| C7  | Sí     | El gateway no inyecta repositorios: valida la sesión con `AuthService` y el service de VMs origina el evento; detalle en el plan                       |
| C8  | Sí     | Borde del socket validado: `Origin` (RF-04), cookie (RF-03), sin eventos entrantes y con límite de tamaño (RF-09), cabeceras de `helmet` (RF-10)       |
| C9  | Sí     | Sin `any`, funciones < 50 líneas, eventos tipados (RNF-realtime-vm-status-02, 04)                                                                      |
| C10 | Sí     | Contrato de eventos en `@vm/shared-types` (RNF-realtime-vm-status-02)                                                                                  |
| C11 | Sí     | El plan consulta con Context7 `@nestjs/websockets`, `@nestjs/platform-socket.io`, Socket.io (servidor y cliente) y, si se usa, `@nestjs/event-emitter` |
| C12 | No     | Sin secretos ni variables de entorno nuevas                                                                                                            |

Sin excepciones.

## Verificación manual

- **RF-realtime-vm-status-01 y 05 a través de Next** (el e2e se conecta directo a Nest; pasar por
  el rewrite exige levantar el frontend): con `pnpm dev` y `COOKIE_SECURE=false`, login del
  Administrador en `http://localhost:3000/api/auth/login`. Un cliente `socket.io-client` 4 con
  `REALTIME_CLIENT_OPTIONS` (sin barra final), conectado a `http://localhost:3000` con la cookie
  `vm_session` y `Origin: http://localhost:3000`, y escuchando `vm:status-changed`: conecta por
  WebSocket. Un
  `PUT http://localhost:3000/api/vms/<id>` que cambia `status` hace llegar el evento a esa conexión,
  con `{ item }` igual a la respuesta del `PUT`.
- **RF-realtime-vm-status-08, plazo de 60 segundos** (el e2e ejecuta la revalidación directamente:
  esperar el intervalo real haría el test lento): con `pnpm dev` y una conexión abierta como en el
  punto anterior, desactivar al usuario en la base
  (`UPDATE users SET is_active = false WHERE email = '<email>'`). La conexión se cierra en como
  mucho 60 segundos, con el motivo `io server disconnect`, y el log del backend registra la
  desconexión forzada con el id del usuario.

## Dudas abiertas

Ninguna. Resueltas en la clarificación del 2026-10-10:

- **D1.** Solo se difunden los cambios reales de `status`; no se emite si un `PUT` trae el mismo
  estado, ni en altas, bajas o ediciones de otros campos (RF-realtime-vm-status-05, 06).
- **D2.** El nombre del evento había quedado sin escribir en el pedido: `vm:status-changed`, con la
  VM completa como payload (`{ item: VirtualMachine }`) (RF-realtime-vm-status-05).
- **D3.** Un socket cuya sesión termina se desconecta: al instante tras el logout y en como mucho
  60 s si vence o el usuario se desactiva (RF-realtime-vm-status-08).
- **D4.** Solo WebSocket, sin respaldo de long-polling (RF-realtime-vm-status-01).

## Historial

| Fecha      | Cambio                                                                                                                                                                                                                                                                            | PR  | Requisitos                                                | Aprobó                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------- | ------------------------ |
| 2026-10-10 | Creación: backend del tiempo real (Socket.io autenticado con la cookie, difusión de cambios de estado, desconexión al terminar la sesión)                                                                                                                                         | —   | RF-realtime-vm-status-01…10, RNF-realtime-vm-status-01…05 | Dayanna (G1)             |
| 2026-10-10 | Delta en el plan: RF-10 excluye el rechazo del upgrade WebSocket y el preflight CORS, que Engine.IO responde sin middleware; verificación manual del plazo de 60 s de RF-08                                                                                                       | —   | RF-realtime-vm-status-08, 10                              | Dayanna (G1, 2026-10-10) |
| 2026-10-10 | Delta tras la revisión local: RF-09, una conexión WebSocket abre un solo socket (un `CONNECT` repetido la cierra sin consultar la sesión); caso límite aceptado de logout simultáneo a un handshake (RF-08)                                                                       | —   | RF-realtime-vm-status-08, 09                              | Dayanna (G1, 2026-10-10) |
| 2026-10-10 | Delta tras la verificación manual: la ruta del socket sin barra final (`addTrailingSlash: false`, `REALTIME_CLIENT_OPTIONS`), porque Next redirige con `308` las URLs con barra final y el upgrade no pasaba por el rewrite                                                       | —   | RF-realtime-vm-status-01                                  | Dayanna (G1, 2026-10-10) |
| 2026-10-10 | Validación (G4): implementado y verificado; 37 tests e2e con ID en verde (136 en total); verificaciones manuales de RF-01/05 a través de Next y del plazo de RF-08 hechas; revisión local (code-reviewer, api-reviewer, security-auditor) con los hallazgos resueltos o aceptados | —   | RF-realtime-vm-status-01…10                               | Dayanna (G4)             |
