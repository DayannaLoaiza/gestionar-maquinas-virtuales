---
name: sdd
description: 'Flujo SDD spec-anchored del proyecto: especificar, planificar, implementar, revisar o validar un cambio M o L con las puertas G0–G4. Activa el freno de G2 por el resto de la sesión.'
argument-hint: '[fase] [capacidad o pedido]'
disable-model-invocation: true
hooks:
  PreToolUse:
    - matcher: 'Edit|Write|NotebookEdit'
      hooks:
        - type: command
          command: 'node "${CLAUDE_PROJECT_DIR}/scripts/sdd-gate.mjs"'
---

Lee `docs/sdd/README.md` y ejecuta la fase pedida con su prompt ("Prompts por fase"), contra
`docs/constitution.md` y `docs/testing.md`. Pedido: $ARGUMENTS

- Sin fase explícita, decide el tamaño (S, M o L) y confírmalo con `AskUserQuestion` antes de crear
  artefactos.
- En cada puerta presenta `docs/sdd/templates/aprobacion.md` y pregunta "Apruebo" / "Pedir
  cambios": solo un "Apruebo" explícito cuenta.
- Desde esta invocación y hasta que termine la sesión, un hook (`scripts/sdd-gate.mjs`) pide
  confirmación antes de editar `apps/` o `packages/` sin un `tasks.md` aprobado, y antes de editar
  `docs/constitution.md`. No ve ediciones hechas por Bash: no las uses para esquivarlo.
