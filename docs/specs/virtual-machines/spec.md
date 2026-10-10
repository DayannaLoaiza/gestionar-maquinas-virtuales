# Especificación — Máquinas virtuales

| Campo                         | Valor                                                                                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado                        | vigente                                                                                                                                                                                                                                                                   |
| Aprobada por / fecha          | Dayanna — 2026-10-10 (puerta G1)                                                                                                                                                                                                                                          |
| Capacidad                     | `virtual-machines`                                                                                                                                                                                                                                                        |
| Responsable                   | Dayanna                                                                                                                                                                                                                                                                   |
| Constitución                  | revisada contra v1.0.0                                                                                                                                                                                                                                                    |
| Última verificación vs código | 2026-10-10 (sobre `2780fa8`, sin commitear)                                                                                                                                                                                                                               |
| Código                        | `apps/backend/src/modules/virtual-machines/`, `apps/backend/src/shared/pipes/parse-id.pipe.ts`, `apps/backend/src/shared/exceptions/virtual-machine.exceptions.ts`, `packages/shared-types/src/virtual-machines/`, `packages/shared-types/src/dto/virtual-machine.dto.ts` |

## Contexto y objetivo

Con `auth` vigente, la API tiene sesión y roles pero ningún endpoint de negocio. Esta spec cubre la
parte de backend de `virtual-machines` (`docs/product.md` → "API › VMs"): el registro de máquinas
virtuales en PostgreSQL, la validación de cada campo en el borde y los cuatro endpoints del CRUD con
permisos por rol. El frontend (listado, formulario con validación en tiempo real, optimistic UI,
botones ocultos para el Cliente) entra en un cambio posterior de esta misma spec.

Una VM es un **registro**: crearla, encenderla o borrarla cambia una fila, no una máquina real en un
hipervisor. Esta capacidad usa los guards globales de `auth` (RF-auth-06, RF-auth-07, RF-auth-11)
y el contrato de error existente, sin cambiarlos.

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

## Requisitos funcionales (EARS)

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

## Fuera de alcance

- Frontend: listado, formulario, optimistic UI, ocultar botones por rol. Cambio posterior de esta
  spec.
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

## Verificación manual

Ninguna: todos los RF Críticos se pueden automatizar (e2e sobre `AppModule` con la base de test).

## Dudas abiertas

Ninguna. Resueltas en la clarificación del 2026-10-10: ruta `/api/vms` (D1); nombre tipo hostname
de 1 a 63 caracteres (D2); `ram` en GB (D3); máximos de 128 cores, 1 TB de RAM y 64 TB de disco
(D4); catálogo cerrado de cinco sistemas operativos (D5); sin reglas por estado (D6); creador
guardado sin exponerlo (D7).

## Historial

| Fecha      | Cambio                                                                                                                                                                                                                                                              | PR  | Requisitos                                            | Aprobó       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------------------------------------------------- | ------------ |
| 2026-10-10 | Creación: backend del CRUD de VMs (modelo, validación, permisos por rol)                                                                                                                                                                                            | —   | RF-virtual-machines-01…12, RNF-virtual-machines-01…06 | Dayanna (G1) |
| 2026-10-10 | Validación (G4): implementado y verificado; 63 tests e2e con ID en verde; revisión local sin hallazgos bloqueantes (3 observaciones bajas aceptadas: sin test de carrera PUT/DELETE, sin test propio de los `CHECK`, respuesta del PUT con escrituras concurrentes) | —   | RF-virtual-machines-01…12                             | Dayanna (G4) |
