# Constitución de gestionar-maquinas-virtuales

Versión: 1.0.0 · Ratificada: 2026-10-10 por Dayanna (G0) · Última enmienda: —

Principios no negociables. Gobiernan toda spec, plan, tarea y cambio de código, con cualquier agente. Si uno no puede cumplirse, se detiene el trabajo y se pregunta (C4). Los tamaños de cambio (S, M, L) y las puertas (G0–G4) están en `docs/sdd/README.md`.

## Proceso (SDD)

- **C1. La spec manda.** Ningún comportamiento observable de un cambio M o L se implementa sin estar en una spec aprobada. _Detalle: `docs/sdd/README.md`_
- **C2. Primero la spec.** Si cambia el comportamiento, la spec se actualiza antes que el código, en el mismo PR. _Detalle: `docs/sdd/README.md`_
- **C3. Aprobación humana antes del código.** En cambios M y L, el agente se detiene en G1 y G2 (en M, una sola puerta) y espera un "apruebo" explícito; sin él no edita `apps/` ni `packages/`. _Detalle: `docs/sdd/README.md`_
- **C4. No inventar.** Lo no decidido se marca `[NECESITA ACLARACIÓN]` y se pregunta.
- **C5. Discrepancias a la vista.** Si spec y código no coinciden, se reporta; no se corrige ninguno en silencio.
- **C6. Pruebas por riesgo.** Todo RF Crítico (K1–K6) tiene un test automatizado con su ID, o una verificación manual escrita si no se puede automatizar; lo Estándar no exige test. Ningún test se borra, se salta ni se debilita sin aprobación en G2. _Detalle: `docs/testing.md`_

## Producto y arquitectura

- **C7. Capas.** Controller → Service → Repository; un controller nunca inyecta un repositorio ni filtra, calcula o mapea datos. _Detalle: `apps/backend/.claude/rules/nestjs-patterns.md`, "Layer Separation"_
- **C8. Seguridad.** Toda entrada externa se valida en el borde (cuerpos con esquemas Zod de `@vm/shared-types`, parámetros con pipes); contraseñas con Argon2id (sal aleatoria por hash, parámetros mínimos de OWASP); OWASP Top 10. _Detalle: `apps/backend/.claude/rules/nestjs-patterns.md`_
- **C9. Código limpio.** Sin `any`, funciones de menos de 50 líneas, early returns, SOLID. _Detalle: `.claude/rules/code-style.md`_
- **C10. Lo compartido, en paquetes.** Lo que usan las dos apps va a `packages/`; nunca hay imports entre `apps/frontend` y `apps/backend`. _Detalle: `.claude/rules/monorepo-conventions.md`_
- **C11. Documentación vigente.** Antes de usar una librería externa se consulta su documentación oficial actual. _Detalle para Claude: `.claude/rules/claude-code.md`_

## Operación

- **C12. Secretos fuera del repo.** Nunca se commitean `.env` ni valores secretos; solo `.env.example` con valores de desarrollo. _Detalle: `.gitignore`_

## Precedencia

Constitución > reglas del proyecto (`CLAUDE.md`, `.claude/rules/`) y spec aprobada > skills de terceros. Si una spec choca con una regla, se detiene y se pregunta (C4).

## Excepciones

- Se admiten, salvo en C3. Cada una se registra en la tabla de constitución de la spec o del plan, con justificación, alternativa descartada y alcance.
- Solo la aprueba una persona, en G1 o G2; el agente nunca la autoaprueba. Si aparece durante la implementación, se detiene y vuelve a G2; un cambio S que la necesite pasa a M.
- Vale para ese cambio y su alcance; no sienta precedente. Si tendría que valer para todo el proyecto, es una enmienda (G0).
- Si un principio acumula excepciones en 2 o más specs vigentes, se propone enmendarlo (G0).

## Enmiendas

- Toda enmienda pasa por la puerta G0 y deja una fila en el historial.
- MAJOR: se quita o redefine un principio (requiere justificación en su fila del historial). MINOR: se agrega o amplía. PATCH: redacción.
- Los IDs no se reutilizan; un principio retirado se tacha con fecha y motivo.
- Con cada enmienda MINOR o MAJOR, informe de impacto: specs y planes que citan los IDs cambiados.

## Historial de enmiendas

| Versión | Fecha      | Cambio                                                                                                                                                         | Impacto                   | Aprobó       |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------ |
| 1.0.0   | 2026-10-10 | Creación a partir de la constitución 1.0.0 de Visor: C1–C11 adaptados a este repo, C8 con Argon2id, C12 = secretos. Sin migraciones ni despliegue (no aplican) | Ninguno: aún no hay specs | Dayanna (G0) |
