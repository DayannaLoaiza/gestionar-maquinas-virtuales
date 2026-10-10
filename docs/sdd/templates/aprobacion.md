## Solicitud de aprobación — G<n> · <capacidad> · <cambio>

**Qué se aprueba:** <constitución / spec / plan + tareas / validación>, archivo(s): <rutas>

**Checklist (el agente lo completa; la persona lo verifica):**

- [ ] G0: cada principio cabe en una línea, tiene ID nuevo (nunca reutilizado) y "detalle en";
      versión según MAJOR/MINOR/PATCH; informe de impacto adjunto si es una enmienda
- [ ] G1: cada RF es observable y verificable; **cada RF tiene criticidad, y los Críticos citan
      su criterio K1–K6** (`docs/testing.md`); fuera de alcance explícito; sin `[NECESITA ACLARACIÓN]`
      bloqueante; tabla "Verificación contra la constitución" completa, con la versión anotada;
      **cada excepción propuesta, con justificación, alternativa descartada y alcance, para
      aprobarla una por una** (ninguna sobre C3)
- [ ] G2: "Chequeo de constitución" del plan completo; **cada excepción técnica propuesta, con
      justificación, alternativa descartada y alcance, para aprobarla una por una** (ninguna sobre
      C3); cada RF tiene al menos una tarea; ninguna tarea sin RF (salvo infraestructura,
      justificada); cada "Hecho cuando" es verificable; **cada RF Crítico con su test planificado (o
      verificación manual, si no se puede automatizar); ningún test para un RF Estándar salvo
      pedido; cada test a retirar o reescribir con su señal**; compatibilidad entre apps
      resuelta
- [ ] G4: **cada RF Crítico con test en verde que lleva su ID, o verificación manual hecha; los
      Estándar comprobados funcionando (una línea cada uno); ningún test fuera del plan; ningún
      test borrado, saltado ni debilitado sin aprobación** (se adjunta el diff de los archivos de
      test); **revisión local hecha (quién o qué agente), con los hallazgos resueltos o
      aceptados**; el código final no viola ningún `Cn` marcado como "aplica", **salvo las
      excepciones aprobadas y dentro de su alcance**; desvíos anotados; `tasks.md` → `cerrada`
- [ ] G3 (solo en las tareas marcadas ⏸ en G2): diff de la tarea resumido y sus tests en verde

**Resumen:** <RF en una línea cada uno, o tareas en una línea cada una>

**Riesgos / dudas que quedan:** …

> Responde **"apruebo"** para continuar, o indica los cambios. No avanzo sin un "apruebo" explícito.
