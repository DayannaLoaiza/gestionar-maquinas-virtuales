# Tareas — VMs de ejemplo en el seed y README integral (`2026-10-11-seed-and-readme`)

| Campo                | Valor                                         |
| -------------------- | --------------------------------------------- |
| Estado               | cerrada                                       |
| Aprobada por / fecha | Dayanna — 2026-10-11 (puerta G1+G2, cambio M) |
| Cerrada              | 2026-10-11 (puerta G4, Dayanna); PR pendiente |

Cambio M: delta de `virtual-machines` (RF-virtual-machines-28) y documentación. Sin `plan.md`. La
documentación (T2–T5) no tiene RF: es el pedido de `docs/product.md` → "Documentación que el README
debe tener", y su "hecho" son los criterios de cada tarea. Sin ⏸: G4 al final.

**Reglas para todo el README:** Markdown que pasa `prettier --check`; enlaces internos que apuntan a
archivos que existen; cada dato (versión, puerto, comando, variable, código de error) sale del repo,
no de memoria; diagramas en Mermaid que se dibujan sin error; sin nombrar a terceros ni el contexto
en que se pidió el proyecto; el texto describe el estado actual, no la historia de cambios (salvo la
Bitácora de IA, que cuenta cómo se guió a la IA). Se conserva todo el contenido técnico actual.

**Orden del README (aprobado en la clarificación):** título, resumen e índice; Qué hace;
Requisitos previos; Puesta en marcha desde cero; Credenciales de prueba y datos de ejemplo
(recorrido de revisión, Postman); Problemas frecuentes; Arquitectura; Decisiones de arquitectura
(tecnologías, carpetas, diseño, proceso); Contrato de la API y tiempo real; Despliegue fuera de
local; Scripts; Limitaciones y próximos pasos; Bitácora de IA.

- [x] T1. VMs de ejemplo en `db:seed` · `@vm/backend` · (RF-virtual-machines-28)
      `VirtualMachineRepository.count()` y `VirtualMachinesService.hasAny()` (C7);
      `VirtualMachinesModule` exporta el service; `src/database/sample-virtual-machines.ts` con la
      tabla de la spec (DS2), validada con `CreateVirtualMachineDTO`; `seed.ts` importa
      `EventEmitterModule` y `VirtualMachinesModule` (el service inyecta `EventEmitter2`; se consulta
      con Context7, C11) y, después de los usuarios, crea las VMs con el Administrador de prueba como
      autor si `hasAny()` es falso, o informa que las omite. Comentarios del seed y de `.env.example`
      al día.
      Hecho cuando: `lint`, `typecheck` y `build` del backend pasan en el scratchpad; sobre una base
      recién migrada, `db:seed` informa 2 usuarios y 6 VMs creados y `GET /api/vms` devuelve las seis
      de la tabla; la segunda corrida informa "ya existían" y deja 6; con una sola VM creada a mano,
      no crea ninguna; con `NODE_ENV=production` termina con error sin crear nada; los tests del
      backend (unitarios y e2e) siguen en verde.
- [x] T2. README: puesta en marcha desde cero · raíz · (documentación; corrige la discrepancia C5)
      Prerrequisitos en tabla (Node 22, pnpm 10.33.0 con Corepack, Docker con Compose v2 o un
      PostgreSQL 16 propio, Git) con el comando para comprobar cada uno. Pasos numerados desde
      `git clone` hasta entrar con cada rol, cada uno con su comando y lo que se debe ver, con el build
      de `@vm/shared-types` antes de `db:migrate`. Tabla de las variables de los dos `.env.example`
      (qué hace cada una y si hay que cambiarla). `pnpm dev` como ejecución simultánea (qué levanta,
      en qué puertos, cómo se detiene). Notas para Windows (copiar archivos en PowerShell y CMD;
      instalar y correr en el mismo sistema operativo). Tabla de problemas frecuentes (síntoma →
      causa → solución), cada fila comprobada contra el código.
      Hecho cuando: T7 recorre estos pasos al pie de la letra en un clon limpio y llega al Panel con
      los dos roles sin un paso que no esté escrito.
- [x] T3. README: credenciales de prueba y seed · raíz · (documentación; RF-virtual-machines-28,
      RF-auth-15)
      Tabla de credenciales con qué puede hacer y qué ve cada rol. Qué crea `db:seed` (los dos
      usuarios y las seis VMs, solo si no hay ninguna), que se puede repetir sin duplicar, que se
      niega a correr en producción y cómo empezar de cero (`docker compose down -v`). Un recorrido
      corto para revisar el proyecto: Administrador en una ventana y Cliente en otra, crear, editar,
      encender y eliminar, ver el cambio de estado en tiempo real en la otra ventana y comprobar que el
      Cliente no tiene controles de escritura. Se mantiene la guía de Postman.
      Hecho cuando: cada credencial y cada paso del recorrido se comprueban en T7.
- [x] T4. README: arquitectura y decisiones · raíz · (documentación)
      Diagrama de la interacción entre el cliente (Next.js), la API REST (Nest.js) y el servicio de
      tiempo real (Socket.io), con una explicación numerada de cada flecha y una tabla de los dos
      canales (REST y WebSocket: quién inicia, cómo se autentica, qué viaja, para qué). Se conservan
      los diagramas actuales (cambio de estado de punta a punta, sesión en el frontend, estado de las
      VMs). Tabla de tecnologías con el porqué de cada una y su fuente (spec o plan): pnpm workspaces y
      Turborepo, Nest.js, Next.js App Router, PostgreSQL y TypeORM, Zod en `@vm/shared-types`, JWT en
      cookie `HttpOnly` y Argon2id, Socket.io, TanStack Query, Zustand, Recharts, Tailwind y
      shadcn/ui. Estructura de carpetas del monorepo con sus reglas (apps que no se importan entre sí,
      contratos en `packages/`, Controller → Service → Repository en el backend, Atomic Design y
      `features/` en el frontend). Las decisiones de diseño actuales, agrupadas. El proceso en breve
      (constitución, SDD con puertas humanas, pruebas por riesgo), con enlaces.
      Hecho cuando: cada porqué cita su fuente en el repo; los diagramas se dibujan sin error en T7.
- [x] T5. README: limitaciones y bitácora de IA · raíz · (documentación)
      Sección "Limitaciones y próximos pasos": el proyecto es un producto mínimo viable, y lo que
      queda sale de los "Fuera de alcance" y "Riesgos" de las specs y planes (paginación y búsqueda,
      control de concurrencia con versión, CSP con nonce, varias instancias con Redis, difusión en
      tiempo real de altas y bajas, rate limit de las VMs, pruebas E2E de navegador, CI y
      despliegue). Al final del README, **"Bitácora de IA"** con exactamente tres puntos.
      **Punto 1, herramientas:** Claude Code y Context7 (MCP), y cómo se configuraron para guiar a
      la IA (`CLAUDE.md`, constitución, reglas por app, agentes revisores, skills, el hook de la
      puerta SDD). **Punto 2, qué se delegó y dónde se intervino:** se delegaron los borradores de
      specs, planes y tareas, la implementación de módulos, componentes y tests, y la verificación
      y las revisiones locales con agentes. La desarrolladora intervino en el análisis y la
      definición de requisitos antes de cada prompt, la elección de tecnologías y librerías, la
      elección de SDD con aprobación humana explícita, la estructura de carpetas, los estilos y la
      identidad visual. Ejemplos concretos: la exigencia de un análisis OWASP con evidencia antes de
      aprobar (encontró fallas reales: clickjacking, credenciales en la URL antes de hidratar, caché
      del router al volver Atrás); el cambio de scrypt a Argon2id para las contraseñas; el rechazo de
      funcionalidades o datos fuera de una spec. Cierra con que es un
      producto mínimo viable con margen de mejora (enlace a "Limitaciones y próximos pasos").
      **Punto 3, prompts clave:** el título del punto y dos espacios en blanco para pegar los
      prompts.
      Hecho cuando: la sección es la última del README, tiene los tres puntos y no menciona
      herramientas que no se usaron.
- [x] T6. Documentos que nombran el seed · raíz, `@vm/backend` · (RF-virtual-machines-28)
      `CLAUDE.md` (datos semilla permitidos), `apps/backend/CLAUDE.md` (comando `db:seed`),
      `docs/specs/README.md` (cambio en curso) y la spec (estado, historial).
      Hecho cuando: ningún documento dice que `db:seed` crea solo usuarios.
- [x] T7. Validación desde cero · scratchpad · (RF-virtual-machines-28; infraestructura de
      verificación de T1–T5)
      Copia limpia del repo (archivos versionados más los de este cambio, sin `node_modules` ni
      `dist`); PostgreSQL en un proyecto de Docker Compose aparte (`-p vm-readme-check`, puerto
      5434), que se borra al terminar con `down -v`; tu base y tus puertos no se tocan. Se siguen los
      pasos del README al pie de la letra, salvo los puertos (3100 y 3104, nunca 3000/3001). Se
      corre el seed dos veces y con `NODE_ENV=production`. En Chrome headless se entra con los dos
      usuarios y se hace el recorrido de T3. Los diagramas Mermaid se dibujan con `mermaid.render`.
      Hecho cuando: todo lo anterior pasa, o cada falla se corrige en el README o en el código (y se
      reporta en G4).

## Desvíos durante la implementación

| Tarea | Qué cambió respecto de la tarea aprobada                                                                    | Por qué                                                                                                                                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1    | `VirtualMachinesService.count()` en vez de `hasAny()`, y `VirtualMachinesModule` no exporta el service      | El conteo permite informar cuántas VMs hay al omitir. En una aplicación standalone, `app.get()` sin `strict` busca en todos los módulos (doc de Nest, Context7): exportar sobraba |
| T3    | El paso del recorrido que muestra la reversión usa _Network request blocking_ en vez de _Network → Offline_ | Verificado en T7: sin red, TanStack Query pausa la mutación (`networkMode: 'online'`) y la envía al volver; con la petición bloqueada, falla y se revierte con su toast           |
| T7    | `pnpm dev` corrió con el script del frontend en el puerto 3100 (solo en la copia)                           | `next dev --port 3000` está fijo en `package.json` y desde WSL no se usan 3000/3001                                                                                               |
