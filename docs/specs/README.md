# Especificaciones vivas

Una spec por **capacidad**, no por cambio: describe el comportamiento esperado y se mantiene al día
en cada PR que lo cambie (constitución, C2). Proceso y plantillas: `docs/sdd/README.md`.

Cada capacidad nueva es un cambio L y nace con su spec en esta tabla.

| Capacidad            | Spec                               | Estado  | Responsable | Código                                                                                                                                                                                                     | Cambio en curso |
| -------------------- | ---------------------------------- | ------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `auth`               | [spec](auth/spec.md)               | vigente | Dayanna     | `apps/backend/src/modules/auth/`, `apps/backend/src/modules/users/`, `apps/frontend/src/lib/auth/`, `apps/frontend/src/components/auth/`, `apps/frontend/src/features/auth/`, `apps/frontend/src/proxy.ts` | —               |
| `virtual-machines`   | [spec](virtual-machines/spec.md)   | vigente | Dayanna     | `apps/backend/src/modules/virtual-machines/`, `apps/backend/src/database/seed.ts`, `apps/frontend/src/features/vms/`, `apps/frontend/src/lib/vms/`                                                         | —               |
| `realtime-vm-status` | [spec](realtime-vm-status/spec.md) | vigente | Dayanna     | `apps/backend/src/modules/realtime/`, `packages/shared-types/src/realtime/`, `apps/frontend/src/lib/realtime/`, `apps/frontend/src/components/realtime/`                                                   | —               |
| `app-shell`          | [spec](app-shell/spec.md)          | vigente | Dayanna     | `apps/frontend/src/app/`, `apps/frontend/src/components/`, `apps/frontend/src/lib/`                                                                                                                        | —               |
| `resource-dashboard` | [spec](resource-dashboard/spec.md) | vigente | Dayanna     | `apps/frontend/src/features/resource-dashboard/`, `apps/frontend/src/lib/resource-dashboard/`                                                                                                              | —               |
