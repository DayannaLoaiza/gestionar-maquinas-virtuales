# Especificación — <Capacidad>

| Campo                         | Valor                                                        |
| ----------------------------- | ------------------------------------------------------------ |
| Estado                        | borrador · aprobada · vigente · retirada                     |
| Aprobada por / fecha          | <persona> — AAAA-MM-DD (puerta G1)                           |
| Capacidad                     | `<slug>`                                                     |
| Responsable                   | <quién aprueba cambios a esta spec>                          |
| Constitución                  | revisada contra vX.Y.Z                                       |
| Última verificación vs código | AAAA-MM-DD (<commit corto>)                                  |
| Código                        | `apps/backend/src/modules/<x>/`, `apps/frontend/src/<y>/`, … |

## Contexto y objetivo

## Actores y permisos

<Roles del sistema y qué puede hacer cada uno (cuando existan, desde su definición en `@vm/shared-types`). Enlazar, no copiar.>

## Requisitos funcionales (EARS)

<Cada RF lleva su criticidad (`docs/testing.md`): `crítico (K…)` con el criterio que cumple, o `estándar`.>

- **RF-<slug>-01** · crítico (K1) — CUANDO <evento>, el sistema debe <respuesta observable>.
- **RF-<slug>-02** · crítico (K4) — SI <condición no deseada>, ENTONCES el sistema debe <respuesta>.
- **RF-<slug>-03** · estándar — MIENTRAS <estado>, el sistema debe <respuesta>.
- **RF-<slug>-04** · estándar — DONDE <función opcional esté habilitada>, el sistema debe <respuesta>.
- **RF-<slug>-05** · crítico (K3) — El sistema debe <comportamiento permanente>.
- ~~**RF-<slug>-06**~~ — Retirado el AAAA-MM-DD en #<PR>: <motivo>. Sus tests se retiraron en el mismo PR.

## Requisitos no funcionales

- **RNF-<slug>-01** — …

## Casos límite

## Fuera de alcance

## Contratos visibles

<Endpoints, URLs, DTO de `@vm/shared-types`: nombre y enlace, sin copiar esquemas.>

## Verificación contra la constitución

| ID  | Aplica | Cómo se cumple |
| --- | ------ | -------------- |
| C1  |        |                |
| …   |        |                |

### Excepciones (solo si hay; ver la sección "Excepciones" de la constitución)

| ID  | Qué se exceptúa | Por qué hace falta | Alternativa descartada y por qué | Alcance (RF, archivos) | Aprobada (G1, persona, fecha) |
| --- | --------------- | ------------------ | -------------------------------- | ---------------------- | ----------------------------- |

## Verificación manual

<Solo los RF Críticos que no se pueden automatizar (p. ej. la integración real con un hipervisor):
pasos reproducibles y resultado esperado. Se repite en cada cambio que la toque. El
mapa RF → test sale de buscar el ID en los tests. Los RF Estándar no van acá: se comprueban en G4.>

## Dudas abiertas

- [NECESITA ACLARACIÓN] <duda>

## Historial

| Fecha | Cambio | PR  | Requisitos | Aprobó |
| ----- | ------ | --- | ---------- | ------ |
