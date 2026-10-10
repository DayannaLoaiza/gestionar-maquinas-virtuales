# Spec Driven Development (spec-anchored)

**Spec-anchored:** la spec se escribe **antes** de implementar y se mantiene **viva y versionada**
junto al código. No se descarta al terminar, pero tampoco reemplaza al código: el código sigue
siendo lo que se edita. Las reglas no negociables están en `docs/constitution.md`.

## Dónde vive cada cosa

```text
docs/
  constitution.md                  principios C1…C12 (puerta G0)
  testing.md                       qué se testea y qué no (C6)
  sdd/README.md                    este archivo
  sdd/templates/                   spec.md · plan.md · tasks.md · aprobacion.md
  specs/README.md                  índice de capacidades con spec
  specs/<slug>/spec.md             VIVA: comportamiento esperado de una capacidad
  specs/<slug>/changes/<AAAA-MM-DD>-<cambio>/
    plan.md                        solo en cambios L; se congela al cerrar
    tasks.md                       en cambios M y L; único registro de tareas; se congela al cerrar
```

**Convenciones:**

- **Idioma y rutas:** el contenido va en español; las rutas y los slugs, en inglés
  (`virtual-machines/`).
- **IDs de requisito:** `RF-<slug>-NN` y `RNF-<slug>-NN`. Nunca se reutilizan; un RF retirado se
  tacha con fecha, PR y motivo, y sus tests se retiran en el mismo PR.
- **Sin gestores externos:** el trabajo vive en `tasks.md` y en el PR.
- **Ojo con "spec":** en `apps/backend`, `*.spec.ts` es un **test** de Jest, no una especificación.

## Tamaño del cambio

| Tamaño           | Cuándo                                                                                                                 | Artefactos                                             | Puertas                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------- |
| **S**            | No cambia comportamiento observable: refactor, chore, dependencias, docs, o un fix que vuelve a lo que ya dice la spec | Ninguno                                                | Ninguna                 |
| **M**            | Cambio acotado a una capacidad                                                                                         | Delta en `spec.md` + `changes/<fecha-cambio>/tasks.md` | G1+G2 en una sola, y G4 |
| **L**            | Capacidad nueva o cambio transversal                                                                                   | `spec.md` + `plan.md` + `tasks.md`                     | G1, G2, (G3), G4        |
| **Constitución** | Creación o enmienda de `docs/constitution.md`                                                                          | Fila en su historial                                   | G0                      |

Si un cambio S resulta cambiar comportamiento, o necesita una excepción a la constitución, el
agente **se detiene** y lo pasa a M.

## Puertas de aprobación humana

```text
(una vez, y en cada enmienda) Redactar constitución → [G0]

Especificar → Clarificar → [G1 spec] → Planificar → Tareas → [G2 plan + tareas] → código
  → T1 → T2 ⏸[G3] → … → Validar + revisión local → [G4] → PR
```

| Puerta               | Cuándo                          | El agente presenta (`templates/aprobacion.md`)                                                                                             | Desbloquea                       |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **G0 Constitución**  | Al crearla y en cada enmienda   | Principios en una línea cada uno, versión propuesta, informe de impacto si es enmienda                                                     | El flujo SDD                     |
| **G1 Spec**          | Tras especificar y clarificar   | RF en una línea cada uno con su criticidad, fuera de alcance, casos límite, dudas, tabla de constitución con la versión                    | Planificar                       |
| **G2 Plan + tareas** | Tras planificar y descomponer   | Chequeo de constitución, RF → tareas (todo RF cubierto), "Hecho cuando", pruebas por requisito, tests a retirar, riesgos, compatibilidad   | **Editar `apps/` y `packages/`** |
| **G3 Tarea**         | Solo tras las tareas marcadas ⏸ | Diff resumido + tests de la tarea en verde                                                                                                 | La tarea siguiente               |
| **G4 Validación**    | Tras la última tarea            | RF Crítico → test o verificación manual, RF Estándar comprobados, diff de los tests, informe de la revisión local, `Cn` cumplidos, desvíos | El PR                            |

- **Qué cuenta como aprobación:** solo un **"apruebo"** explícito o una respuesta inequívoca
  equivalente. "Ok", "dale", el silencio o un cambio de tema **no** cuentan: ante la duda, el agente
  vuelve a preguntar. Cualquier observación es "pedir cambios" y la puerta se presenta de nuevo.
- **Registro:** tras el "apruebo", el agente escribe `Estado: aprobada`, la fecha y quién aprobó
  (G0: versión e historial de la constitución; G1: `spec.md` y su historial; G2: `tasks.md`). **La
  persona lo sella con su commit:** los agentes no commitean.
- **G3 es a pedido:** en G2 se marcan con ⏸ las tareas tras las que el agente debe detenerse. Sin
  marca, implementa todas las tareas aprobadas y se detiene en G4.
- **Sin puerta aprobada, no hay código:** si le piden editar `apps/` o `packages/` en un cambio M o
  L sin G2, el agente responde qué puerta falta. Si durante la implementación aparece algo que
  cambia la spec, se detiene, actualiza la spec y vuelve a G1 solo por ese delta.

## Compatibilidad entre apps

Frontend y backend se despliegan por separado: un cambio de contrato (DTO de `@vm/shared-types`,
forma de respuesta, código de error) tiene que ser compatible hacia atrás mientras convivan la
versión vieja de una app y la nueva de la otra, o el plan dice explícitamente por qué no hace falta.

## Excepciones a la constitución

Las reglas están en `docs/constitution.md`, "Excepciones". En la práctica: van en la tabla
"Excepciones" de la spec (si afectan comportamiento) o del plan (si son técnicas), con
justificación, alternativa descartada y alcance, y la persona las aprueba **una por una** en G1 o
G2. C3 no admite excepciones.

## Prompts por fase

Sirven para cualquier agente. `<…>` se reemplaza.

**1. Especificar**

> Lee `docs/constitution.md`, `docs/sdd/README.md` y `docs/testing.md`. Vamos a trabajar en <qué>.
> Clasifica el cambio (S, M o L) y justifícalo. Si es M o L, crea o actualiza
> `docs/specs/<slug>/spec.md` con `docs/sdd/templates/spec.md`: RF en EARS, cada uno con su
> criticidad (K1–K6 o estándar), fuera de alcance, casos límite y la tabla de constitución. Marca lo
> no decidido con `[NECESITA ACLARACIÓN]`. No toques `apps/` ni `packages/`.

**2. Clarificar**

> Pregúntame cada `[NECESITA ACLARACIÓN]` de la spec, con tu recomendación y su motivo. Actualiza la
> spec con mis respuestas. Después presenta la puerta G1 con `docs/sdd/templates/aprobacion.md` y
> espera mi "apruebo".

**3. Planificar (solo L)**

> Con la spec aprobada, crea `changes/<AAAA-MM-DD>-<cambio>/plan.md` con
> `docs/sdd/templates/plan.md`. Primero el chequeo de constitución; después el enfoque, los cambios
> por paquete, la compatibilidad entre apps, las pruebas por requisito (solo las que exige
> `docs/testing.md`) y la revisión de arquitectura con evidencia (archivo:línea o doc oficial).

**4. Tareas**

> Descompón en `changes/<…>/tasks.md` con `docs/sdd/templates/tasks.md`: tareas de 30 min a 2 h,
> cada una con sus RF y un "Hecho cuando" verificable. Todo RF cubierto; ninguna tarea sin RF salvo
> infraestructura justificada. Presenta la puerta G2 (en M, G1+G2 juntas) y espera mi "apruebo".

**5. Implementar**

> Implementa las tareas del `tasks.md` aprobado, en orden. Marca cada checkbox al terminar y corre
> los tests de cada RF con `-t "RF-<slug>-NN"`. Detente tras las tareas marcadas ⏸. Si algo cambia
> la spec, necesita una excepción o un test falla, detente y pregúntame: no borres, saltes ni
> debilites un test.

**6. Revisión local** (en una **sesión nueva**, no en la que escribió el código)

> Revisa `git diff <rama-base>...HEAD` contra `docs/specs/<slug>/spec.md`, `docs/constitution.md` y
> `docs/testing.md`. Reporta solo lo que afecta la corrección o los requisitos: RF sin implementar o
> distinto de la spec, un `Cn` violado fuera de las excepciones aprobadas, un RF Crítico sin test,
> tests fuera del plan, triviales o debilitados, y cambios fuera del alcance. No propongas mejoras
> de estilo.

**7. Validar (G4)**

> Presenta la puerta G4: cada RF Crítico con su test en verde (o su verificación manual hecha), cada
> RF Estándar comprobado funcionando, el diff de los archivos de test, el informe de la revisión
> local, los `Cn` que aplican y los desvíos. Con mi "apruebo", pasa la spec a `vigente`, anota la
> verificación vs código y pasa `tasks.md` a `cerrada`.

## Revisión: siempre local

La revisión de código se hace **en local, antes de abrir el PR**: un agente con contexto nuevo
(prompt 6) y la persona en G4. Si hay CI, corre solo guardas deterministas (lint, typecheck, test,
build), que no son una revisión.

## Mantener la spec viva

- **Mismo PR (C2):** si cambia el comportamiento, la spec cambia antes que el código y en el mismo
  PR.
- **Discrepancias (C5):** si spec y código no coinciden, se reporta. El código dice lo que el sistema
  hace; la spec, lo que debe hacer. La persona decide si es un bug o una spec desactualizada.
- **La spec no lleva implementación:** spec = comportamiento observable; plan = cómo.
- **Capacidades sin spec:** siguen descritas en el `README.md` (sección "API") y en el código.
  Reciben spec solo cuando van a cambiar.

## Claude Code

Carga `CLAUDE.md` → `docs/constitution.md` por import. Lo propio de Claude (preguntar en las
puertas con `AskUserQuestion`, no delegar fases a Explore ni a Plan, los revisores locales) está en
`.claude/rules/claude-code.md`. `/sdd <fase> <pedido>` arranca una fase y activa el freno técnico de
G2 (`scripts/sdd-gate.mjs`): desde ahí, editar `apps/` o `packages/` sin un `tasks.md` aprobado
pide confirmación.

## Lo que viene

- **`scripts/check-spec-trace.mjs`:** RF Críticos sin test; tests con IDs retirados; `.skip` y
  `.only`; excepciones vigentes por principio.
