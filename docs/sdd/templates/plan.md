# Plan — <cambio> (<capacidad>)

Spec: `docs/specs/<slug>/spec.md` · Añade: … · Modifica: … · Retira: … · Constitución: vX.Y.Z

## Chequeo de constitución (puerta: antes de diseñar; se revisa en G2)

| ID  | Aplica | Cómo se cumple |
| --- | ------ | -------------- |

### Excepciones técnicas (solo si hay)

| ID  | Qué se exceptúa | Por qué hace falta | Alternativa descartada y por qué | Alcance (archivos) | Aprobada (G2, persona, fecha) |
| --- | --------------- | ------------------ | -------------------------------- | ------------------ | ----------------------------- |

## Enfoque

## Cambios por paquete

| Paquete            | Cambio |
| ------------------ | ------ |
| `@vm/shared-types` |        |
| `@vm/backend`      |        |
| `@vm/frontend`     |        |

## Compatibilidad entre apps (`docs/sdd/README.md`)

## Seguridad y permisos (C8)

## Pruebas por requisito (`docs/testing.md`)

<Solo los tests que se van a escribir. Uno por RF Crítico como mínimo; ninguno para un RF Estándar
salvo pedido explícito en G2. El agente no agrega tests fuera de esta tabla sin preguntar.>

| RF  | Criticidad | Test (nivel: unitario · slice · HTTP · hook · RTL · manual) | Qué verifica | Archivo |
| --- | ---------- | ----------------------------------------------------------- | ------------ | ------- |

### Tests que se retiran o reescriben (solo si hay)

| Test (archivo › nombre) | Señal (`docs/testing.md`: frágil · flaky · duplicado · trivial · RF retirado · código inexistente) | Qué lo reemplaza |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ---------------- |

## Revisión de arquitectura

| Hallazgo | Evidencia (archivo:línea o doc oficial) | Cambio |
| -------- | --------------------------------------- | ------ |

## Riesgos y decisiones (incluidas las que trascienden el cambio)
