# Especificación — Máquinas virtuales

| Campo                         | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Estado                        | vigente (backend RF-virtual-machines-01…12, frontend RF-virtual-machines-13…27 y datos de ejemplo RF-virtual-machines-28)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Aprobada por / fecha          | Dayanna — 2026-10-10 (puerta G1, backend); Dayanna — 2026-10-11 (puerta G1, delta del frontend); Dayanna — 2026-10-11 (puerta G1+G2, delta de los datos de ejemplo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Capacidad                     | `virtual-machines`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Responsable                   | Dayanna                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Constitución                  | revisada contra v1.0.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Última verificación vs código | 2026-10-11 (frontend: árbol de trabajo sobre `179a83c`; lo sella el commit de Dayanna)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Código                        | Backend: `apps/backend/src/modules/virtual-machines/`, `apps/backend/src/shared/pipes/parse-id.pipe.ts`, `apps/backend/src/shared/exceptions/virtual-machine.exceptions.ts`, `packages/shared-types/src/virtual-machines/`, `packages/shared-types/src/dto/virtual-machine.dto.ts`, `apps/backend/src/database/seed.ts` y `apps/backend/src/database/sample-virtual-machines.ts` (datos de ejemplo). Frontend: `apps/frontend/src/features/vms/`, `apps/frontend/src/lib/vms/`, `apps/frontend/src/lib/query/`, `apps/frontend/src/schemas/vm-form.ts`, `apps/frontend/src/config/vms.ts`, `apps/frontend/src/config/panel.ts`, `apps/frontend/src/app/(panel)/page.tsx` |

## Contexto y objetivo

Con `auth` vigente, la API tiene sesión y roles pero ningún endpoint de negocio. Esta spec cubre la
parte de backend de `virtual-machines` (`docs/product.md` → "API › VMs"): el registro de máquinas
virtuales en PostgreSQL, la validación de cada campo en el borde y los cuatro endpoints del CRUD con
permisos por rol. El frontend (listado, formulario con validación en tiempo real, optimistic UI,
botones ocultos para el Cliente) entra en un cambio posterior de esta misma spec.

Una VM es un **registro**: crearla, encenderla o borrarla cambia una fila, no una máquina real en un
hipervisor. Esta capacidad usa los guards globales de `auth` (RF-auth-06, RF-auth-07, RF-auth-11)
y el contrato de error existente, sin cambiarlos.

### Frontend (cambio `2026-10-11-frontend-vms`)

Con el backend vigente, el frontend de `auth` (rol en la UI, `AdminOnly`) y la base del frontend
(`app-shell`), el panel todavía no muestra ninguna VM. Este delta agrega el listado en tarjetas,
los formularios de creación y edición con validación mientras se escribe, el encendido y apagado
desde la tarjeta, la eliminación con confirmación y la **optimistic UI**: cada operación se ve al
instante y se revierte limpia si la API la rechaza.

El mismo cambio agrega el panel de recursos (spec nueva `resource-dashboard`) y el frontend del
tiempo real (delta de `realtime-vm-status`). Los tres comparten un único estado de las VMs en el
cliente: el panel suma lo que muestra el listado, y los eventos de tiempo real actualizan ese mismo
listado. Por eso la regla que decide qué versión de cada VM se ve (RF-virtual-machines-24) vive en
esta spec y las otras dos la usan. Plan y tareas: `changes/2026-10-11-frontend-vms/`. Qué librería
maneja ese estado (la decisión abierta "Estado de servidor" de `docs/product.md`) se decide en el
plan.

Los controles de escritura usan la regla y el mecanismo de `auth` (RF-auth-30, RF-auth-31): no
existen en el DOM para un Cliente. La UI oculta; la API decide (RF-virtual-machines-02).

**Discrepancias reportadas (C5):**

- `docs/product.md` separa las rutas "Dashboard" y "Listado de VMs"; el pedido de este cambio pone
  el panel de recursos "en la parte superior" de la vista del listado. Decidido en DF1: las dos
  cosas viven en el Panel (`/`), y `docs/product.md` se actualiza en el mismo PR.
- `apps/frontend/.claude/rules/shadcn-ux-guide.md` pide una ruta propia para formularios de 4 o más
  campos (el de una VM tiene 6); el pedido admite "vistas o modales". Decidido en DF2: modal, y la
  regla se actualiza en el mismo PR.
- `apps/frontend/.claude/rules/forms-conventions.md` fija `mode: 'onBlur'` para la mayoría de los
  formularios y confirma con toast **después** de que el pedido responde. El pedido exige
  validación instantánea y una UI que no espera a la red: este formulario valida mientras se
  escribe y se cierra al enviar. La regla documenta ese caso en este cambio.
- RF-app-shell-11 deja el Panel con un estado vacío "hasta que la complete `resource-dashboard`", y
  RF-app-shell-02 lista una sola sección. Reciben un delta de texto en el mismo PR (C2).
- RF-auth-31 nombra "las futuras [rutas] de crear y editar una VM". Con DF2 no hay rutas solo de
  Administrador: recibe un delta de texto en el mismo PR. La regla sigue vigente para la primera
  que exista.

#### Análisis OWASP del frontend de VMs

Revisión del cambio `2026-10-11-frontend-vms` (este delta, `resource-dashboard` y el frontend de
`realtime-vm-status`) contra el OWASP Top 10:2025, la documentación de TanStack Query
(actualizaciones optimistas), Socket.io v4 (cliente) y Recharts 3, consultadas con Context7 el
2026-10-11, y contra el código.

**Supuestos verificados:**

| Supuesto                                                                              | Evidencia                                                                                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| El listado es completo y sin paginar: el cliente puede calcular totales y unicidad    | RF-virtual-machines-01; `virtual-machines.controller.ts` (`list()` sin parámetros)                                                    |
| `PUT` cambia solo los campos enviados                                                 | RF-virtual-machines-07; `UpdateVirtualMachineDTO` (`CreateVirtualMachineDTO.partial()`)                                               |
| Los campos de una VM se validan con el mismo schema en los dos lados                  | `packages/shared-types/src/dto/virtual-machine.dto.ts` (sin coerción: `"4"` falla), RNF-virtual-machines-06                           |
| El backend solo difunde cambios de `status`, no altas, bajas ni otras ediciones       | RF-realtime-vm-status-05 y 06 (D1 de esa spec)                                                                                        |
| Un `401` en un pedido del navegador ya lleva a `/login`, y `notify.apiError` lo calla | `apps/frontend/src/lib/api/fetch-wrapper.ts` (`handleSessionExpired`), `apps/frontend/src/components/ui/toast.ts` (`UNAUTHENTICATED`) |
| `AdminOnly` saca del DOM los controles para un Cliente                                | `apps/frontend/src/components/auth/admin-only.tsx`, con test (RF-auth-30)                                                             |
| Recharts 3 admite React 19 y trae accesibilidad por defecto                           | `pnpm view recharts` 3.10.1: `peerDependencies` `react ^19`, `react-is ^19`; Recharts 3: `accessibilityLayer` activo por defecto      |

**Hallazgos:**

| #   | Categoría                                       | Hallazgo                                                                                                                                                                                                                                                                                     | Evidencia                                                                                                                           | Lo resuelve                  |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| V1  | A06 Insecure Design (pérdida de escrituras, K2) | Un formulario de edición que envía todos los campos pisa con valores viejos un cambio hecho mientras estaba abierto: si otro Administrador encendió la VM, guardar un cambio de RAM la vuelve a apagar sin que nadie lo note                                                                 | RF-virtual-machines-07 (el `PUT` aplica lo que recibe); "Fuera de alcance": gana la última escritura                                | RF-virtual-machines-20       |
| V2  | A06 Insecure Design (K2, K4)                    | El patrón documentado de optimistic UI revierte a una **copia de toda la lista** tomada al empezar la mutación: un evento de tiempo real, otra mutación o una carga del listado que llegue mientras tanto se pierde al revertir, y la pantalla muestra un estado que el servidor ya no tiene | Documentación de TanStack Query, "Optimistic Updates" (`onMutate` guarda `previousTodos`; `onError` lo restaura)                    | RF-virtual-machines-24       |
| V3  | A01 Broken Access Control                       | Los controles de crear, editar, encender y eliminar no deben existir para un Cliente, ni en el HTML del servidor ni en el payload de React                                                                                                                                                   | RF-auth-30; `component-imports.md`, "Controles según el rol"                                                                        | RF-virtual-machines-14       |
| V4  | A08 Software or Data Integrity Failures (K3)    | El cliente tipa las respuestas y los eventos sin validarlos en tiempo de ejecución: un evento con otra forma (p. ej., de una versión distinta del backend, que se despliega por separado) corrompería el estado del listado y del panel                                                      | `fetch-wrapper.ts` (`payload.data as T`); hallazgo F7 de `auth`; `docs/sdd/README.md`, "Compatibilidad entre apps"                  | RF-realtime-vm-status-12     |
| V5  | A07 Authentication Failures                     | El socket no renueva la sesión y el servidor lo cierra al vencer (RF-realtime-vm-status-02 y 08); el cliente de Socket.io **no reintenta** tras un cierre del servidor ni tras un rechazo del handshake. Sin manejo, la pantalla quedaría "en vivo" sin estarlo, o con una sesión vencida    | Socket.io v4, "Client socket instance": `io server disconnect` y el error de un middleware no se reconectan solos (`socket.active`) | RF-realtime-vm-status-15, 16 |
| V6  | A03 Software Supply Chain Failures              | Dependencias nuevas en el navegador (Recharts y las suyas, cliente de Socket.io y, si el plan la elige, una librería de estado del servidor)                                                                                                                                                 | —                                                                                                                                   | RNF-virtual-machines-08      |
| V7  | A05 Injection (XSS)                             | El nombre de una VM aparece en tarjetas, tooltips del gráfico, toasts y anuncios para lectores de pantalla: siempre como texto. El patrón de nombres (RF-virtual-machines-05) ya excluye `<`, `>` y comillas, pero la defensa es no interpretar HTML                                         | React escapa el texto; el único `dangerouslySetInnerHTML` del frontend es el script constante del tema                              | RNF-virtual-machines-08      |
| —   | A10 Mishandling of Exceptional Conditions       | Correcto: los errores de la API se muestran con `toUserMessage`, que nunca muestra el detalle de un 5xx                                                                                                                                                                                      | `apps/frontend/src/lib/api/api-error.ts`                                                                                            | RF-virtual-machines-25       |

**Descartado:**

- **Validar con Zod cada respuesta de `GET /api/vms`:** la respuesta viene de la API propia por el
  mismo origen; un listado con otra forma es un error de despliegue que se ve al instante (la
  pantalla falla), no una falla silenciosa. Los eventos sí se validan (V4): llegan por otro canal y
  se aplican sobre un estado ya armado.
- **Que el backend difunda altas, bajas y ediciones** para que todas las pantallas vean todo al
  instante: cambia la spec vigente de `realtime-vm-status` (D1 de esa spec) y no lo pide este
  cambio. Lo compensan la recarga del listado al volver a la pestaña (RF-virtual-machines-26) y al
  reconectar el socket (RF-realtime-vm-status-14).
- **Control de concurrencia optimista** (`If-Match` o versión): sigue fuera de alcance de la API.
  V1 lo mitiga del lado del cliente sin cambiar el contrato.

### Datos de ejemplo (cambio `2026-10-11-seed-and-readme`)

Con solo los dos usuarios de prueba de `db:seed` (RF-auth-15), quien levanta el proyecto por
primera vez entraría a un Panel vacío y, para ver el panel de recursos o el tiempo real, primero
tendría que crear VMs a mano. Este delta hace que el seed cargue también un conjunto fijo de VMs de ejemplo
**solo cuando no hay ninguna**, de modo que el primer login ya muestra tarjetas, totales y gráficos.

El mismo cambio reescribe el `README.md` (guía de puesta en marcha desde cero, credenciales,
arquitectura, decisiones y bitácora de IA). Eso es documentación, no comportamiento: no lleva RF y
sus criterios de "hecho" están en el `tasks.md` del cambio.

**Supuestos verificados:**

| Supuesto                                                                   | Evidencia                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El seed hoy no crea VMs                                                    | `apps/backend/src/database/seed.ts`: solo `ensureUser` del Administrador y del Cliente                                                                                                                                                                                 |
| El seed ya se niega a correr en producción, antes de escribir nada         | `seed.ts`: `SeedEnv` rechaza `NODE_ENV=production` antes de abrir la conexión (RF-auth-15)                                                                                                                                                                             |
| Crear una VM por el service exige un autor y la regla de nombre único      | `VirtualMachinesService.create(input, actor)` guarda `createdById`; el índice `UQ_virtual_machines_name_lower` rechaza un nombre repetido sin distinguir mayúsculas                                                                                                    |
| Una VM creada por el seed no llega por tiempo real a un Panel ya abierto   | El seed corre en otro proceso y `realtime-vm-status` solo difunde cambios de `status` hechos por el `PUT` (RF-realtime-vm-status-06); la pestaña la ve al volver a ella o al recargar (RF-virtual-machines-26)                                                         |
| La guía actual del README no funciona en un clon limpio (discrepancia, C5) | Verificado en una copia limpia del repo: `pnpm --filter @vm/backend db:migrate` compila el backend antes de que exista `packages/shared-types/dist` (ignorado por git) y falla con 30 errores `TS2307: Cannot find module '@vm/shared-types'`. Se corrige en el README |

**Análisis OWASP del delta:**

| #   | Categoría                                  | Hallazgo                                                                                                                          | Cómo se cubre                                                                                       |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| S1  | A06 Insecure Design (pérdida de datos, K2) | Un seed que inserta "si falta" mezclaría VMs de ejemplo con datos reales de una base en uso, y uno que reemplaza borraría trabajo | RF-virtual-machines-28: crea solo si no hay **ninguna** VM; nunca edita ni borra                    |
| S2  | A02 Security Misconfiguration              | Datos de ejemplo en un entorno real                                                                                               | El seed completo sigue bloqueado con `NODE_ENV=production` (RF-auth-15), también para las VMs       |
| S3  | A08 Software or Data Integrity Failures    | Una VM de ejemplo que no cumpla las reglas de RF-virtual-machines-05 rompería el formulario de edición o los totales              | Cada VM de ejemplo cumple RF-virtual-machines-05; la base además lo exige (RNF-virtual-machines-01) |
| —   | A05 Injection (XSS)                        | Correcto: los nombres de ejemplo cumplen el patrón de RF-virtual-machines-05 y el frontend los muestra como texto (V7)            | —                                                                                                   |
| —   | A04 Cryptographic Failures / C12           | Correcto: las VMs de ejemplo no llevan secretos ni variables de entorno nuevas                                                    | —                                                                                                   |

## Actores y permisos

Roles de `ROLES` (`@vm/shared-types`, spec `auth`). La API decide; la UI solo oculta
(`docs/product.md` → "Roles").

| Actor         | Puede                                                         |
| ------------- | ------------------------------------------------------------- |
| Anónimo       | Nada: toda ruta de esta capacidad responde `401` (RF-auth-06) |
| Cliente       | Listar todas las VMs                                          |
| Administrador | Listar, crear, actualizar y eliminar cualquier VM             |

Rutas: `/api/vms` y `/api/vms/:id`, según la convención del repo (`@Controller('api/<recurso>')`)
y el rewrite `/api/*` de Next, en vez del `/vms` del pedido original (decidido en la clarificación).

En el frontend, el Cliente ve el listado y el panel de recursos en modo lectura; el Administrador
ve además crear, editar, encender o apagar y eliminar. El rol sale del usuario que devuelve la API
(RF-auth-22).

## Requisitos funcionales (EARS)

### API (backend)

- **RF-virtual-machines-01** · crítico (K1, K3) — CUANDO se recibe `GET /api/vms` con una sesión
  válida de Administrador o de Cliente, el sistema debe responder `200` con `{ items }` dentro del
  sobre `{ success: true, data }`: **todas** las VMs registradas, sin paginar, cada una con la forma
  de RF-virtual-machines-11, de la creada más recientemente a la más antigua. Sin VMs, `items` es
  `[]`.
- **RF-virtual-machines-02** · crítico (K1) — Toda ruta de esta capacidad debe exigir una sesión
  válida: sin ella, el sistema responde `401` (`UNAUTHENTICATED`, RF-auth-06). SI un usuario con
  rol Cliente pide `POST /api/vms`, `PUT /api/vms/:id` o `DELETE /api/vms/:id`, ENTONCES el sistema
  debe responder `403` (`FORBIDDEN`) sin ejecutar la ruta: ninguna VM se crea, cambia ni elimina.
  El `403` llega antes de validar el cuerpo o de buscar el id, así que no revela si una VM existe.
- **RF-virtual-machines-03** · crítico (K2, K3) — CUANDO un Administrador envía `POST /api/vms` con
  un cuerpo que cumple `CreateVirtualMachineDTO`, el sistema debe guardar la VM y responder `201`
  con `{ item }`: el `id` lo genera el servidor, los campos llevan los valores recibidos (el nombre
  sin espacios en los extremos) y `status` vale `Apagada` si no se envió.
- **RF-virtual-machines-04** · crítico (K1) — SI el cuerpo de `POST /api/vms` no cumple
  `CreateVirtualMachineDTO` (falta `name`, `cores`, `ram`, `disk` u `os`, o alguno de los campos
  enviados rompe RF-virtual-machines-05), ENTONCES el sistema debe responder `400`
  (`VALIDATION_ERROR`) sin guardar nada. Los campos que no son del DTO (`id`, `createdAt`, …) se
  ignoran: el cliente nunca los fija.
- **RF-virtual-machines-05** · crítico (K1, K4) — Cada campo de una VM debe cumplir, al crear y al
  actualizar:

  | Campo    | Regla                                                                                                                                                                       |
  | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `name`   | Texto de 1 a 63 caracteres, tras recortar los espacios de los extremos. Solo letras sin tilde (`a-z`, `A-Z`), dígitos, `-`, `_` y `.`; empieza y termina con letra o dígito |
  | `cores`  | Entero de 1 a 128                                                                                                                                                           |
  | `ram`    | Entero de 1 a 1024, en GB                                                                                                                                                   |
  | `disk`   | Entero de 1 a 65 536, en GB                                                                                                                                                 |
  | `os`     | Exactamente uno del catálogo: `Ubuntu`, `Debian`, `Rocky Linux`, `Red Hat Enterprise Linux`, `Windows Server`                                                               |
  | `status` | Exactamente `Encendida` o `Apagada`                                                                                                                                         |

  En `cores`, `ram` y `disk` no se aceptan decimales, strings (`"4"`), `null` ni booleanos. `os` y
  `status` distinguen mayúsculas y tildes.

- **RF-virtual-machines-06** · crítico (K2) — El nombre de una VM debe ser único sin distinguir
  mayúsculas: se guarda tal como se escribió (recortado) y se compara en minúsculas. SI un `POST` o
  un `PUT` usa un nombre que ya tiene **otra** VM, ENTONCES el sistema debe responder `409`
  (`VM_NAME_TAKEN`) sin guardar nada. Vale también para dos peticiones simultáneas con el mismo
  nombre: una gana y la otra recibe `409`, nunca un `500` ni dos VMs con el mismo nombre. Una VM
  puede conservar su propio nombre o cambiarle solo las mayúsculas.
- **RF-virtual-machines-07** · crítico (K2, K3) — CUANDO un Administrador envía `PUT /api/vms/:id`
  de una VM existente con un cuerpo que cumple `UpdateVirtualMachineDTO` (los campos de
  `CreateVirtualMachineDTO`, todos opcionales y con las mismas reglas), el sistema debe cambiar
  **solo** los campos enviados y responder `200` con `{ item }` ya actualizado y un `updatedAt`
  nuevo. Los campos no enviados quedan como estaban.
- **RF-virtual-machines-08** · crítico (K1) — SI el cuerpo de `PUT /api/vms/:id` no cumple
  `UpdateVirtualMachineDTO` (un campo enviado rompe RF-virtual-machines-05, viene en `null`, o el
  cuerpo no trae ningún campo del DTO), ENTONCES el sistema debe responder `400`
  (`VALIDATION_ERROR`) sin cambiar nada.
- **RF-virtual-machines-09** · crítico (K2) — CUANDO un Administrador envía `DELETE /api/vms/:id` de
  una VM existente, el sistema debe eliminarla de forma definitiva y responder `204` sin cuerpo. A
  partir de ahí, `GET /api/vms` no la lista y `PUT` o `DELETE` sobre ese id responden `404`.
- **RF-virtual-machines-10** · crítico (K2) — SI `PUT` o `DELETE` apuntan a un id con formato UUID
  que no corresponde a ninguna VM (nunca existió o ya se eliminó), ENTONCES el sistema debe
  responder `404` (`VM_NOT_FOUND`) sin cambiar nada; un `PUT` nunca vuelve a crear una VM
  eliminada. SI el id no tiene formato UUID, ENTONCES debe responder `400` (`VALIDATION_ERROR`) sin
  consultar la base.
- **RF-virtual-machines-11** · crítico (K3) — Una VM debe salir de la API siempre como
  `VirtualMachine` (`@vm/shared-types`): `{ id, name, cores, ram, disk, os, status, createdAt,
updatedAt }`, con `ram` y `disk` en GB y las fechas en ISO 8601. Ningún otro campo: ni el creador
  (RNF-virtual-machines-02) ni columnas internas.
- **RF-virtual-machines-12** · crítico (K2) — CUANDO un Administrador cambia `status` con
  `PUT /api/vms/:id`, el sistema debe aplicar el cambio en las dos direcciones (`Apagada` →
  `Encendida` y `Encendida` → `Apagada`); enviar el estado que ya tiene no es error. El estado no
  restringe nada más: una VM encendida se puede editar y eliminar como una apagada.

### Frontend

"El listado" es la grilla de tarjetas de VMs del panel; "se ve" quiere decir lo que muestra la
pantalla, incluidos los cambios optimistas todavía pendientes.

**Listado**

- **RF-virtual-machines-13** · estándar — El Panel (`/`) debe mostrar, debajo del panel de
  recursos (spec `resource-dashboard`), el listado de VMs en una grilla de tarjetas, en el orden de
  la API (de la creada más recientemente a la más antigua). Cada tarjeta muestra el nombre, el
  sistema operativo, el estado (texto, ícono y color: el color nunca va solo), los cores, la RAM en
  GB y el disco en GB. Se usa sin desplazamiento horizontal desde 320 px de ancho. No hay otra
  sección ni ruta para el listado (DF1).
- **RF-virtual-machines-14** · crítico (K1) — Los controles de escritura deben existir en el DOM
  solo para un Administrador (RF-auth-30): el botón "Crear máquina virtual" (en el encabezado del
  Panel) y, en cada tarjeta, el interruptor de encendido, "Editar" y "Eliminar". Para un Cliente,
  un rol desconocido o sin usuario, no se renderizan (ni en el HTML del servidor ni en el payload
  de React): la tarjeta muestra el estado sin el interruptor. La UI oculta; la API decide
  (RF-virtual-machines-02).
- **RF-virtual-machines-15** · estándar — El listado debe mostrar estos estados:
  - **Cargando:** el skeleton de tarjetas (`CardGridSkeleton`, RF-app-shell-08).
  - **Sin VMs:** un estado vacío (RF-app-shell-10). Para el Administrador, con la acción "Crear
    máquina virtual"; para el Cliente, sin acción y con un texto que no lo invita a crear.
  - **Error al cargar:** SI `GET /api/vms` falla (sin red, 5xx, tiempo agotado), ENTONCES en el
    lugar del listado y del panel de recursos se ve un mensaje de error con el botón "Reintentar",
    que vuelve a pedir el listado, y no se ofrece "Crear máquina virtual". Nunca un listado
    parcial ni vacío como si no hubiera VMs. Un `401` sigue RF-auth-26.

**Formularios**

- **RF-virtual-machines-16** · estándar — El formulario de creación debe abrirse en un modal sobre
  el Panel, con "Crear máquina virtual" (DF2), y tener los campos nombre, sistema operativo (lista
  con el catálogo de RF-virtual-machines-05), cores, RAM (GB), disco (GB) y estado inicial
  (`Apagada` por defecto), cada uno con su etiqueta visible y la unidad cuando la tiene. Valida con las reglas de `CreateVirtualMachineDTO` (`@vm/shared-types`), las mismas que la
  API:
  - el error de un campo aparece **mientras se escribe**, desde que la persona lo modifica o sale
    de él, sin esperar al envío, con los mensajes en español del DTO;
  - el botón de enviar está deshabilitado mientras falte un campo obligatorio o alguno sea
    inválido, y un texto junto a él dice qué falta;
  - cada error se asocia a su campo para que lo anuncien los lectores de pantalla.

  El modal se cierra sin crear nada con "Cancelar", con `Esc` o con su botón de cerrar. Un clic
  fuera del modal no lo cierra, para no perder lo escrito.

- **RF-virtual-machines-17** · crítico (K4) — Los campos cores, RAM y disco deben convertir lo
  escrito a número antes de validar y enviar:
  - vacío → `Ingresa los cores`, `Ingresa la RAM` o `Ingresa el disco`;
  - decimal (`2.5`), cero, negativo, fuera de rango o texto que no es un número → el mensaje del
    DTO para ese campo (p. ej., `Los cores deben ser un número entero entre 1 y 128`);
  - el pedido a la API lleva siempre números (`4`), nunca texto (`"4"`), que la API rechaza
    (RF-virtual-machines-05).
- **RF-virtual-machines-18** · crítico (K4) — SI el nombre escrito, recortado y sin distinguir
  mayúsculas, coincide con el de **otra** VM del listado, ENTONCES el formulario debe mostrar
  `Ya existe una máquina virtual con ese nombre` mientras se escribe y no dejar enviar. En la
  edición, la VM puede conservar su nombre o cambiarle solo las mayúsculas
  (RF-virtual-machines-06). Es una ayuda: quien decide es la API (`409`, RF-virtual-machines-21 y
  22).
- **RF-virtual-machines-19** · estándar — El formulario de edición debe abrirse en un modal, con
  "Editar" en la tarjeta, con los valores que se ven de esa VM y los mismos campos y reglas que el
  de creación. El botón de guardar se habilita solo si hay al menos un cambio y el formulario es
  válido. Si la edición falla, el formulario no se vuelve a abrir (RF-virtual-machines-22).
- **RF-virtual-machines-20** · crítico (K2, K4) — CUANDO se guarda una edición, el sistema debe
  enviar en el `PUT` **solo** los campos que la persona cambió respecto de los valores con los que
  se abrió el formulario. Un nombre que difiere solo en espacios de los extremos no cuenta como
  cambio. Así, un cambio hecho por otro Administrador mientras el formulario estaba abierto (p. ej.,
  encender la VM) no se pisa con un valor viejo (hallazgo V1).

**Optimistic UI**

- **RF-virtual-machines-21** · crítico (K2) — CUANDO el Administrador envía un formulario de
  creación válido, el sistema debe cerrar el formulario y mostrar la VM nueva **al instante**,
  primera en el listado, marcada como "Guardando…" y sin acciones, mientras se resuelve
  `POST /api/vms`.
  - Con `201`, la tarjeta pasa a mostrar la VM que devolvió la API (su `id`, el nombre recortado)
    y habilita sus acciones.
  - SI el `POST` falla (`400`, `409`, `5xx`, sin red), ENTONCES la tarjeta desaparece, se
    muestra un toast de error con `toUserMessage` (RF-virtual-machines-25) y el formulario de
    creación **se vuelve a abrir solo** con lo que se había escrito (DF4). Con `409`, el error
    `Ya existe una máquina virtual con ese nombre` queda en el campo nombre y el foco va a ese
    campo; con otra falla, el foco va al primer campo.
  - SI en ese momento hay otro modal abierto (otra creación, una edición o la confirmación de una
    eliminación), ENTONCES el formulario no lo tapa ni lo reemplaza: se abre cuando ese otro se
    cierra. Si lo abierto es un formulario de creación con otro borrador, ese borrador no se pisa:
    el intento fallido se avisa solo con el toast.
- **RF-virtual-machines-22** · crítico (K2) — CUANDO el Administrador guarda una edición o usa el
  interruptor de encendido de una tarjeta, el sistema debe mostrar el cambio **al instante** en la
  tarjeta (y en el panel de recursos), marcarla como "Guardando…" y deshabilitar sus acciones
  hasta que `PUT /api/vms/:id` responda.
  - Con `200`, la tarjeta muestra la VM que devolvió la API.
  - SI el `PUT` falla con `404`, ENTONCES la VM desaparece del listado (otro Administrador la
    eliminó) y un toast muestra el mensaje de la API.
  - SI falla por otra causa (`400`, `409`, `5xx`, sin red), ENTONCES la tarjeta vuelve a la última
    versión confirmada (RF-virtual-machines-24) y se muestra un toast de error.
- **RF-virtual-machines-23** · crítico (K2) — CUANDO el Administrador elige "Eliminar", el sistema
  debe pedir confirmación en un diálogo que nombra la VM y dice que la acción no se puede deshacer
  ("Cancelar" / "Eliminar"). Al confirmar, la tarjeta desaparece **al instante** mientras se
  resuelve `DELETE /api/vms/:id`.
  - Con `204`, se muestra un toast de éxito.
  - SI responde `404`, ENTONCES la VM sigue fuera del listado y un toast de advertencia dice que
    ya había sido eliminada.
  - SI falla por otra causa (`5xx`, sin red), ENTONCES la tarjeta reaparece en la misma posición,
    con su versión confirmada más reciente, y se muestra un toast de error.
- **RF-virtual-machines-24** · crítico (K2, K4) — Cada VM del listado debe mostrarse con su
  **versión confirmada más reciente** más los cambios optimistas que todavía están pendientes
  (hallazgo V2):
  - Una versión confirmada llega por `GET /api/vms`, por la respuesta de un `POST` o un `PUT`, o
    por un evento `vm:status-changed` (RF-realtime-vm-status-12). Entre dos versiones de la misma
    VM gana la de `updatedAt` más reciente: una más vieja que llega tarde se descarta.
  - Un cambio pendiente se ve encima de la versión confirmada hasta que su pedido termina. Si
    falla, se descarta **solo ese cambio**: la VM vuelve a su versión confirmada más reciente, que
    puede haber llegado mientras el pedido estaba en curso, nunca a una copia tomada antes.
  - Una carga del listado no deshace los cambios pendientes (una creación pendiente sigue arriba;
    una eliminación pendiente sigue oculta), y una carga que empezó antes de que terminara una
    mutación no la deshace después (una VM creada no desaparece; una eliminada no reaparece).
  - Fuera de esos casos, el listado sigue a la última carga: una VM que ya no está en ella
    desaparece y una nueva aparece en su lugar del orden.
- **RF-virtual-machines-25** · estándar — Las operaciones deben confirmar y avisar con estos
  toasts (`notify`, RF-app-shell-09). Los errores usan `toUserMessage(error, fallback)`: el mensaje
  de la API solo cuando está escrito para el usuario (p. ej., el de `VM_NAME_TAKEN`); si no, el
  fallback.

  | Operación         | Éxito                                                     | Fallback de error                                    |
  | ----------------- | --------------------------------------------------------- | ---------------------------------------------------- |
  | Crear             | `Máquina virtual creada`                                  | `No se pudo crear la máquina virtual`                |
  | Editar            | `Cambios guardados`                                       | `No se pudieron guardar los cambios`                 |
  | Encender o apagar | Sin toast: la tarjeta ya muestra el cambio                | `No se pudo cambiar el estado de la máquina virtual` |
  | Eliminar          | `Máquina virtual eliminada`                               | `No se pudo eliminar la máquina virtual`             |
  | Eliminar (`404`)  | Advertencia: `La máquina virtual ya había sido eliminada` | —                                                    |

- **RF-virtual-machines-26** · estándar — CUANDO la persona vuelve a la pestaña después de haber
  estado en otra, el sistema debe volver a pedir el listado, sin skeleton y sin perder los cambios
  pendientes (RF-virtual-machines-24). Así ve las altas, bajas y ediciones de otros
  Administradores, que el tiempo real no difunde (RF-realtime-vm-status-06).
- **RF-virtual-machines-27** · estándar — El listado y los formularios deben ser accesibles:
  - el interruptor de encendido tiene un nombre que incluye la VM (`Encender web-01`) y anuncia su
    estado;
  - "Editar" y "Eliminar" nombran la VM para los lectores de pantalla;
  - el formulario y el diálogo de confirmación retienen el foco mientras están abiertos, se cierran
    con `Esc` y, al cerrarse, devuelven el foco al control que los abrió;
  - el estado "Guardando…" se anuncia sin mover el foco;
  - todo se opera con teclado y se ve bien en los dos temas.

### Datos de ejemplo

- **RF-virtual-machines-28** · estándar — CUANDO se corre `pnpm --filter @vm/backend db:seed` y no
  hay ninguna VM registrada, el sistema debe crear, además de los usuarios de RF-auth-15, las VMs de
  la tabla "VMs de ejemplo", cada una con las reglas de RF-virtual-machines-05. SI ya hay al menos
  una VM, ENTONCES no debe crear, editar ni borrar ninguna, y debe informar en la salida que las
  omite. Con `NODE_ENV=production` no crea nada (RF-auth-15). La salida informa cuántas creó.

**VMs de ejemplo** (DS2): los cinco sistemas operativos del catálogo, Encendidas y
Apagadas, con tamaños dentro de los límites de RF-virtual-machines-05.

| `name`      | `os`                       | `cores` | `ram` (GB) | `disk` (GB) | `status`  |
| ----------- | -------------------------- | ------- | ---------- | ----------- | --------- |
| `web-01`    | `Ubuntu`                   | 2       | 4          | 50          | Encendida |
| `api-01`    | `Debian`                   | 4       | 8          | 100         | Encendida |
| `db-01`     | `Rocky Linux`              | 8       | 32         | 500         | Encendida |
| `ad-01`     | `Windows Server`           | 4       | 16         | 120         | Encendida |
| `erp-01`    | `Red Hat Enterprise Linux` | 8       | 16         | 250         | Apagada   |
| `backup-01` | `Ubuntu`                   | 2       | 8          | 2048        | Apagada   |

Con esta tabla, el panel de recursos arranca con 4 de 6 VMs activas: 18 de 28 cores, 60 de 84 GB de
RAM y 770 de 3068 GB de disco (RF-resource-dashboard-01).

## Requisitos no funcionales

- **RNF-virtual-machines-01** — Persistencia en PostgreSQL, en una tabla nueva creada por una
  migración versionada (RNF-auth-01). Las reglas de RF-virtual-machines-05 (rangos, catálogo de
  `os`, valores de `status`) y la unicidad del nombre sin distinguir mayúsculas se imponen **también
  en la base**, no solo en el DTO.
- **RNF-virtual-machines-02** — Entidad `VirtualMachine`: `id` (UUID generado por la base), `name`,
  `cores`, `ram`, `disk`, `os`, `status` (por defecto `Apagada`), `createdBy` (el usuario que la
  creó; si ese usuario se borra, queda vacío y la VM sigue), `createdAt`, `updatedAt`. `createdBy`
  es solo para auditoría en la base: nunca sale en la API (RF-virtual-machines-11).
- **RNF-virtual-machines-03** — Cada creación, actualización y eliminación deja una línea en el log
  del backend con el id del usuario, el id de la VM y la operación (en la actualización, los nombres
  de los campos cambiados). Nunca registra la cookie ni el token (A09).
- **RNF-virtual-machines-04** — Sin `// TODO`, métodos vacíos ni datos fijos en arreglos: toda la
  lógica en service, repositorio y controller, con tipado estricto, `pnpm lint` y `pnpm typecheck`
  sin errores ni advertencias, y excepciones formales (`src/shared/exceptions/` o las de Nest con
  mensaje para el usuario).
- **RNF-virtual-machines-05** — La tabla "Contrato de la API" del `README.md` lista los cuatro
  endpoints, con su acceso.
- **RNF-virtual-machines-06** — El catálogo de `os` y los límites de RF-virtual-machines-05 viven
  como constantes en `@vm/shared-types`, para que el formulario del frontend valide lo mismo que la
  API. Agregar un sistema operativo o cambiar un límite es un cambio M de esta spec (constante y
  migración).
- **RNF-virtual-machines-07** — Frontend con tipado estricto: el modelo es `VirtualMachine` de
  `@vm/shared-types`, los datos del formulario se infieren de su schema (nunca un tipo escrito a
  mano al lado) y los pedidos usan `CreateVirtualMachineDTO` y `UpdateVirtualMachineDTO`. Sin
  `any`, funciones de menos de 50 líneas, `'use client'` solo donde hace falta, sin `// TODO` ni
  datos fijos; `pnpm lint`, `pnpm typecheck` y `pnpm build` sin errores, y `palette.test.ts` en
  verde.
- **RNF-virtual-machines-08** — Dependencias nuevas del frontend con versión exacta y
  `pnpm audit` sin vulnerabilidades altas ni críticas en ellas (hallazgo V6). Los nombres de VM y
  los mensajes de la API se muestran siempre como texto, nunca como HTML (hallazgo V7).
- **RNF-virtual-machines-09** — El `README.md` documenta las decisiones de arquitectura del
  frontend de este cambio (manejo del estado de las VMs, optimistic UI y su reversión, estructura
  de `src/features/`), y las reglas del frontend (`forms-conventions.md`, `shadcn-ux-guide.md`,
  `component-imports.md`) quedan al día con lo que el cambio agrega.

## Casos límite

- `name: "  web-01  "` → se guarda `web-01` (RF-virtual-machines-03).
- Existe `web-01` y se crea `WEB-01` → `409 VM_NAME_TAKEN` (RF-virtual-machines-06).
- Renombrar la propia VM de `web-01` a `Web-01` → `200` (RF-virtual-machines-06).
- `name` `-web`, `web-`, `mi servidor`, `número1` o de 64 caracteres → `400`; `X` → válido
  (RF-virtual-machines-05).
- `cores: 2.5`, `cores: "4"`, `cores: 0`, `cores: -1`, `cores: 129` → `400`. `cores: 4.0` → JSON lo
  lee como `4`: válido (RF-virtual-machines-05).
- `disk: 1e20` → `400` por el máximo, nunca un `500` por desbordar la columna
  (RF-virtual-machines-05).
- `os: "ubuntu"` o `os: "Windows 11"` → `400` (RF-virtual-machines-05).
- `status: "encendida"` (minúscula) → `400` (RF-virtual-machines-05).
- `POST` con `id` o `createdBy` en el cuerpo → se ignoran; el servidor genera el id y toma el
  creador de la sesión (RF-virtual-machines-04).
- `PUT` con `{}` o solo con campos ajenos al DTO → `400` (RF-virtual-machines-08).
- `PUT` con `{ "name": null }` → `400` (RF-virtual-machines-08).
- `PUT` con solo `{ "status": "Encendida" }` → cambia solo el estado (RF-virtual-machines-07, 12).
- Cliente que hace `DELETE` de un id inexistente o `POST` con un cuerpo inválido → `403`, no `404`
  ni `400` (RF-virtual-machines-02).
- `DELETE` dos veces del mismo id → el segundo responde `404` (RF-virtual-machines-09, 10).
- `PUT` y `DELETE` simultáneos sobre la misma VM: si el `DELETE` termina primero, el `PUT` responde
  `404` y la VM no reaparece (RF-virtual-machines-10).
- Dos Administradores editan la misma VM a la vez: gana la última escritura, campo por campo (ver
  "Fuera de alcance").
- Base de datos caída durante cualquier operación → `500 INTERNAL_ERROR` genérico, nunca un `404` o
  `409` que confunda ni el mensaje del driver (`AllExceptionsFilter`).
- `POST` con un `Origin` ajeno → `403` (RF-auth-11); cuerpo de más de 100 KB o JSON ilegible →
  `413` / `400 INVALID_BODY` (RF-auth-16). Ya cubiertos por `auth`.

**Frontend:**

- Existe `WEB-01` y el Administrador escribe `web-01` en el formulario de creación: el error
  aparece mientras escribe y no puede enviar (RF-virtual-machines-18).
- Otro Administrador acaba de crear `web-02`, que todavía no está en este listado, y el
  Administrador crea `web-02`: pasa la validación local, la API responde `409`, la tarjeta
  desaparece y el toast dice `Ya existe una máquina virtual con ese nombre`
  (RF-virtual-machines-21).
- `2,5` (coma decimal) o `abc` en cores: el mensaje del DTO, no el de campo vacío; `4.0` vale `4`
  (RF-virtual-machines-17).
- En la edición, cambiar `web-01` por `web-01`: no cuenta como cambio y guardar sigue
  deshabilitado (RF-virtual-machines-19, 20).
- Formulario de edición abierto mientras otro Administrador enciende la VM; se guarda un cambio de
  RAM: el `PUT` lleva solo `ram` y la VM sigue encendida (RF-virtual-machines-20).
- La creación falla mientras el Administrador edita otra VM: el toast aparece al instante, y el
  formulario de creación, con lo escrito, se abre cuando se cierra la edición
  (RF-virtual-machines-21).
- Doble clic en el interruptor de encendido: el segundo no hace nada mientras el primero está
  pendiente (RF-virtual-machines-22).
- El Administrador apaga una VM; mientras el `PUT` está en curso, llega el evento de otro
  Administrador que cambió esa VM, y el `PUT` falla: la tarjeta muestra la versión del evento, no
  la de antes de apagarla (RF-virtual-machines-24).
- La respuesta de un `PUT` llega después de un evento más nuevo de la misma VM: se descarta la
  respuesta (RF-virtual-machines-24).
- Editar o apagar una VM que otro Administrador eliminó: `404`, la VM desaparece con un toast
  (RF-virtual-machines-22). Eliminarla: advertencia, y no reaparece (RF-virtual-machines-23).
- La pestaña vuelve al frente mientras una creación está pendiente: el listado se recarga y la
  tarjeta "Guardando…" sigue arriba (RF-virtual-machines-24, 26).
- La sesión vence en medio de una mutación: `401` y carga completa de `/login` con el aviso
  (RF-auth-26), sin toast de error.
- Error al cargar el listado con un Administrador: no se ofrece "Crear máquina virtual" sobre un
  listado que no cargó; solo "Reintentar" (RF-virtual-machines-15).
- `db:seed` corrido dos veces sobre una base vacía: la primera crea las VMs de ejemplo; la segunda
  informa que las omite (RF-virtual-machines-28).
- Se borran todas las VMs desde el Panel y se vuelve a correr `db:seed`: como no queda ninguna,
  vuelve a crear las de ejemplo (RF-virtual-machines-28).
- Hay una sola VM, creada a mano: el seed no crea ninguna de ejemplo, aunque sus nombres estén
  libres (RF-virtual-machines-28).
- Dos `db:seed` a la vez sobre una base vacía: los dos pueden ver la tabla vacía; el índice único de
  nombres impide duplicados y el que llega segundo termina con error (RF-virtual-machines-28,
  RF-virtual-machines-06).
- `db:seed` con el Panel abierto: las VMs nuevas no llegan por tiempo real; aparecen al volver a la
  pestaña o al recargar (RF-virtual-machines-26).

## Fuera de alcance

- Paginación, filtros, búsqueda y orden configurable del listado: el pedido es la lista completa.
- `GET /api/vms/:id` (detalle de una VM) y `PATCH`: `PUT` ya acepta cambios parciales.
- Integración con un hipervisor real: cambiar `status` no enciende ni apaga nada.
- Reglas por estado (p. ej., no redimensionar una VM encendida): descartadas en la clarificación.
- Difusión en tiempo real de los cambios de estado (`realtime-vm-status`).
- Panel de recursos (`resource-dashboard`).
- Borrado lógico, papelera e historial de cambios de una VM.
- Control de concurrencia optimista (versión o `If-Match`): gana la última escritura.
- Rate limit de los endpoints de VMs (hoy solo el login lo tiene).
- Asignar VMs a usuarios: todo Cliente ve todas las VMs.
- Exponer el creador de una VM en la API.
- En el frontend: vista de tabla, búsqueda, filtros y orden en la interfaz; acciones en lote;
  página de detalle de una VM; edición dentro de la tarjeta; "Deshacer" en los toasts
  (spec `app-shell`, "Fuera de alcance").
- Datos de ejemplo: un comando para reiniciar la base o reponer solo las VMs de ejemplo (para
  empezar de cero: `docker compose down -v` y de nuevo `db:migrate` y `db:seed`); VMs de ejemplo
  configurables por variables de entorno; difundir por tiempo real las VMs que crea el seed.

## Contratos visibles

| Endpoint              | Acceso                 | Request                   | Respuesta 2xx (`data`) | Errores                                                           |
| --------------------- | ---------------------- | ------------------------- | ---------------------- | ----------------------------------------------------------------- |
| `GET /api/vms`        | Administrador, Cliente | —                         | `200` `{ items }`      | 401                                                               |
| `POST /api/vms`       | Administrador          | `CreateVirtualMachineDTO` | `201` `{ item }`       | 400 (`VALIDATION_ERROR`, `INVALID_BODY`), 401, 403, 409, 413      |
| `PUT /api/vms/:id`    | Administrador          | `UpdateVirtualMachineDTO` | `200` `{ item }`       | 400 (`VALIDATION_ERROR`, `INVALID_BODY`), 401, 403, 404, 409, 413 |
| `DELETE /api/vms/:id` | Administrador          | —                         | `204`, sin cuerpo      | 400 (`VALIDATION_ERROR`), 401, 403, 404                           |

En `@vm/shared-types`: el modelo `VirtualMachine`, las constantes de estado y de sistema operativo
(objetos `as const` con su tipo), los límites de RF-virtual-machines-05, y
`CreateVirtualMachineDTO` y `UpdateVirtualMachineDTO` (schema y tipo). Mensajes de validación en
español: el formulario del frontend los mostrará.

Códigos de error nuevos, con mensajes para el usuario (el frontend muestra los 4xx tal cual):

| Code            | Mensaje                                        |
| --------------- | ---------------------------------------------- |
| `VM_NAME_TAKEN` | `Ya existe una máquina virtual con ese nombre` |
| `VM_NOT_FOUND`  | `La máquina virtual no existe o fue eliminada` |

**Frontend:** no cambia la API ni la forma de ningún DTO. Usa los cuatro endpoints, los schemas
`CreateVirtualMachineDTO` y `UpdateVirtualMachineDTO`, `VM_LIMITS`, `VM_OPERATING_SYSTEMS` y
`VM_STATUSES`. Sin rutas nuevas en la interfaz: el listado y el panel de recursos viven en el
Panel (`/`), y los formularios y la confirmación de eliminar son modales (DF1, DF2). Textos de los
toasts:
RF-virtual-machines-25.

## Verificación contra la constitución

| ID  | Aplica | Cómo se cumple                                                                                                                                         |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Sí     | Todo el comportamiento del CRUD está en esta spec antes de implementarse                                                                               |
| C2  | Sí     | Spec antes que código, en el mismo PR                                                                                                                  |
| C3  | Sí     | G1 sobre esta spec; G2 sobre plan y tareas antes de tocar `apps/` y `packages/`                                                                        |
| C4  | Sí     | Las siete dudas (D1–D7) se resolvieron en la clarificación (2026-10-10); no queda ningún `[NECESITA ACLARACIÓN]`                                       |
| C5  | Sí     | Las diferencias entre el pedido y la convención del repo (ruta `/vms`, RAM "en GB o MB", "único por entorno o validado") se reportaron y se decidieron |
| C6  | Sí     | Todos los RF son Críticos (K1–K4) y tendrán test con su ID                                                                                             |
| C7  | Sí     | Módulo `virtual-machines` con Controller → Service → Repository; el controller no inyecta el repositorio ni mapea                                      |
| C8  | Sí     | DTOs Zod de `@vm/shared-types` en el borde, id con pipe de UUID, roles en la API (A01), consultas con parámetros, reglas también en la base            |
| C9  | Sí     | Sin `any`, funciones < 50 líneas, early returns (RNF-virtual-machines-04)                                                                              |
| C10 | Sí     | Modelo, constantes, límites y DTOs en `@vm/shared-types`, para el backend y el futuro formulario (RNF-virtual-machines-06)                             |
| C11 | Sí     | El plan consulta con Context7 TypeORM (índice único por expresión, `CHECK`, enum), Zod 4 y `ParseUUIDPipe` antes de usarlos                            |
| C12 | No     | Sin secretos ni variables de entorno nuevas                                                                                                            |

Sin excepciones.

### Delta del frontend (`2026-10-11-frontend-vms`)

| ID  | Aplica | Cómo se cumple                                                                                                                                                                                                     |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Sí     | Todo el comportamiento del frontend de VMs está en este delta antes de implementarse                                                                                                                               |
| C2  | Sí     | Este delta, `resource-dashboard` y el de `realtime-vm-status` van antes que el código, en el mismo PR                                                                                                              |
| C3  | Sí     | G1 sobre las tres specs juntas; G2 sobre el plan y las tareas antes de tocar `apps/` y `packages/`                                                                                                                 |
| C4  | Sí     | Las dudas DF1–DF4 se resolvieron en la clarificación (2026-10-11)                                                                                                                                                  |
| C5  | Sí     | Las diferencias con `docs/product.md`, `shadcn-ux-guide.md`, `forms-conventions.md` y las specs `app-shell` y `auth` se reportan en "Frontend (cambio `2026-10-11-frontend-vms`)" y se corrigen en el mismo PR     |
| C6  | Sí     | RF-14, 17, 18 y 20 a 24 son Críticos (K1, K2, K4): test con su ID. Los demás son Estándar y se comprueban en G4                                                                                                    |
| C7  | No     | Sin cambios en el backend                                                                                                                                                                                          |
| C8  | Sí     | El formulario valida con los schemas de `@vm/shared-types` y la API vuelve a validar; controles por rol fuera del DOM (V3); nombres como texto (V7); sin cambios en la API                                         |
| C9  | Sí     | RNF-virtual-machines-07                                                                                                                                                                                            |
| C10 | Sí     | El formulario usa los DTOs, límites y catálogos de `@vm/shared-types`; nada se duplica en el frontend (RNF-virtual-machines-06)                                                                                    |
| C11 | Sí     | El plan consulta con Context7 la librería de estado del servidor que elija, `react-hook-form` y `@hookform/resolvers` (validación mientras se escribe, `isValid`, `dirtyFields`) y los primitivos de shadcn nuevos |
| C12 | No     | Sin secretos ni variables de entorno nuevas                                                                                                                                                                        |

Sin excepciones.

### Delta de los datos de ejemplo (`2026-10-11-seed-and-readme`)

| ID  | Aplica | Cómo se cumple                                                                                                                                               |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Sí     | Las VMs de ejemplo entran solo por este RF; sin él, el seed no crearía datos de negocio                                                                      |
| C2  | Sí     | Este delta va antes que el código, en el mismo PR                                                                                                            |
| C3  | Sí     | Cambio M: G1+G2 en una sola puerta, sobre este delta y el `tasks.md`, antes de tocar `apps/`                                                                 |
| C4  | Sí     | DS1 y DS2 se resolvieron en la clarificación (2026-10-11); no queda ningún `[NECESITA ACLARACIÓN]`                                                           |
| C5  | Sí     | La discrepancia del README (la guía falla en un clon limpio) se reporta en "Datos de ejemplo" y se corrige en el mismo PR                                    |
| C6  | Sí     | RF-virtual-machines-28 es Estándar, como RF-auth-15 (datos de desarrollo; bloqueado en producción): sin test, se comprueba en G4 corriendo el seed dos veces |
| C7  | Sí     | El seed usa `VirtualMachinesService`, nunca el repositorio; contar las VMs es un método del repositorio expuesto por el service                              |
| C8  | Sí     | Cada VM de ejemplo se valida con `CreateVirtualMachineDTO` de `@vm/shared-types` antes de crearla, y la base vuelve a validar (RNF-virtual-machines-01)      |
| C9  | Sí     | Sin `any`, funciones < 50 líneas, early returns                                                                                                              |
| C10 | Sí     | Catálogos y límites de `@vm/shared-types`; nada se duplica                                                                                                   |
| C11 | Sí     | Se consulta con Context7 `@nestjs/event-emitter` (el service lo inyecta y el seed no levanta `AppModule`) antes de usarlo                                    |
| C12 | No     | Sin secretos ni variables de entorno nuevas: la tabla de VMs de ejemplo es una constante del seed                                                            |

Sin excepciones.

## Verificación manual

Ninguna: todos los RF Críticos se pueden automatizar (backend: e2e sobre `AppModule` con la base de
test; frontend: Vitest de la lógica y, para RF-virtual-machines-14, un test de componente).

## Dudas abiertas

**Delta de los datos de ejemplo:** ninguna. Resueltas en la clarificación del 2026-10-11:

- **DS1.** El seed crea VMs **solo si no hay ninguna** (todas o ninguna). Descartado: crear las que
  falten por nombre, como con los usuarios, porque en una base en uso mezclaría datos de ejemplo con
  datos reales y repondría VMs que alguien borró a propósito (S1).
- **DS2.** Las seis de la tabla "VMs de ejemplo": cubren los cinco sistemas operativos, Encendidas y
  Apagadas (el panel de recursos distingue activas de asignadas y el interruptor tiene algo que
  cambiar), con tamaños realistas dentro de los límites. Descartado: ocho VMs para mostrar la fila
  `Otras (n)` del gráfico de aporte.

**Delta del frontend:** ninguna. Resueltas en la clarificación del 2026-10-11:

- **DF1.** El listado y el panel de recursos viven en el Panel (`/`): el panel de recursos arriba y
  las tarjetas debajo. Una sola sección en la barra lateral (RF-virtual-machines-13).
- **DF2.** Crear y editar se hacen en un modal sobre el Panel; sin rutas propias
  (RF-virtual-machines-16, 19).
- **DF3.** El panel de recursos muestra indicadores, un gráfico al 100 % por recurso y gráficos de
  aporte por VM (spec `resource-dashboard`).
- **DF4.** Si la creación falla, el formulario se vuelve a abrir solo con lo escrito y, con `409`,
  el error en el nombre (RF-virtual-machines-21).

**Backend:** ninguna. Resueltas en la clarificación del 2026-10-10: ruta `/api/vms` (D1); nombre tipo hostname
de 1 a 63 caracteres (D2); `ram` en GB (D3); máximos de 128 cores, 1 TB de RAM y 64 TB de disco
(D4); catálogo cerrado de cinco sistemas operativos (D5); sin reglas por estado (D6); creador
guardado sin exponerlo (D7).

## Historial

| Fecha      | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                  | PR  | Requisitos                                            | Aprobó          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------------------------------------------------- | --------------- |
| 2026-10-10 | Creación: backend del CRUD de VMs (modelo, validación, permisos por rol)                                                                                                                                                                                                                                                                                                                                                                                | —   | RF-virtual-machines-01…12, RNF-virtual-machines-01…06 | Dayanna (G1)    |
| 2026-10-10 | Validación (G4): implementado y verificado; 63 tests e2e con ID en verde; revisión local sin hallazgos bloqueantes (3 observaciones bajas aceptadas: sin test de carrera PUT/DELETE, sin test propio de los `CHECK`, respuesta del PUT con escrituras concurrentes)                                                                                                                                                                                     | —   | RF-virtual-machines-01…12                             | Dayanna (G4)    |
| 2026-10-11 | Delta del frontend (cambio `2026-10-11-frontend-vms`): listado en tarjetas en el Panel, controles por rol, formularios en modal con validación mientras se escribe, optimistic UI con reversión por versión (`updatedAt`), toasts; análisis OWASP V1–V7; DF1–DF4 resueltos                                                                                                                                                                              | —   | RF-virtual-machines-13…27, RNF-virtual-machines-07…09 | Dayanna (G1)    |
| 2026-10-11 | Validación (G4) del frontend: implementado y verificado. RF Críticos 14, 17, 18, 20–24 con test (147/147 en Vitest, Node de Windows); Estándar comprobados en Chrome con la API real. Revisión local (code-reviewer, frontend-reviewer, security-auditor) sin hallazgos altos: tres medios resueltos (foco en controles pendientes, `aria-busy`, VM duplicada un instante) y bajos resueltos o aceptados                                                | —   | RF-virtual-machines-13…27                             | Dayanna (G4)    |
| 2026-10-11 | Delta de los datos de ejemplo (cambio `2026-10-11-seed-and-readme`): `db:seed` crea seis VMs de ejemplo solo si no hay ninguna; análisis OWASP S1–S3; DS1 y DS2 resueltos                                                                                                                                                                                                                                                                               | —   | RF-virtual-machines-28                                | Dayanna (G1+G2) |
| 2026-10-11 | Validación (G4) de los datos de ejemplo: implementado y verificado desde cero en un clon limpio con una base aislada (seed dos veces, con una VM a mano, con la tabla vacía y en producción; Panel con las seis VMs y sus totales). Sin tests nuevos (Estándar); backend 37/37 unitarios y 136/136 e2e en verde. Revisión local (code-reviewer) sin hallazgos altos ni medios; tres bajos resueltos. README reescrito y validado con el mismo recorrido | —   | RF-virtual-machines-28                                | Dayanna (G4)    |
