# Plan — backend del CRUD (virtual-machines)

Spec: `docs/specs/virtual-machines/spec.md` · Añade: módulo `virtual-machines`, tabla
`virtual_machines`, contratos de VM en `@vm/shared-types`, pipe de id y excepciones de VM ·
Modifica: `app.module.ts`, `database.options.ts`, harness de e2e (`test/support/test-app.ts`),
`README.md` y la documentación de módulos · Retira: nada · Constitución: v1.0.0

## Chequeo de constitución (puerta: antes de diseñar; se revisa en G2)

| ID  | Aplica | Cómo se cumple                                                                                                                                                                                                                                                          |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Cada tarea cita sus RF; nada fuera de la spec aprobada en G1                                                                                                                                                                                                            |
| C2  | Sí     | La spec se escribió y aprobó antes del código; si algo la cambia durante la implementación, vuelvo a G1 por ese delta                                                                                                                                                   |
| C3  | Sí     | Sin "apruebo" en G2 no se toca `apps/` ni `packages/`                                                                                                                                                                                                                   |
| C4  | Sí     | Sin dudas abiertas; lo que surja se pregunta                                                                                                                                                                                                                            |
| C5  | Sí     | Desvíos en "Desvíos durante la implementación" (se agrega al implementar, si hay)                                                                                                                                                                                       |
| C6  | Sí     | Los 12 RF son Críticos: cada uno con su test e2e con el ID en el nombre (tabla "Pruebas por requisito"). No se retira ni debilita ningún test                                                                                                                           |
| C7  | Sí     | `VirtualMachinesController` → `VirtualMachinesService` → `VirtualMachineRepository`. El controller no inyecta el repositorio ni mapea; el service mapea a `VirtualMachine`; solo el repositorio importa TypeORM                                                         |
| C8  | Sí     | Cuerpos con `ZodValidationPipe` y los DTOs de `@vm/shared-types`; id con `ParseIdPipe` (UUID); roles con `@Roles(ROLES.ADMIN)` sobre los guards globales; SQL solo por TypeORM con parámetros; reglas repetidas en la base (`CHECK`, enums, índice único)               |
| C9  | Sí     | Sin `any` (el error del driver se lee con un type guard); funciones < 50 líneas; early returns                                                                                                                                                                          |
| C10 | Sí     | `VirtualMachine`, `VM_STATUSES`, `VM_OPERATING_SYSTEMS`, `VM_LIMITS`, `VM_NAME_PATTERN` y los DTOs en `@vm/shared-types`                                                                                                                                                |
| C11 | Sí     | Consultado el 2026-10-10: TypeORM 1.1.1 (índices con `synchronize: false`, Context7), docs de Nest (ciclo de vida de la petición y `ParseUUIDPipe`, Context7), Zod 4.6.5 (Context7), y los `.d.ts` instalados de `@nestjs/common` 11.2.7, `typeorm` 1.1.1 y `zod` 4.6.5 |
| C12 | No     | Sin secretos ni variables nuevas                                                                                                                                                                                                                                        |

Sin excepciones técnicas. Sin dependencias nuevas: no hace falta `pnpm install`.

## Enfoque

**Contratos (`@vm/shared-types`).**

- `src/virtual-machines/virtual-machine.ts`:
  - `VM_STATUSES` (`ON: 'Encendida'`, `OFF: 'Apagada'`) y `VM_OPERATING_SYSTEMS` (`UBUNTU`, `DEBIAN`,
    `ROCKY_LINUX`, `RHEL`, `WINDOWS_SERVER`), objetos `as const` con su tipo y su `*_VALUES`, como
    `ROLES`.
  - `VM_LIMITS` (`name.maxLength = 63`; `cores` 1–128, `ram` 1–1024, `disk` 1–65 536) y
    `VM_NAME_PATTERN` (`/^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/`).
  - `interface VirtualMachine extends Timestamps { id, name, cores, ram, disk, os, status }`.
- `src/dto/virtual-machine.dto.ts`:
  - `CreateVirtualMachineDTO`: `z.object` (descarta las claves ajenas, así nadie fija `id` ni
    `createdBy`). `name` con `trim()`, `min(1)`, `max(63)` y `regex`; `cores`, `ram` y `disk` con
    `z.number().int().min().max()` (sin coerción: `"4"` falla); `os` y `status` con `z.enum`;
    `status` opcional. Mensajes en español.
  - `UpdateVirtualMachineDTO`: `CreateVirtualMachineDTO.partial()` con un `refine` que exige al
    menos un campo (`{}` y "solo claves ajenas" fallan, RF-virtual-machines-08).

**Persistencia.** `VirtualMachineEntity` (`virtual-machine.entity.ts`), tabla `virtual_machines`:

| Columna                    | Tipo y restricciones                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`                       | `uuid` PK, `gen_random_uuid()`                                                                                |
| `name`                     | `varchar(63)`, `CHECK` con el mismo patrón; índice único `UQ_virtual_machines_name_lower` sobre `lower(name)` |
| `cores`, `ram`, `disk`     | `integer`, un `CHECK … BETWEEN` por columna con los límites de `VM_LIMITS`                                    |
| `os`                       | enum `vm_os` con los cinco valores                                                                            |
| `status`                   | enum `vm_status`, por defecto `Apagada`                                                                       |
| `created_by`               | `uuid` nulo, FK → `users(id)` `ON DELETE SET NULL`, con índice                                                |
| `created_at`, `updated_at` | `timestamptz`, `CreateDateColumn` / `UpdateDateColumn`                                                        |

- TypeORM no sincroniza índices por expresión: se declara
  `@Index('UQ_virtual_machines_name_lower', { synchronize: false })` y el
  `CREATE UNIQUE INDEX … (lower("name"))` se escribe a mano en la migración.
- La migración se genera con `db:migration:generate` y se revisa. Después se le agrega el índice
  funcional y se registra en `database.options.ts` junto con la entidad.

**Repositorio** (`virtual-machine.repository.ts`). Es el único que importa TypeORM.

- `findAllNewestFirst()`: `order: { createdAt: 'DESC', id: 'ASC' }`; el `id` desempata.
- `insert(row)`: `save(create(row))` de una entidad sin id, que es siempre un `INSERT`.
- `updateById(id, changes)`: `update({ id }, changes)`. Con `affected === 0` responde
  `not-found`; si no, relee la fila, y si ya no está (la borró un `DELETE` en medio) también
  `not-found`. **Nunca `save()` con id:** hace `SELECT` y luego `INSERT` si la fila no existe, y
  revive una VM borrada (RF-virtual-machines-10).
- `deleteById(id)`: `delete({ id })`; responde `affected > 0`.
- Las escrituras devuelven un resultado discriminado: `{ outcome: 'saved', vm }`,
  `{ outcome: 'name-taken' }` o `{ outcome: 'not-found' }`. `name-taken` sale de un
  `QueryFailedError` cuyo error del driver trae `code === '23505'` y
  `constraint === 'UQ_virtual_machines_name_lower'`. Cualquier otro error de la base se relanza
  tal cual y termina en `500 INTERNAL_ERROR`.
- Sin chequeo previo de "¿existe el nombre?": el índice único es la única fuente de verdad, así
  dos `POST` simultáneos siguen el mismo camino (RF-virtual-machines-06).

**Service** (`virtual-machines.service.ts`).

- Métodos: `list()`, `create(input, actor)`, `update(id, changes, actor)` y `remove(id, actor)`.
- Pasa `name-taken` a `VmNameTakenException` (409) y `not-found` a `VmNotFoundException` (404).
- Mapea cada entidad a `VirtualMachine` (fechas con `toISOString()`, sin `createdBy`).
- `create` fija `status: input.status ?? VM_STATUSES.OFF` y `createdBy: actor.id`; el default de
  la base es solo una red.
- Deja la línea de auditoría con `Logger` (RNF-virtual-machines-03): operación, id de la VM, id
  del usuario y, en `update`, las claves recibidas.

**Controller** (`virtual-machines.controller.ts`), `@Controller('api/vms')`:

| Handler                  | Decoradores                                                                            | Devuelve          |
| ------------------------ | -------------------------------------------------------------------------------------- | ----------------- |
| `list()`                 | `@Get()`                                                                               | `{ items }`       |
| `create(body, user)`     | `@Roles(ROLES.ADMIN) @Post()` (201 por defecto), `ZodValidationPipe`, `@CurrentUser()` | `{ item }`        |
| `update(id, body, user)` | `@Roles(ROLES.ADMIN) @Put(':id')`, `ParseIdPipe`, `ZodValidationPipe`                  | `{ item }`        |
| `remove(id, user)`       | `@Roles(ROLES.ADMIN) @Delete(':id') @HttpCode(204)`, `ParseIdPipe`                     | nada (sin cuerpo) |

- Los guards globales corren antes que los pipes (ciclo de vida de Nest). Por eso el Cliente
  recibe `403` antes de que se valide el cuerpo o el id (RF-virtual-machines-02), sin código
  extra.

**Compartido en el backend.**

- `shared/pipes/parse-id.pipe.ts`: `ParseIdPipe extends ParseUUIDPipe`, con un `exceptionFactory`
  que lanza `InvalidIdException` (`400`, `message: 'Validation failed'`, `VALIDATION_ERROR`).
  Sirve a las capacidades siguientes.
- `shared/exceptions/virtual-machine.exceptions.ts`: `VmNameTakenException` (`ConflictException`)
  y `VmNotFoundException` (`NotFoundException`), con los mensajes de la spec.
- `shared/exceptions/request-params.exceptions.ts`: `InvalidIdException`.

## Cambios por paquete

| Paquete            | Cambio                                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@vm/shared-types` | `src/virtual-machines/virtual-machine.ts`, `src/dto/virtual-machine.dto.ts`, exportados en `src/index.ts`                                                                                                                                  |
| `@vm/backend`      | Módulo `src/modules/virtual-machines/` (entity, repository, service, controller, module); migración `CreateVirtualMachines`; `database.options.ts`; `app.module.ts`; `ParseIdPipe`; excepciones; harness y tests e2e                       |
| `@vm/frontend`     | Nada (el frontend de VMs es un cambio posterior)                                                                                                                                                                                           |
| Documentación      | `README.md` ("Contrato de la API"), `apps/backend/CLAUDE.md` (tabla de módulos), `nestjs-patterns.md` ("Existing Modules"), `.claude/rules/shared-types.md` ("Hoy:"), `CLAUDE.md` raíz (capacidades implementadas), `docs/specs/README.md` |

## Compatibilidad entre apps (`docs/sdd/README.md`)

Solo se agregan endpoints, tipos y códigos de error; no cambia ningún contrato existente. El
frontend actual no consume VMs, así que backend y frontend pueden desplegarse en cualquier orden.

- `DELETE` responde `204`: `fetch-wrapper.ts` ya lo trata (`NO_CONTENT`).
- Los códigos nuevos (`VM_NAME_TAKEN`, `VM_NOT_FOUND`) llevan mensajes para el usuario, así que
  `toUserMessage` los muestra tal cual.
- Un id inválido sale como `VALIDATION_ERROR`, que el frontend ya trata como genérico.

## Seguridad y permisos (C8)

- **A01 (control de acceso).**
  - Toda ruta nace protegida por `JwtAuthGuard` global, y las de escritura llevan
    `@Roles(ROLES.ADMIN)`.
  - El rol sale de la base en cada petición (RF-auth-07).
  - El `403` precede a pipes y búsquedas: un Cliente no puede sondear qué ids existen.
- **Asignación masiva.** `z.object` descarta claves ajenas: `id`, `createdBy`, `createdAt` y
  `updatedAt` no se pueden fijar desde el cuerpo. `createdBy` sale de la sesión.
- **A05 (inyección).** Solo `find`/`update`/`delete`/`save` de TypeORM con parámetros; nada de SQL
  concatenado.
- **Validación en dos capas:** Zod en el borde, y `CHECK`, enums e índice único en la base
  (RNF-virtual-machines-01). Los máximos impiden el desborde de `integer`.
- **CSRF.** `OriginGuard` ya cubre `POST`, `PUT` y `DELETE` (RF-auth-11).
- **A09 (registro).** Una línea de auditoría por escritura, sin cookie ni token
  (RNF-virtual-machines-03).
- **Fuga de información.**
  - `createdBy` nunca sale en la API.
  - Un 5xx nunca muestra el mensaje del driver (`AllExceptionsFilter`).
  - Un `409` no repite el nombre recibido.

## Pruebas por requisito (`docs/testing.md`)

Todos son HTTP: e2e con supertest sobre `AppModule` y la base de test, porque cada RF pasa por
guards, pipes, filtro o base. No se agregan tests unitarios del service ni del schema: el e2e ya
prueba el mismo comportamiento a través de la superficie pública. Dos archivos:
`test/virtual-machines.e2e-spec.ts` (CRUD y acceso) y `test/virtual-machines-validation.e2e-spec.ts`
(cuerpos inválidos). Helpers nuevos en `test/support/vm-helpers.ts` (un cuerpo válido por defecto
y `createVm`).

| RF                     | Criticidad | Test | Qué verifica                                                                                                                                                                                | Archivo                       |
| ---------------------- | ---------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| RF-virtual-machines-01 | K1, K3     | HTTP | Administrador y Cliente reciben `200` con todas las VMs, de la más nueva a la más antigua; sin VMs, `items: []`                                                                             | `virtual-machines`            |
| RF-virtual-machines-02 | K1         | HTTP | Sin cookie, `401` en las cuatro rutas. El Cliente recibe `403 FORBIDDEN` en `POST`, `PUT` y `DELETE`, también con un cuerpo inválido o un id inexistente, y las VMs quedan igual            | `virtual-machines`            |
| RF-virtual-machines-03 | K2, K3     | HTTP | Un `POST` válido da `201` con id generado, nombre recortado y `status` `Apagada` por omisión; la VM aparece en `GET` y `created_by` es el id del Administrador                              | `virtual-machines`            |
| RF-virtual-machines-04 | K1         | HTTP | Sin cada campo obligatorio, `400 VALIDATION_ERROR` y nada guardado; un `id` en el cuerpo se ignora                                                                                          | `virtual-machines-validation` |
| RF-virtual-machines-05 | K1, K4     | HTTP | `it.each` con los casos inválidos de "Casos límite" y los bordes válidos (`X`, 63 caracteres, 128 / 1024 / 65 536, `4.0`) contra `POST`, y un inválido contra `PUT`                         | `virtual-machines-validation` |
| RF-virtual-machines-06 | K2         | HTTP | Mismo nombre con otras mayúsculas: `409 VM_NAME_TAKEN` en `POST` y `PUT`. Cambiar solo las mayúsculas del propio nombre: `200`. Dos `POST` simultáneos: un `201`, un `409` y una sola fila  | `virtual-machines`            |
| RF-virtual-machines-07 | K2, K3     | HTTP | Un `PUT` parcial cambia solo lo enviado y `updatedAt` avanza                                                                                                                                | `virtual-machines`            |
| RF-virtual-machines-08 | K1         | HTTP | Un `PUT` con `{}`, solo claves ajenas, `null` o un valor inválido da `400` y la VM no cambia                                                                                                | `virtual-machines-validation` |
| RF-virtual-machines-09 | K2         | HTTP | `DELETE` da `204` sin cuerpo y `GET` ya no la lista                                                                                                                                         | `virtual-machines`            |
| RF-virtual-machines-10 | K2         | HTTP | Un UUID inexistente en `PUT` o `DELETE` da `404 VM_NOT_FOUND`; un segundo `DELETE` da `404`; un `PUT` tras el `DELETE` da `404` y la VM no reaparece; el id `abc` da `400 VALIDATION_ERROR` | `virtual-machines`            |
| RF-virtual-machines-11 | K3         | HTTP | El `item` de `POST` y `PUT` y cada elemento de `GET` tienen exactamente las 9 claves (sin `createdBy`), con fechas ISO                                                                      | `virtual-machines`            |
| RF-virtual-machines-12 | K2         | HTTP | `status` pasa de `Apagada` a `Encendida` y vuelve; reenviar el mismo estado da `200`                                                                                                        | `virtual-machines`            |

### Tests que se retiran o reescriben

Ninguno. `test/support/test-app.ts` (harness, no un test) agrega `"virtual_machines"` al
`TRUNCATE` de `resetDatabase`. `roles.e2e-spec.ts` queda como está: prueba el mecanismo de
RF-auth-07 sin depender de VMs.

## Revisión de arquitectura

| Hallazgo                                                                                                                     | Evidencia (archivo:línea o doc oficial)                                                                                                  | Cambio                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| TypeORM no sincroniza índices por expresión (`lower`); sin `synchronize: false`, el próximo `migration:generate` lo borraría | TypeORM 1.1.1, `docs/indexes.md` → "Disabling synchronization" (Context7)                                                                | `@Index(..., { synchronize: false })` e índice escrito en la migración |
| `save()` con id hace `SELECT` y luego `INSERT` si la fila no existe: revive una VM borrada por un `DELETE` concurrente       | Comportamiento de `Repository.save` (TypeORM 1.1.1); `UpdateResult.affected` en `query-builder/result/UpdateResult.d.ts:16`              | `update()` + `affected` y relectura                                    |
| Los guards corren antes que los pipes: el `403` del Cliente llega antes del `400` o el `404`                                 | Docs de Nest, "Request lifecycle" (Context7)                                                                                             | Ninguno: se usa tal cual (RF-virtual-machines-02)                      |
| `ParseUUIDPipe` responde `Validation failed (uuid is expected)` con `code: BAD_REQUEST`, y el frontend mostraría ese texto   | `@nestjs/common` 11.2.7 `pipes/parse-uuid.pipe.d.ts:21` (`exceptionFactory`); `apps/frontend/src/lib/api/api-error.ts` (`toUserMessage`) | `ParseIdPipe` con `InvalidIdException` (`VALIDATION_ERROR`)            |
| `QueryFailedError.driverError` está tipado como `Error`; `code` y `constraint` no están en el tipo                           | `typeorm` 1.1.1 `error/QueryFailedError.d.ts:9`                                                                                          | Type guard sobre `unknown` (sin `any`, C9)                             |
| `resetDatabase` vacía solo `sessions` y `users`                                                                              | `apps/backend/test/support/test-app.ts` (`resetDatabase`)                                                                                | Agregar `virtual_machines`                                             |
| El frontend ya tolera `204`                                                                                                  | `apps/frontend/src/lib/api/fetch-wrapper.ts` (`NO_CONTENT`)                                                                              | Ninguno                                                                |

## Riesgos y decisiones (incluidas las que trascienden el cambio)

- **El patrón del nombre vive dos veces:** en `VM_NAME_PATTERN` y en el `CHECK` de la migración, que
  es una foto fija. Cambiarlo, igual que un límite o el catálogo de `os`, es un cambio M con
  migración nueva (RNF-virtual-machines-06).
- **Listado sin paginar.** Para el volumen esperado (decenas o cientos de VMs) alcanza. Si crece,
  paginar es un cambio M y el frontend ya conoce la convención `{ items, pagination }`.
- **Gana la última escritura** entre dos Administradores (fuera de alcance en la spec).
- **Verificación desde WSL.** Copio el repo a una carpeta temporal (scratchpad), instalo ahí y corro
  lint, typecheck, tests, build y e2e contra la base de test (`TEST_DATABASE_URL`), como en `auth`.
  La migración se genera ahí, contra esa base. Si la base de test no está accesible desde WSL, me
  detengo y te pido que corras los e2e desde Windows.
- **`ParseIdPipe` en `shared/`:** queda disponible para las capacidades siguientes que reciban ids.

## Desvíos durante la implementación

- **Filtro `-t` documentado que no filtra (C5, sin corregir).**
  - El problema: `pnpm --filter @vm/backend test:e2e -- -t "RF-…"` (la forma de `CLAUDE.md`, `docs/testing.md`, `apps/backend/CLAUDE.md` y del "Hecho cuando" de T5 y T6) no filtra por nombre. pnpm 10 reenvía el `--` a Jest, que toma `-t` y el ID como patrones de ruta: termina corriendo los archivos cuya ruta contiene `-t` (`auth-throttling.e2e-spec.ts`, 4 tests).
  - Cómo se verificó: con `pnpm --filter @vm/backend test:e2e -t "RF-virtual-machines-"` (63 tests de las 2 suites nuevas).
  - Es anterior a este cambio y no se corrige acá: se reporta en G4.
- **README:** además de la tabla de endpoints (RNF-virtual-machines-05), un párrafo con las reglas de cada campo y `VALIDATION_ERROR` ampliado al id que no es UUID. Es solo documentación del contrato aprobado.
