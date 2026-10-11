# Tareas — Frontend de VMs, panel de recursos y tiempo real (`2026-10-11-frontend-vms`)

| Campo                | Valor                                         |
| -------------------- | --------------------------------------------- |
| Estado               | cerrada                                       |
| Aprobada por / fecha | Dayanna — 2026-10-11 (puerta G2)              |
| Cerrada              | 2026-10-11 (puerta G4, Dayanna); PR pendiente |

Plan: `plan.md` (D1–D12). Specs: `virtual-machines` (RF-13…27), `resource-dashboard` (RF-01…09) y
`realtime-vm-status` (RF-11…16). G3 propuesto: ⏸ tras T6.

- [x] T1. Dependencias, proveedor de consultas y primitivos · `@vm/frontend` · (RNF-virtual-machines-07,
      RNF-virtual-machines-08, RNF-resource-dashboard-01, RNF-realtime-vm-status-06; infraestructura de
      T2–T9)
      `@tanstack/react-query` 5.104.0, `recharts` 3.10.1, `react-is` 19.3.0 y `socket.io-client` 4.8.3
      en `package.json`; `src/lib/query/query-client.ts`, `src/components/providers/query-provider.tsx`
      (montado en `(panel)/layout.tsx`); `src/types/api.ts`; `components/ui/` `dialog`, `alert-dialog`,
      `switch` (registro `new-york-v4`, traducidos a los tokens), `status-badge` y `native-select`;
      los once íconos de D10; tokens `chart-active`, `chart-inactive` y `highlight` en `globals.css`.
      Hecho cuando: en el scratchpad, `pnpm install`, `pnpm audit` (sin altas ni críticas en las
      dependencias nuevas), `typecheck`, `lint` y `build` del frontend pasan, y `palette.test.ts` sigue
      en verde.
- [x] T2. Versiones y cambios pendientes · `@vm/frontend` · (RF-virtual-machines-24)
      `src/lib/vms/vm-versions.ts` (`isNewerOrSame`, `upsertConfirmed`, `removeConfirmed`,
      `mergeFetchedList`), `src/lib/vms/pending-changes.ts` (`PendingVmChange`, `deriveVisibleVms`) y
      `src/lib/vms/vms-query.ts` (clave, `queryFn`, opciones de D1).
      Hecho cuando: tests unitarios `RF-virtual-machines-24` en verde.
- [x] T3. Schema del formulario · `@vm/frontend` · (RF-virtual-machines-17, RF-virtual-machines-18,
      RF-virtual-machines-20)
      `src/schemas/vm-form.ts`: `createVmFormSchema(otherNames)`, números como texto, `isNameTaken`,
      `buildUpdatePayload`, `toFormValues(vm)`.
      Hecho cuando: tests `RF-virtual-machines-17`, `RF-virtual-machines-18` y `RF-virtual-machines-20`
      en verde.
- [x] T4. Hooks de VMs con optimistic UI · `@vm/frontend` · (RF-virtual-machines-21, 22, 23, 24, 25, 26)
      `src/features/vms/hooks/` (`useVms`, `useVisibleVms`, `useCreateVm`, `useUpdateVm`,
      `useDeleteVm`), `src/config/vms.ts` (textos de los toasts) y `features/vms/store/vm-dialogs-store.ts`
      con `createFailed` y `dialogClosed` (D5).
      Hecho cuando: tests de hook `RF-virtual-machines-21`, `22`, `23` y `24` (carrera de la recarga) y
      el unitario del store de diálogos en verde.
- [x] T5. Panel: carga, estados, tarjetas y roles · `@vm/frontend` · (RF-virtual-machines-13,
      RF-virtual-machines-14, RF-virtual-machines-15, RF-app-shell-11)
      `(panel)/page.tsx`, `features/vms/components/` (`vm-workspace`, `vms-prefetch`, `vm-dashboard`,
      `panel-actions`, `vm-grid`, `vm-card`, `vm-card-actions`, `vm-power-switch`, `vm-status-badge`,
      `vms-error-state`) y los estados de carga, vacío (por rol) y error con "Reintentar".
      Hecho cuando: test `RF-virtual-machines-14` en verde; con la API real, el Panel muestra las VMs
      de cada usuario de `db:seed`, el estado vacío de cada rol y el error con "Reintentar" con la API
      detenida; el interruptor enciende y apaga al instante (Estándar: RF-13, 15).
- [x] T6. Formularios y diálogos · `@vm/frontend` · (RF-virtual-machines-16, RF-virtual-machines-19,
      RF-virtual-machines-21, RF-virtual-machines-23, RF-virtual-machines-27) ⏸
      `features/vms/components/` (`vm-form`, `vm-form-dialog`, `delete-vm-dialog`, `vm-dialogs`).
      Hecho cuando: con la API real, crear, editar y eliminar funcionan al instante; un `409` forzado
      reabre el formulario con el error en el nombre; un `500` simulado revierte con toast; teclado y
      foco según RF-27; capturas en claro, oscuro, escritorio y 320 px (Estándar: RF-16, 19, 25, 27).
- [x] T7. Panel de recursos · `@vm/frontend` · (RF-resource-dashboard-01…09)
      `src/lib/resource-dashboard/resource-summary.ts` y `features/resource-dashboard/components/`
      (`resource-panel`, `resource-indicators`, `resource-charts` diferido, `chart-data-table`).
      Hecho cuando: tests `RF-resource-dashboard-01` y `RF-resource-dashboard-02` en verde; con la API
      real, los indicadores y los gráficos cambian al encender y apagar, y se ven bien en claro,
      oscuro y 320 px (Estándar: RF-03…09).
- [x] T8. Cliente de tiempo real · `@vm/frontend` · (RF-realtime-vm-status-11, 12, 14, 15, 16)
      `src/lib/realtime/` (`realtime-connection`, `vm-status-event`, `reconnect-delay`),
      `src/lib/vms/apply-vm-event.ts` y `src/components/realtime/` (proveedor en `(panel)/layout.tsx`,
      indicador en `PanelActions`, `use-realtime-status`).
      Hecho cuando: tests `RF-realtime-vm-status-11`, `12`, `14` y `15` en verde; con la API real, el
      indicador pasa por "En vivo", "Conectando…" (API detenida) y vuelve a "En vivo" al reiniciarla
      (Estándar: RF-16).
- [x] T9. Resalte y anuncio · `@vm/frontend` · (RF-realtime-vm-status-13)
      Mapa de resaltes en el proveedor, capa `animate-vm-flash` en `VmCard`, `@keyframes vm-flash` en
      `globals.css` y la región `role="status"` con el anuncio.
      Hecho cuando: con dos navegadores, la tarjeta se resalta en la pantalla del otro usuario y no en
      la pestaña que hizo el cambio; con `prefers-reduced-motion` emulado no hay animación (Estándar).
- [x] T10. Documentación · Docs · (RNF-virtual-machines-09, RNF-realtime-vm-status-07; C5)
      `README.md` (decisiones de arquitectura del frontend: TanStack Query, optimistic UI por versiones,
      tiempo real del cliente; estructura de `src/features/`); `CLAUDE.md` raíz y
      `apps/frontend/CLAUDE.md`; reglas `forms-conventions.md`, `shadcn-ux-guide.md`,
      `component-imports.md`, `component-conventions.md`, `nextjs-patterns.md` y
      `.claude/rules/shared-types.md`; `docs/product.md` ("Estado de servidor" resuelta);
      `docs/specs/README.md` y el campo `Código` de las tres specs.
      Hecho cuando: ningún documento contradice el código, y `pnpm format:check` pasa.
- [x] T11. Validación · `@vm/frontend` · (todos los RF del cambio; RNF-virtual-machines-07,
      RNF-resource-dashboard-03, RNF-realtime-vm-status-06)
      Suite completa (Vitest con el Node de Windows, Jest del backend sin cambios), `typecheck`, `lint`
      y `build` en el scratchpad; las verificaciones manuales de la spec `realtime-vm-status`
      (RF-11 y 15 en el navegador); revisión local con `code-reviewer`, `frontend-reviewer` y
      `security-auditor`.
      Hecho cuando: todo en verde, verificaciones manuales hechas y hallazgos de la revisión resueltos
      o aceptados; se presenta G4.
