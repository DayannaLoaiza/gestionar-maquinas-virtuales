---
paths:
  - 'packages/shared-types/**'
  - 'apps/backend/src/**/*.controller.ts'
  - 'apps/frontend/src/**/*-form.tsx'
---

# @vm/shared-types — contratos compartidos

> Regla con `paths:`: carga al leer un archivo del paquete **o de un consumidor** (controllers del
> backend, formularios del frontend), que es donde se cometen los errores con DTOs. Por eso vive acá
> y no como `CLAUDE.md` dentro del paquete: ese solo cargaría al abrir `packages/shared-types/`.

## Purpose

Única fuente de verdad para los **request bodies** y sus schemas de validación (Zod), y para los
**modelos y constantes** que comparten `apps/frontend` y `apps/backend`. Nunca definir un DTO
dentro de una app si puede vivir acá.

## Structure

- `src/common/` — lo transversal: `EntityId`, `IsoDateString`, `Timestamps`, paginación
  (`PaginationMeta`, `SortOrder`), el sobre de respuesta (`ApiSuccess<T>`, `ApiErrorBody`,
  `GENERIC_ERROR_CODES`) y `HealthStatus`.
- `src/dto/<feature>.dto.ts` — schemas Zod de request. Hoy: `auth.dto.ts` (`LoginDTO`,
  `NormalizedEmail`, `PASSWORD_MAX_LENGTH`) y `virtual-machine.dto.ts` (`CreateVirtualMachineDTO`,
  `UpdateVirtualMachineDTO`, `VmName`).
- `src/<feature>/` — el modelo y las constantes de una capacidad. Hoy: `auth/` (`ROLES`, `Role`,
  `ROLE_VALUES`, `AuthUser`) y `virtual-machines/` (`VirtualMachine`, `VM_STATUSES`,
  `VM_OPERATING_SYSTEMS`, `VM_LIMITS`, `VM_NAME_PATTERN`).
- Todo se exporta desde `src/index.ts`.

## What belongs here

- **Request DTOs** — el backend los usa para validar (`ZodValidationPipe`) y el frontend para tipar
  el body y como `zodResolver` de sus formularios.
- **Form schemas** (con `confirmPassword`, etc.) — solo del frontend, pero junto a su request DTO.
  El form se transforma al DTO de API antes de enviarse.
- **Modelos de dominio que viajan por la API** y sus constantes `as const`, cuando una capacidad
  los cree. Divergencia deliberada respecto de Visor, que los pone en el frontend.

## What does NOT belong here

- **Las formas de respuesta de cada endpoint** (`{ items, pagination }`) — van en
  `apps/frontend/src/types/api.ts`, componiendo los modelos de acá.
- **Response Zod schemas** — nadie valida respuestas en runtime.
- **Tipos solo del backend** (filas de repositorio, props internas) — inline en el backend.
- **TS `enum`** — usar objeto `as const` + tipo del mismo nombre: existe en runtime en CJS y ESM.

🔴 Una respuesta **nunca** lleva `passwordHash`, tokens ni `deletedAt`. Eso se garantiza en el
backend, donde se arma la respuesta (el service mapea al modelo compartido), no con un schema Zod.

## Convention

Exportar siempre el schema y su tipo inferido **con el mismo nombre**:

```typescript
export const CreateThingDTO = z.object({ ... });
export type CreateThingDTO = z.infer<typeof CreateThingDTO>;
```

Mensajes de validación en español (el frontend los muestra en los formularios).

## Build

tsup a CJS + ESM + `.d.ts` en `dist/`. Los `exports` apuntan **todos** a `dist/`, tipos incluidos:
sin build, ni `tsc` ni el runtime ven el cambio.

```bash
pnpm --filter @vm/shared-types build
```

## Impact

Un cambio acá afecta a `apps/frontend` **y** a `apps/backend`: verificar que compilen y probar las
dos (`pnpm typecheck && pnpm test`).
