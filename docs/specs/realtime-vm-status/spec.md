# Especificación — Estado de las VMs en tiempo real

| Campo                         | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado                        | vigente (backend RF-realtime-vm-status-01…10 y frontend RF-realtime-vm-status-11…16)                                                                                                                                                                                                                                                                                                                                                                        |
| Aprobada por / fecha          | Dayanna — 2026-10-10 (puerta G1, backend); Dayanna — 2026-10-11 (puerta G1, delta del frontend)                                                                                                                                                                                                                                                                                                                                                             |
| Capacidad                     | `realtime-vm-status`                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Responsable                   | Dayanna                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Constitución                  | revisada contra v1.0.0                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Última verificación vs código | 2026-10-11 (frontend: árbol de trabajo sobre `179a83c`; lo sella el commit de Dayanna)                                                                                                                                                                                                                                                                                                                                                                      |
| Código                        | Backend: `apps/backend/src/modules/realtime/`, `apps/backend/src/modules/auth/auth.events.ts`, `apps/backend/src/modules/virtual-machines/virtual-machine.events.ts`, `apps/backend/src/shared/utils/origin.util.ts`, `apps/backend/src/shared/utils/security-headers.util.ts`, `packages/shared-types/src/realtime/`. Frontend: `apps/frontend/src/lib/realtime/`, `apps/frontend/src/components/realtime/`, `apps/frontend/src/lib/vms/apply-vm-event.ts` |

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

### Frontend (cambio `2026-10-11-frontend-vms`)

Con el backend vigente, ninguna pantalla escucha el socket: un cambio de estado hecho por un
Administrador solo se ve en otra pantalla al recargar. Este delta conecta el panel al socket,
aplica cada `vm:status-changed` sobre el listado de VMs que se ve (la regla de versiones es
RF-virtual-machines-24), resalta la tarjeta que cambió y vuelve a sincronizar el listado cada vez
que la conexión se establece. El panel de recursos (spec `resource-dashboard`) se recalcula solo,
porque suma ese mismo listado.

Nace en el cambio `2026-10-11-frontend-vms`, junto con el frontend de `virtual-machines`; el
análisis OWASP del cambio está en esa spec ("Análisis OWASP del frontend de VMs"). Los hallazgos que
tocan esta capacidad son V4 (validar el payload de cada evento) y V5 (el cliente de Socket.io no se
reconecta solo tras un cierre del servidor ni tras un rechazo del handshake).

**Supuestos:**

| Supuesto                                                                                       | Evidencia                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| El cliente usa la ruta sin barra final y solo WebSocket                                        | `REALTIME_CLIENT_OPTIONS` (`packages/shared-types/src/realtime/realtime-events.ts`), verificado a través de Next en el G4 del backend          |
| Tras `io server disconnect` o un rechazo del middleware del handshake, el cliente no reintenta | Socket.io v4, "Client socket instance" → `connect_error` y `disconnect` (`socket.active`), consultado con Context7 el 2026-10-11               |
| Una caída de red o un reinicio del backend sí se reconectan solos                              | Misma fuente: `transport close`, `ping timeout` y `transport error` reconectan                                                                 |
| El navegador manda la cookie `SameSite=Strict` en el upgrade del WebSocket al mismo origen     | **A verificar en el navegador:** el G4 del backend lo probó con `socket.io-client` desde Node. Verificación manual de RF-realtime-vm-status-11 |

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

### API (backend)

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

### Frontend

- **RF-realtime-vm-status-11** · crítico (K1, K3) — CUANDO se abre una página del panel, el
  sistema debe abrir **una** conexión Socket.io por pestaña, al mismo origen y con
  `REALTIME_CLIENT_OPTIONS` (`/api/socket.io`, sin barra final, solo WebSocket). La sesión viaja
  solo en la cookie que pone el navegador: el cliente no manda token ni credenciales en el `auth`
  del handshake, la query ni las cabeceras, y nunca usa la URL del backend (RF-app-shell-14). La
  conexión se mantiene al navegar entre páginas del panel y se cierra al salir de él; fuera del
  panel (`/login`, la 404) no hay conexión. El cliente no emite eventos
  (RF-realtime-vm-status-09).
- **RF-realtime-vm-status-12** · crítico (K3, K4) — CUANDO llega `vm:status-changed`, el sistema
  debe comprobar que el payload tenga la forma de `VmStatusChangedEvent`: una `VirtualMachine`
  completa, con `status` y `os` del catálogo y `updatedAt` en ISO 8601. Uno que no la tiene se
  ignora sin cambiar nada (hallazgo V4). Uno válido se aplica según RF-virtual-machines-24:
  - reemplaza la versión confirmada de la VM si es más reciente; si es más vieja, se descarta;
  - SI la VM no está en el listado (p. ej., otro Administrador la creó después de la última
    carga), ENTONCES el sistema vuelve a pedir el listado;
  - una VM con una eliminación pendiente no reaparece por un evento.
- **RF-realtime-vm-status-13** · estándar — CUANDO un evento cambia el estado que se ve en una
  tarjeta, la tarjeta debe resaltarse con una animación leve: un destello del color de acento
  (cian, `secondary`) que se desvanece en unos 2 s, sin mover el contenido ni robar el foco.
  - El cambio se anuncia a los lectores de pantalla en una región `polite`
    (`web-01 ahora está Encendida`).
  - Con `prefers-reduced-motion`, no hay animación: el cambio se ve en el estado de la tarjeta.
  - Un evento que no cambia lo que se ve no resalta nada; p. ej., la confirmación del cambio que el
    Administrador acaba de hacer en esa misma pestaña, que ya se mostraba (RF-virtual-machines-22).
  - Varios eventos seguidos de la misma VM reinician el resalte; no se acumulan.
- **RF-realtime-vm-status-14** · crítico (K5) — CUANDO la conexión se establece, la primera vez y
  en cada reconexión, el sistema debe volver a pedir el listado, sin skeleton y sin perder los
  cambios pendientes (RF-virtual-machines-24). Los eventos emitidos mientras no había conexión no
  se reenvían ("Fuera de alcance"), y entre la carga inicial del listado y la primera conexión
  puede perderse alguno. Es K5: sin esto, la pantalla queda desactualizada y nada lo avisa.
- **RF-realtime-vm-status-15** · crítico (K1) — Fin de la sesión (hallazgo V5):
  - SI el handshake se rechaza con `code: 'UNAUTHENTICATED'` (RF-realtime-vm-status-03),
    ENTONCES el sistema debe tratarlo como sesión expirada: carga completa de `/login` con el aviso
    `Tu sesión expiró. Inicia sesión de nuevo` (RF-auth-26), una sola vez aunque coincida con un
    `401` de otro pedido.
  - SI el servidor cierra la conexión (`io server disconnect`: logout, sesión vencida o usuario
    desactivado, RF-realtime-vm-status-08), ENTONCES el sistema debe verificar la sesión con
    `GET /api/auth/me`. Sin sesión (`401`), sigue RF-auth-26; con sesión, vuelve a conectar una
    vez.
  - Nunca reintenta en bucle con una sesión inválida.
- **RF-realtime-vm-status-16** · estándar — El panel debe mostrar el estado del tiempo real, con
  texto e ícono (el color nunca va solo), en un lugar fijo de la página:
  - `En vivo`: conectado;
  - `Conectando…`: primer intento o reconexión automática (sin red, backend reiniciado);
  - `Sin conexión en tiempo real`: tras un rechazo del handshake que no es de sesión (p. ej.,
    `INTERNAL_ERROR` o `Origin`). En ese caso el sistema reintenta solo, con esperas crecientes de
    1 s hasta un máximo de 30 s.

  Sin conexión, el panel sigue funcionando por REST: el listado, los formularios y la optimistic
  UI no dependen del socket. Un cambio de estado de la conexión no muestra toasts.

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
- **RNF-realtime-vm-status-06** — Frontend: cliente `socket.io-client` del mismo major que el
  servidor (4.x), con versión exacta, y un `Socket` tipado con `ServerToClientEvents` y
  `ClientToServerEvents`. Sin `any`, funciones de menos de 50 líneas, `'use client'` solo donde
  hace falta; `pnpm lint`, `pnpm typecheck` y `pnpm build` sin errores.
- **RNF-realtime-vm-status-07** — El `README.md` suma al contrato de tiempo real el lado del
  frontend: cuándo se conecta, cómo resincroniza, qué muestra el indicador y qué pasa al terminar la
  sesión. El diagrama cliente ↔ API ↔ tiempo real se actualiza si cambia.

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

**Frontend:**

- Administrador con dos pestañas que apaga una VM desde una: en la otra, la tarjeta cambia y se
  resalta; en la que hizo el cambio, no se resalta, porque ya lo mostraba (RF-realtime-vm-status-13).
- Un Cliente y un Administrador en dos navegadores: el Cliente ve el resalte y el panel de recursos
  recalculado al instante (RF-realtime-vm-status-12, 13; RF-resource-dashboard-03).
- Evento de una VM que este listado no tiene: se recarga el listado y aparece
  (RF-realtime-vm-status-12).
- Evento con `status: "encendida"`, sin `updatedAt` o sin `item`: se ignora (RF-realtime-vm-status-12).
- Evento atrasado, más viejo que la versión que trajo una carga del listado: se descarta
  (RF-realtime-vm-status-12, RF-virtual-machines-24).
- Red caída dos minutos: `Conectando…` y reconexión automática del cliente; al reconectar, se
  recarga el listado (RF-realtime-vm-status-14, 16).
- Backend reiniciado: el cliente se reconecta solo y recarga el listado (RF-realtime-vm-status-14).
- Base de datos caída durante el handshake (`INTERNAL_ERROR`): `Sin conexión en tiempo real` y
  reintentos; nunca lleva a `/login` (RF-realtime-vm-status-15, 16).
- Logout en otra pestaña: esta se recarga por RF-auth-33; si antes llega el cierre del socket, la
  verificación de sesión da `401` y lleva a `/login`. Las dos vías terminan en un solo destino
  (RF-realtime-vm-status-15).
- Pestaña abierta 7 días sin pedidos HTTP: el servidor cierra el socket, la verificación da `401`
  y se ve `/login` con el aviso de sesión expirada (RF-realtime-vm-status-15).
- Navegar del Panel a otra página del panel: la misma conexión, sin reconectar
  (RF-realtime-vm-status-11).

## Fuera de alcance

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
- En el frontend: notificaciones del sistema operativo o sonidos, un toast por cada evento (el
  resalte de la tarjeta basta) e historial de eventos.

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

El delta del frontend no cambia el contrato: lo consume tal como está. Si el plan agrega un schema
Zod del modelo `VirtualMachine` en `@vm/shared-types` para validar el payload (RF-12), no cambia su
forma.

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

### Delta del frontend (`2026-10-11-frontend-vms`)

| ID  | Aplica | Cómo se cumple                                                                                                                                      |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Todo el comportamiento del tiempo real en el navegador está en este delta antes de implementarse                                                    |
| C2  | Sí     | Spec antes que código, en el mismo PR que `virtual-machines` y `resource-dashboard`                                                                 |
| C3  | Sí     | G1 sobre las tres specs juntas; G2 sobre el plan y las tareas antes de tocar `apps/` y `packages/`                                                  |
| C4  | Sí     | Sin dudas propias: las del cambio (DF1–DF4) están en la spec `virtual-machines`                                                                     |
| C5  | Sí     | Sin discrepancias con el backend: el caso límite "Al reconectar, el frontend vuelve a pedir `GET /api/vms`" se amplía a la primera conexión (RF-14) |
| C6  | Sí     | RF-11, 12, 14 y 15 son Críticos (K1, K3, K4, K5): test con su ID, y además verificación manual en el navegador de RF-11. RF-13 y 16 son Estándar    |
| C7  | No     | Sin cambios en el backend                                                                                                                           |
| C8  | Sí     | El payload de cada evento se valida antes de aplicarse (V4); sesión solo por cookie (RF-11)                                                         |
| C9  | Sí     | RNF-realtime-vm-status-06                                                                                                                           |
| C10 | Sí     | El cliente usa la ruta, las opciones, los nombres de evento y los mapas de `@vm/shared-types`                                                       |
| C11 | Sí     | Cliente de Socket.io v4 consultado con Context7 (`connect_error`, `disconnect`, `socket.active`); el plan fija la versión                           |
| C12 | No     | Sin secretos ni variables de entorno nuevas                                                                                                         |

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
- **RF-realtime-vm-status-11 en el navegador** (sin E2E de navegador, `docs/testing.md`): con
  `pnpm dev` y `COOKIE_SECURE=false`, el Administrador en Chrome y el Cliente en otro perfil (o en
  Firefox), los dos en el Panel. En las DevTools → Network → WS de cada uno: una sola conexión a
  `ws://localhost:3000/api/socket.io?EIO=4&transport=websocket`, con la cookie de sesión en la
  petición y sin token en la URL. Al navegar entre páginas del panel, la conexión sigue siendo la
  misma. El Administrador apaga una VM encendida: en la pantalla del Cliente la tarjeta cambia y se
  resalta en menos de un segundo, y el total de cores del panel de recursos baja.
- **RF-realtime-vm-status-15 en el navegador:** con el Panel abierto, desactivar al usuario en la
  base como en el punto del plazo de 60 segundos. En como mucho 60 segundos la pestaña termina en
  `/login` con el aviso `Tu sesión expiró. Inicia sesión de nuevo`.

## Dudas abiertas

**Delta del frontend:** sin dudas propias; las del cambio (DF1–DF4) están en la spec
`virtual-machines`.

**Backend:** ninguna. Resueltas en la clarificación del 2026-10-10:

- **D1.** Solo se difunden los cambios reales de `status`; no se emite si un `PUT` trae el mismo
  estado, ni en altas, bajas o ediciones de otros campos (RF-realtime-vm-status-05, 06).
- **D2.** El nombre del evento había quedado sin escribir en el pedido: `vm:status-changed`, con la
  VM completa como payload (`{ item: VirtualMachine }`) (RF-realtime-vm-status-05).
- **D3.** Un socket cuya sesión termina se desconecta: al instante tras el logout y en como mucho
  60 s si vence o el usuario se desactiva (RF-realtime-vm-status-08).
- **D4.** Solo WebSocket, sin respaldo de long-polling (RF-realtime-vm-status-01).

## Historial

| Fecha      | Cambio                                                                                                                                                                                                                                                                                                                                                                                                   | PR  | Requisitos                                                | Aprobó                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------- | ------------------------ |
| 2026-10-10 | Creación: backend del tiempo real (Socket.io autenticado con la cookie, difusión de cambios de estado, desconexión al terminar la sesión)                                                                                                                                                                                                                                                                | —   | RF-realtime-vm-status-01…10, RNF-realtime-vm-status-01…05 | Dayanna (G1)             |
| 2026-10-10 | Delta en el plan: RF-10 excluye el rechazo del upgrade WebSocket y el preflight CORS, que Engine.IO responde sin middleware; verificación manual del plazo de 60 s de RF-08                                                                                                                                                                                                                              | —   | RF-realtime-vm-status-08, 10                              | Dayanna (G1, 2026-10-10) |
| 2026-10-10 | Delta tras la revisión local: RF-09, una conexión WebSocket abre un solo socket (un `CONNECT` repetido la cierra sin consultar la sesión); caso límite aceptado de logout simultáneo a un handshake (RF-08)                                                                                                                                                                                              | —   | RF-realtime-vm-status-08, 09                              | Dayanna (G1, 2026-10-10) |
| 2026-10-10 | Delta tras la verificación manual: la ruta del socket sin barra final (`addTrailingSlash: false`, `REALTIME_CLIENT_OPTIONS`), porque Next redirige con `308` las URLs con barra final y el upgrade no pasaba por el rewrite                                                                                                                                                                              | —   | RF-realtime-vm-status-01                                  | Dayanna (G1, 2026-10-10) |
| 2026-10-10 | Validación (G4): implementado y verificado; 37 tests e2e con ID en verde (136 en total); verificaciones manuales de RF-01/05 a través de Next y del plazo de RF-08 hechas; revisión local (code-reviewer, api-reviewer, security-auditor) con los hallazgos resueltos o aceptados                                                                                                                        | —   | RF-realtime-vm-status-01…10                               | Dayanna (G4)             |
| 2026-10-11 | Delta del frontend (cambio `2026-10-11-frontend-vms`): conexión por pestaña con la cookie, validación y aplicación de `vm:status-changed`, resalte de la tarjeta, resincronización en cada conexión, fin de sesión e indicador de conexión                                                                                                                                                               | —   | RF-realtime-vm-status-11…16, RNF-realtime-vm-status-06…07 | Dayanna (G1)             |
| 2026-10-11 | Validación (G4) del frontend: implementado y verificado. RF-11, 12, 14 y 15 con test (RF-15 con el cableado real de la sesión); verificaciones manuales en Chrome de RF-11 (una conexión, cookie en el handshake) y RF-15 (usuario desactivado → `/login` en 27 s). Tras la revisión: guarda del evento con límites e ISO 8601, y espera creciente ante cierres repetidos del servidor con sesión válida | —   | RF-realtime-vm-status-11…16                               | Dayanna (G4)             |
