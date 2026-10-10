# Especificaciones vivas

Una spec por **capacidad**, no por cambio: describe el comportamiento esperado y se mantiene al día
en cada PR que lo cambie (constitución, C2). Proceso y plantillas: `docs/sdd/README.md`.

Cada capacidad nueva es un cambio L y nace con su spec en esta tabla.

| Capacidad | Spec                 | Estado  | Responsable | Código                                                              | Cambio en curso                        |
| --------- | -------------------- | ------- | ----------- | ------------------------------------------------------------------- | -------------------------------------- |
| `auth`    | [spec](auth/spec.md) | vigente | Dayanna     | `apps/backend/src/modules/auth/`, `apps/backend/src/modules/users/` | — (frontend de `auth`: próximo cambio) |
