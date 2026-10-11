# Tareas — backend del CRUD de máquinas virtuales

| Campo                | Valor                                             |
| -------------------- | ------------------------------------------------- |
| Estado               | cerrada                                           |
| Aprobada por / fecha | Dayanna — 2026-10-10 (puerta G2)                  |
| Cerrada              | 2026-10-10, commit `43474d7` (puerta G4, Dayanna) |

Plan: `plan.md` (esta carpeta). Spec: `docs/specs/virtual-machines/spec.md`. ⏸ = me detengo y
muestro el diff (G3).

- [x] T1. Contratos compartidos · `@vm/shared-types` · (RF-virtual-machines-05,
      RF-virtual-machines-11, RNF-virtual-machines-06)
      `VM_STATUSES`, `VM_OPERATING_SYSTEMS`, `VM_LIMITS`, `VM_NAME_PATTERN` y el modelo
      `VirtualMachine` en `src/virtual-machines/virtual-machine.ts`. `CreateVirtualMachineDTO` y
      `UpdateVirtualMachineDTO` en `src/dto/virtual-machine.dto.ts`, con mensajes en español. Todo
      exportado en `index.ts`.
      Hecho cuando: `pnpm --filter @vm/shared-types build`, `typecheck` y `lint` en verde.
- [x] T2. Persistencia · `@vm/backend` · (RNF-virtual-machines-01, RNF-virtual-machines-02; base de
      RF-virtual-machines-03…12) ⏸
      `VirtualMachineEntity` con enums, `CHECK`, FK `created_by` (`ON DELETE SET NULL`) e
      `@Index('UQ_virtual_machines_name_lower', { synchronize: false })`. Migración
      `CreateVirtualMachines` generada, revisada y completada a mano con el índice único sobre
      `lower("name")`. Registro en `database.options.ts`. `"virtual_machines"` en el `TRUNCATE` de
      `test/support/test-app.ts`. Detención: muestro el SQL de la migración antes de seguir.
      Hecho cuando: la migración se aplica y se revierte (`up` y `down`) en la base de test; el
      esquema muestra los dos enums, los cuatro `CHECK`, el índice único funcional y la FK; un
      segundo `migration:generate` no detecta cambios; los e2e existentes de `auth` siguen en verde.
- [x] T3. Excepciones, pipe de id, repositorio y service · `@vm/backend` ·
      (RF-virtual-machines-03, RF-virtual-machines-06, RF-virtual-machines-07,
      RF-virtual-machines-09, RF-virtual-machines-10, RF-virtual-machines-11,
      RF-virtual-machines-12, RNF-virtual-machines-03)
      `VmNameTakenException` y `VmNotFoundException` (`shared/exceptions/virtual-machine.exceptions.ts`),
      `InvalidIdException` y `ParseIdPipe`. `VirtualMachineRepository` con resultados discriminados
      (`saved` / `name-taken` / `not-found`), `update()` + `affected` y nunca `save()` con id.
      `VirtualMachinesService` con el mapeo a `VirtualMachine` y las líneas de auditoría.
      Hecho cuando: `pnpm --filter @vm/backend typecheck` y `lint` en verde.
- [x] T4. Controller y módulo · `@vm/backend` · (RF-virtual-machines-01, RF-virtual-machines-02,
      RF-virtual-machines-04, RF-virtual-machines-08, RF-virtual-machines-10)
      `VirtualMachinesController` en `api/vms` con `@Roles(ROLES.ADMIN)` en las escrituras,
      `ZodValidationPipe`, `ParseIdPipe`, `@HttpCode(204)` en `DELETE`. `VirtualMachinesModule`
      registrado en `app.module.ts`.
      Hecho cuando: `pnpm --filter @vm/backend build` (incluida la guarda de alias de `dist/`),
      `typecheck` y `lint` en verde.
- [x] T5. Tests e2e de CRUD y acceso · `@vm/backend` · (RF-virtual-machines-01,
      RF-virtual-machines-02, RF-virtual-machines-03, RF-virtual-machines-06,
      RF-virtual-machines-07, RF-virtual-machines-09, RF-virtual-machines-10,
      RF-virtual-machines-11, RF-virtual-machines-12)
      `test/virtual-machines.e2e-spec.ts` y `test/support/vm-helpers.ts`, según la tabla "Pruebas
      por requisito" del plan. Un `describe` por RF con su ID.
      Hecho cuando: `pnpm --filter @vm/backend test:e2e -- -t "RF-virtual-machines-"` en verde, con
      cada uno de esos 9 IDs presente en algún test.
- [x] T6. Tests e2e de validación · `@vm/backend` · (RF-virtual-machines-04,
      RF-virtual-machines-05, RF-virtual-machines-08)
      `test/virtual-machines-validation.e2e-spec.ts`: casos inválidos y bordes válidos de
      "Casos límite" con `it.each`.
      Hecho cuando: `test:e2e -- -t "RF-virtual-machines-0[458]"` en verde.
- [x] T7. Documentación · raíz, `@vm/backend` · (RNF-virtual-machines-05; infraestructura
      documental: mantiene vigentes los mapas de módulos que leen los agentes)
      Endpoints y códigos de VMs en "Contrato de la API" del `README.md`. Módulo
      `virtual-machines` en `apps/backend/CLAUDE.md`, `nestjs-patterns.md` ("Existing Modules"),
      `.claude/rules/shared-types.md` ("Hoy:") y el `CLAUDE.md` raíz (capacidades implementadas).
      Hecho cuando: `pnpm format:check` en verde y ninguno de esos archivos dice que los endpoints
      de VMs "se agregan" más adelante.
- [x] T8. Validación completa y revisión local · todo el repo · (RNF-virtual-machines-04;
      infraestructura: cierre antes de G4)
      En la copia del scratchpad: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y
      `pnpm --filter @vm/backend test:e2e` completos. `grep` de `TODO`, `any` y `console.log` en lo
      nuevo. Revisión del diff con contexto nuevo: `code-reviewer`, `api-reviewer` y
      `security-auditor`, contra la spec, la constitución y `docs/testing.md`.
      Hecho cuando: todo en verde sin advertencias, cada hallazgo de la revisión resuelto o
      presentado para aceptar, y la solicitud de G4 lista.
