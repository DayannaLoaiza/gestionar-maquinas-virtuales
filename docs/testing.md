# Política de pruebas: por riesgo, no por cobertura

Rige todo cambio de código, con o sin spec (constitución, **C6**). Las secciones "Testing" de
`apps/backend/CLAUDE.md` y `apps/frontend/CLAUDE.md` dicen **cómo** se escribe un test en cada app;
este archivo dice **qué** se testea y qué no.

## En una frase

**Test automatizado obligatorio solo para los requisitos Críticos.** Lo demás se comprueba una vez,
en la validación (G4), sin dejar un test. Cada test nace atado a un requisito y muere con él.

- **Por qué no "todo":**
  - Un test se escribe una vez, pero se mantiene, se ejecuta y se revisa para siempre.
  - Con agentes, escribir un test cuesta casi nada; el riesgo real es acumular **demasiados**.
  - La cobertura como meta produce tests vacíos.
- **Por qué no "a criterio":** sin criterios escritos, cada sesión y cada agente decide distinto,
  y lo crítico queda sin test por omisión.

## Criticidad de cada requisito

Se asigna en la spec, en G1, y la revisa la persona.

| Nivel        | Cuándo                                                                                               | Qué exige                                                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Crítico**  | Cumple al menos uno de K1–K6                                                                         | **Test automatizado** con el ID del RF en el nombre. Si no se puede automatizar, **verificación manual escrita** en la spec, que se repite en cada cambio que la toque           |
| **Estándar** | No cumple ninguno: presentación, textos, layout, orden, mensajes, navegación simple, CRUD sin reglas | **Sin test obligatorio.** Se comprueba en G4 viéndolo funcionar, con una línea en el informe de G4. No se escribe un test para un RF Estándar salvo que la persona lo pida en G2 |

- **K1. Seguridad y acceso:** autenticación, sesión, roles, entradas hostiles, secretos, rate
  limit.
- **K2. Datos:** escribe, borra o cambia el estado de datos; operaciones irreversibles (borrar una
  VM, cambiar su estado de encendido).
- **K3. Contrato entre partes:** DTO de `@vm/shared-types`, endpoint que consume la otra app, el
  sobre `{ success, data }` / `{ success: false, error }`.
- **K4. Lógica no trivial:** condicionales combinados, parsing, cálculos, máquinas de estado (las
  transiciones de encendido de una VM), paginación.
- **K5. Falla silenciosa:** si se rompe, nada avisa (configuración, arranque, caché, un alias `@/`
  sin resolver en `dist/`, un color inexistente). Ya pasó en este repo: `PORT` del `.env` no se
  convertía a número y el API no arrancaba.
- **K6. Ya falló:** hubo un bug real. Un bug sobre un RF Estándar lo **promueve** a Crítico, con su
  test de regresión.

Dos niveles y no tres: un nivel "medio" (test "si es barato") termina siendo la puerta por la que
entra todo. Con dos, la pregunta es binaria y se responde con K1–K6.

## Qué test: el más barato que protege el comportamiento

| Se protege                              | Test                                                           | Ejemplo en el repo                                                   |
| --------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Lógica pura o algoritmo (K4)            | Unitario, sin mocks                                            | `pagination.util.spec.ts`                                            |
| Comportamiento de un service (K2, K4)   | Service real, mocks solo en los bordes (repositorio, red)      | — (hoy ninguno)                                                      |
| Validación que pasa por Express y pipes | e2e sobre `AppModule` (supertest)                              | `test/app.e2e-spec.ts`                                               |
| Contrato de error (K3, K5)              | Unitario del filtro                                            | `all-exceptions.filter.spec.ts`                                      |
| Lógica de cliente (K3, K5)              | Vitest de lógica                                               | `api-error.test.ts`, `fetch-wrapper.test.ts`, `server-fetch.test.ts` |
| Interacción crítica de UI               | RTL de componente, solo si es Crítico y no se cubre por lógica | — (hoy ninguno)                                                      |
| Configuración y arranque (K5)           | Spec del esquema                                               | `env.validation.spec.ts`                                             |
| Guardas estructurales (K5)              | Test o script que recorre el código                            | `scripts/check-dist-aliases.mjs`, `palette.test.ts`                  |

- **Comportamiento, no métodos.** Se prueba a través de la superficie pública. El test ideal no
  cambia en un refactor, una feature nueva ni un fix: solo cuando cambia el comportamiento.
- **Resultado, no llamadas.** Se verifica qué devuelve, no qué funciones se llamaron. Los mocks van
  solo en los bordes (red, reloj, servicios externos).
- **Sin snapshots.**
- **Sin E2E de navegador por ahora.** Se reevalúa si crecen los Críticos que solo tienen
  verificación manual.

## Qué no se testea

- Código trivial: getters, DTOs, mapeos 1:1, delegaciones de una línea.
- Lo que ya garantizan TypeScript, el esquema Zod declarado o el lint. Sí se prueba que el endpoint
  **aplica** el esquema (el e2e).
- El comportamiento de Nest, Next, Zod, TanStack o Radix.
- Estilos, textos y layout.
- El mismo RF dos veces al mismo nivel.
- Tests "change-detector": los que verifican la implementación (qué se llamó, en qué orden) en vez
  del resultado.

## Ciclo de vida: cómo no acumular tests que sobran

1. **Nace en el plan.** La tabla "Pruebas por requisito" del `plan.md` (aprobada en G2; en un cambio
   M, las tareas de `tasks.md`) lista cada test: RF, nivel y qué verifica. Ningún agente agrega
   tests fuera de esa tabla sin preguntar, y G4 compara lo escrito contra la tabla.
2. **Lleva su dueño en el nombre**, `RF-<slug>-NN`, en el `describe` o en el `it`. Así se rastrea
   hasta un requisito vigente y se ejecuta solo:
   `pnpm --filter @vm/backend test -t "RF-<slug>-03"` (también `test:e2e` y Vitest). Sin `--`:
   pnpm lo reenviaría al runner y el filtro se perdería.
3. **Muere con su requisito.** Si un RF se retira de la spec, sus tests se borran o se reasignan en
   el mismo PR.
4. **Señales de que un test sobra.** Se revisa cuando aparece la señal, no en limpiezas periódicas:
   - **Se rompió en un refactor sin cambio de comportamiento:** está acoplado a la implementación.
     Se reescribe contra la superficie pública o se borra.
   - **Falla sin cambio de código (flaky):** se arregla o se borra en ese mismo cambio. Nunca queda
     un `.skip` permanente.
   - **Sobra por su contenido:** duplica a otro, prueba algo trivial o del framework, o su código ya
     no existe.
5. **Nunca en silencio.** Ningún agente borra, salta ni debilita un test para ponerlo en verde.
   - Debilitar incluye cambiar el valor esperado, ampliar un matcher o mockear lo que se prueba.
   - Si un test falla, se detiene y pregunta (C4, C5).
   - Borrar o reescribir un test va en la tabla "Tests que se retiran o reescriben" del plan (en M,
     como tarea), con su señal, y se aprueba en G2.
6. **Tests anteriores a las specs** (los de la configuración inicial): no tienen ID de RF. Al tocar uno
   en un cambio M o L se clasifica: si protege un RF de la spec, recibe el ID; si muestra una señal
   del punto 4, se propone retirarlo en G2; si protege algo Crítico sin spec, queda como está.

## Métricas

- **Sin porcentaje de cobertura como meta.** El reporte de cobertura sirve solo como diagnóstico,
  para encontrar código Crítico sin test.
- **Métrica que sí se exige:** el 100 % de los RF Críticos vigentes tiene un test con su ID, o una
  verificación manual escrita.
- **Salud de la suite:** ningún test flaky tolerado; ningún `.skip`, `.only` ni `xit` en la rama
  principal.

## Fuentes

- Martin Fowler, _TestCoverage_ (2012): https://martinfowler.com/bliki/TestCoverage.html
- _Software Engineering at Google_, caps. 11 y 12 (O'Reilly, 2020):
  https://abseil.io/resources/swe-book/html/ch11.html y
  https://abseil.io/resources/swe-book/html/ch12.html
- Kent Beck, respuesta a _"How deep are your unit tests?"_ (Stack Overflow, 2008):
  https://stackoverflow.com/questions/153234/how-deep-are-your-unit-tests
- Vladimir Khorikov, _Unit Testing: Principles, Practices, and Patterns_ (Manning, 2020).
- Anthropic, _Claude Code: Best practices_: https://code.claude.com/docs/en/best-practices
