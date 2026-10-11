# Especificación — Base del frontend: tema, feedback y layouts

| Campo                         | Valor                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado                        | vigente                                                                                                                                                                                                                                                                                                                                                  |
| Aprobada por / fecha          | Dayanna — 2026-10-10 (puerta G1)                                                                                                                                                                                                                                                                                                                         |
| Capacidad                     | `app-shell`                                                                                                                                                                                                                                                                                                                                              |
| Responsable                   | Dayanna                                                                                                                                                                                                                                                                                                                                                  |
| Constitución                  | revisada contra v1.0.0                                                                                                                                                                                                                                                                                                                                   |
| Última verificación vs código | 2026-10-10 (árbol de trabajo sobre `179a83c`; lo sella el commit de Dayanna)                                                                                                                                                                                                                                                                             |
| Código                        | `apps/frontend/src/app/` (`layout.tsx`, `globals.css`, `theme.css`, `not-found.tsx`, `(panel)/`), `apps/frontend/src/components/` (`ui/`, `feedback/`, `layout/`, `theme/`, `svg/`), `apps/frontend/src/config/navigation.ts`, `apps/frontend/src/lib/theme/`, `apps/frontend/src/lib/api/server-fetch.ts`, `apps/frontend/src/lib/api/fetch-wrapper.ts` |

## Contexto y objetivo

`docs/product.md` pide una SPA de aspecto premium, con **dark mode** nativo y **feedback visual**
(skeletons durante la carga, toasts de éxito y error, estados vacíos). Hoy el frontend tiene solo un
layout raíz con una cabecera mínima y una portada provisional. El dark mode sigue solo la preferencia
del sistema operativo, sin control manual, y no hay componentes de feedback. El cliente HTTP existe
(`src/lib/api/`), pero los pedidos hechos desde el servidor no llevan la cookie de sesión.

Esta spec cubre la **base** que van a consumir las demás capacidades del frontend:

- el tema (Claro, Oscuro o Sistema), persistente y sin parpadeo;
- los componentes de feedback, listos para usar;
- el cliente HTTP con las credenciales;
- la jerarquía de layouts, con el shell del panel: barra lateral, cabecera y área de contenido.

Resuelve la decisión abierta "Toggle de tema" de `docs/product.md`.

La dirección visual pedida es el minimalismo de Autodesk o Tesla, con la facilidad de uso de
Autodesk, sobre la paleta cerrada de `apps/frontend/src/app/theme.css`. Cómo se traduce en
tipografía, espaciado y componentes se decide en el plan; aquí solo cuenta lo observable.

**Sesión.** Esta base se construyó sin sesión en el frontend. El frontend de `auth` (spec `auth`,
RF-auth-17 a 34) agrega el login, las rutas privadas, el menú de la persona en la cabecera y cerrar
sesión: desde ese cambio, las páginas del panel exigen sesión (RF-auth-25).

## Actores y permisos

El shell es el mismo para todo rol. Quién puede ver el panel y qué controles existen según el rol
lo decide el frontend de `auth` (RF-auth-25, RF-auth-30 y RF-auth-31), con los roles de `ROLES`
(`@vm/shared-types`).

## Requisitos funcionales (EARS)

### Layouts y navegación

- **RF-app-shell-01** · estándar — Toda página debe compartir un layout raíz: documento en español,
  tema (RF-app-shell-05 a 07), contenedor de toasts (RF-app-shell-09) y tipografía. Las páginas del
  **panel** deben mostrarse además dentro del shell: barra lateral, cabecera y área de contenido
  principal. Las páginas fuera del panel (la de "no encontrada" y el login, RF-auth-17) no muestran
  el shell.
- **RF-app-shell-02** · estándar — La barra lateral debe mostrar la marca del producto, que lleva al
  Panel, y la lista de secciones del panel. Cada sección muestra su ícono y su nombre. La sección
  actual se marca a la vista y con `aria-current="page"`. Hoy la única sección es "Panel" (`/`):
  cada capacidad agrega la suya al crear su página, y nunca se enlaza una sección que no existe.
- **RF-app-shell-03** · estándar — La cabecera del panel debe mostrar el selector de tema
  (RF-app-shell-05), el menú de la persona (RF-auth-28) y, en pantallas angostas, el botón que abre
  la navegación (RF-app-shell-04).
- **RF-app-shell-04** · estándar — MIENTRAS la ventana mida 1024 px de ancho o más, la barra lateral
  debe estar siempre visible. MIENTRAS mida menos, debe ocultarse, y la cabecera debe mostrar un
  botón "Abrir menú" que la abre como panel superpuesto. Ese panel:
  - retiene el foco mientras está abierto;
  - se cierra con `Esc`, con un clic fuera, con su botón de cerrar o al elegir una sección;
  - al cerrarse, devuelve el foco al botón que lo abrió.

  El panel se usa sin desplazamiento horizontal desde 320 px de ancho.

### Tema

- **RF-app-shell-05** · estándar — El selector de tema debe ofrecer tres opciones: **Claro**,
  **Oscuro** y **Sistema**. Muestra cuál está elegida, se opera solo con teclado y tiene un nombre
  accesible. En la primera visita, la opción es **Sistema**.
- **RF-app-shell-06** · estándar — CUANDO la persona elige una opción, el sistema debe:
  - aplicarla al instante y a la vez en toda la interfaz: superficies, textos, componentes con
    variantes `dark:`, toasts y controles nativos del navegador (barras de desplazamiento,
    formularios). Ningún elemento queda con el tema anterior ni hace su propia transición de color;
  - guardarla en el navegador (`localStorage`), de modo que se mantenga al recargar, al volver otro
    día y al navegar entre páginas;
  - aplicarla también en las demás pestañas abiertas de la aplicación en ese navegador.

  MIENTRAS la opción sea **Sistema**, la interfaz sigue la preferencia del sistema operativo
  (`prefers-color-scheme`) y cambia sola si esa preferencia cambia con la página abierta.

- **RF-app-shell-07** · crítico (K5) — CUANDO se carga o recarga cualquier página, también en una
  pestaña nueva, el sistema debe pintar desde el primer cuadro el tema que corresponde: el guardado,
  o el del sistema operativo si la opción es Sistema o no hay ninguna guardada. Nunca muestra primero
  el otro tema, aunque el JavaScript de la página tarde en cargar. La consola del navegador no
  muestra errores ni advertencias de hidratación por el tema. Es K5 porque, si se rompe, nada avisa:
  en un equipo rápido el parpadeo apenas se ve. Su verificación es manual (ver "Verificación
  manual"), porque el repo no tiene E2E de navegador (`docs/testing.md`).

### Feedback visual

- **RF-app-shell-08** · estándar — El sistema debe ofrecer skeletons de carga listos para usar, con
  la forma del contenido final:
  - **tarjetas:** una grilla de N tarjetas;
  - **tabla:** encabezado y N filas de M columnas;
  - **gráfico:** título, área del gráfico y leyenda.

  Cada skeleton se anuncia una sola vez a los lectores de pantalla con un texto configurable (por
  defecto, "Cargando…"). Su animación de pulso se detiene si el sistema pide reducir el movimiento.

- **RF-app-shell-09** · estándar — El sistema debe ofrecer notificaciones flotantes (toasts) listas
  para usar:
  - **Tipos:** éxito, error y advertencia, cada uno con su ícono y su color de la paleta. El color
    nunca va solo: siempre hay ícono y texto.
  - **Error de API:** una variante de error recibe el error atrapado y muestra
    `toUserMessage(error, fallback)` (`src/lib/api/api-error.ts`). Así, el mensaje del backend solo
    aparece cuando está escrito para el usuario; en los demás casos se ve el fallback.
  - **Comportamiento:** aparecen apiladas en una esquina, siguen el tema elegido, se pueden cerrar
    con un botón, no tapan la navegación, se pausan mientras el puntero está encima y los lectores
    de pantalla las anuncian.
  - **Duración:** éxito y advertencia desaparecen solas a los 4 s; un error, a los 8 s.
  - **Navegación:** sobreviven a la navegación entre páginas, porque el contenedor está en el
    layout raíz.
- **RF-app-shell-10** · estándar — El sistema debe ofrecer un estado vacío listo para usar, para
  listados sin registros. Tiene ícono, título, descripción y una acción opcional (botón o enlace).
  Todos sus textos llegan por props tipadas.

### Páginas

- **RF-app-shell-11** · estándar — La página **Panel** (`/`) debe mostrar su encabezado (título y
  descripción), el panel de recursos (spec `resource-dashboard`) y, debajo, el listado de VMs
  (RF-virtual-machines-13).
- **RF-app-shell-12** · estándar — CUANDO se pide una ruta que no existe, el sistema debe responder
  `404` con una página fuera del shell. La página muestra un estado vacío que dice que la página no
  existe y ofrece volver al Panel.
- **RF-app-shell-13** · estándar — El shell debe ser accesible:
  - un enlace "Saltar al contenido" es lo primero que se enfoca, aparece al recibir el foco y lleva
    al contenido principal;
  - regiones `header`, `nav` (con nombre accesible) y `main`;
  - foco visible en todo control y todo operable con teclado;
  - texto con contraste de al menos 4.5:1 en los dos temas;
  - animaciones reducidas cuando el sistema lo pide (`prefers-reduced-motion`).

### Cliente HTTP

- **RF-app-shell-14** · crítico (K1, K3) — Todo pedido del navegador a la API debe ir a `/api/*` del
  mismo origen, nunca a la URL del backend, y con `credentials: 'include'`. Así, la cookie de sesión
  `HttpOnly` viaja sola, y el navegador aplica los `Set-Cookie` de la respuesta (login, renovación,
  logout) sin que el código lea, guarde ni arme el token: ni en `localStorage` ni en
  `sessionStorage`, ni en cabeceras. Además, el cliente desenvuelve `data` del sobre
  `{ success, data }` y, ante el sobre de error, lanza `ApiError` con `status` y `code`.
- **RF-app-shell-15** · crítico (K1, K3) — CUANDO el código de servidor de Next (Server Components)
  pide datos a la API, el sistema debe reenviar las cookies que el navegador mandó en el pedido de la
  página, las mismas que mandaría por el rewrite. Así, la API ve la misma sesión que el navegador. El
  pedido va solo al backend configurado (`NEXT_PUBLIC_API_URL`). Una respuesta obtenida con la sesión
  de una persona nunca se guarda en una caché que pueda servirse a otra.

## Requisitos no funcionales

- **RNF-app-shell-01** — Solo colores de la paleta (`theme.css`, `globals.css`): la guarda
  `src/app/palette.test.ts` sigue en verde. Las superficies y los textos genéricos usan tokens
  semánticos, no escalas con `dark:` (`apps/frontend/CLAUDE.md`, "Design System").
- **RNF-app-shell-02** — Los componentes se construyen sobre shadcn/ui (Radix UI + Tailwind CSS 4 +
  `class-variance-authority`), adaptados a los tokens del proyecto, con los íconos propios de
  `src/components/svg/`. La organización de carpetas (equivalencia con Atomic Design) se decide en el
  plan y queda documentada en las reglas del frontend.
- **RNF-app-shell-03** — Textos de la interfaz en español, sin librería de i18n:
  - los componentes reutilizables reciben sus textos por props tipadas;
  - los textos propios del shell (secciones, opciones de tema) viven en configuraciones tipadas
    `as const`.
- **RNF-app-shell-04** — Tipado estricto (sin `any`), funciones de menos de 50 líneas y
  `'use client'` solo en los componentes que lo necesitan (C9).
- **RNF-app-shell-05** — `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan sin errores, y
  `pnpm dev` arranca el frontend sin errores.
- **RNF-app-shell-06** — Grilla de 8 px y transiciones de 200 ms (`component-conventions.md`).

## Casos límite

- **Navegador que no deja guardar** (`localStorage` bloqueado o lleno): el selector funciona durante
  la visita y la página nunca falla; al recargar vuelve a Sistema (RF-app-shell-06).
- **Valor guardado que no es una de las tres opciones** (editado a mano): se ignora y se aplica
  Sistema, sin errores (RF-app-shell-06, 07).
- **Sistema operativo pasa a oscuro con la página abierta y la opción en Sistema:** la interfaz
  cambia sola. Con la opción en Claro u Oscuro no cambia (RF-app-shell-06).
- **Opción Claro con el sistema operativo en oscuro:** todo se ve claro, incluidos los componentes
  con variantes `dark:` (RF-app-shell-06, 07).
- **Cambio de tema en otra pestaña:** esta pestaña lo aplica sin recargar (RF-app-shell-06).
- **Navegador sin JavaScript:** la interfaz se ve en tema claro, sea cual sea la preferencia
  guardada o la del sistema. Se acepta: la aplicación es una SPA y no funciona sin JavaScript.
- **Ventana que se agranda a 1024 px o más con el menú móvil abierto:** el menú superpuesto se
  cierra y queda la barra lateral fija (RF-app-shell-04).
- **Varios toasts seguidos:** se apilan; los más viejos se compactan detrás del último y se
  despliegan al pasar el puntero (RF-app-shell-09).
- **Toast con un texto largo:** el texto se parte en líneas y nunca desborda la pantalla
  (RF-app-shell-09).
- **Toast lanzado justo antes de navegar** (p. ej., tras guardar un formulario): sigue visible en la
  página nueva (RF-app-shell-09).
- **Ruta inexistente dentro del panel** (`/algo`): la misma página 404, fuera del shell
  (RF-app-shell-12).
- **Pedido de servidor que recibe un `Set-Cookie`** (la renovación de la sesión, RF-auth-05): ese
  `Set-Cookie` no llega al navegador, porque un Server Component no puede escribir cookies. La
  renovación igual tiene que llegar al navegador: lo exige RF-auth-27 (frontend de `auth`), y su
  plan decide el camino (RF-app-shell-15).
- **Panel sin sesión:** redirige a `/login` sin mostrar nada del panel (RF-auth-25).

## Fuera de alcance

- **Frontend de `auth`:** login, rutas privadas, menú de la persona en la cabecera, cerrar sesión y
  manejo del `401` en el cliente. Están en la spec `auth` (RF-auth-17 a 34).
- **El contenido de las secciones:** listado y formulario de VMs (`virtual-machines`), panel de
  recursos (`resource-dashboard`) y tarjetas en tiempo real (`realtime-vm-status`). Cada uno agrega
  su sección a la barra lateral.
- **Internacionalización:** la interfaz es solo en español.
- **Más opciones en el shell:** colapsar la barra lateral a solo íconos, migas de pan y paleta de
  comandos.
- **Gráficos reales:** la librería se decide en `resource-dashboard`. Aquí solo va su skeleton.
- **Toasts con acciones** (p. ej., "Deshacer").
- **Tests E2E de navegador** (`docs/testing.md`).

## Contratos visibles

- **Rutas:**
  - `/` es el Panel, dentro del shell;
  - toda ruta inexistente responde `404` fuera del shell.
- **Preferencia de tema:** `localStorage`, clave `vm-theme`, valores `light`, `dark` o `system`.
- **Cliente HTTP** (sin cambios de firma para el navegador):
  - `get`, `post`, `put`, `patch` y `del` de `src/lib/api/fetch-wrapper.ts`;
  - `serverFetch` y `serverFetchResult` de `src/lib/api/server-fetch.ts`;
  - errores con `ApiError` y `toUserMessage`.
- **Sin cambios en `@vm/shared-types` ni en la API.**
- **Componentes para las features:** sus nombres y sus props se fijan en el plan, y las reglas del
  frontend (`component-imports.md`) los documentan.

## Verificación contra la constitución

| ID  | Aplica | Cómo se cumple                                                                                                                                                                                                                                                                                                                         |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Todo el comportamiento de la base del frontend está en esta spec antes de implementarse                                                                                                                                                                                                                                                |
| C2  | Sí     | Spec antes que código, en el mismo PR                                                                                                                                                                                                                                                                                                  |
| C3  | Sí     | G1 sobre esta spec; G2 sobre plan y tareas antes de tocar `apps/` y `packages/`                                                                                                                                                                                                                                                        |
| C4  | Sí     | Las cuatro dudas (tamaño, alcance sin el frontend de `auth`, secciones de la navegación, textos tipados sin i18n) se resolvieron en la clarificación (2026-10-10)                                                                                                                                                                      |
| C5  | Sí     | `docs/product.md` y `apps/frontend/CLAUDE.md` describen el dark mode solo por preferencia del sistema: se actualizan en este cambio. El Panel no puede mostrar el saludo con el usuario que se pensó en la clarificación, porque ese saludo depende del frontend de `auth`, que quedó fuera: muestra un estado vacío (RF-app-shell-11) |
| C6  | Sí     | RF-14 y RF-15 son Críticos (K1, K3): test con su ID. RF-07 es Crítico (K5): verificación manual escrita, porque no hay E2E de navegador. Los demás son Estándar y se comprueban en G4                                                                                                                                                  |
| C7  | No     | Sin cambios en el backend                                                                                                                                                                                                                                                                                                              |
| C8  | Sí     | El valor del tema leído de `localStorage` es entrada externa: solo se aceptan las tres opciones (casos límite). Sin formularios en este cambio                                                                                                                                                                                         |
| C9  | Sí     | Sin `any`, funciones < 50 líneas, `'use client'` solo donde hace falta (RNF-app-shell-04)                                                                                                                                                                                                                                              |
| C10 | No     | Nada nuevo se comparte con el backend: tema, navegación y componentes son solo del frontend                                                                                                                                                                                                                                            |
| C11 | Sí     | El plan consulta con Context7 o en el paquete instalado shadcn/ui, Radix UI, `sonner`, `next-themes` (u otra opción para el tema), `tw-animate-css`, `class-variance-authority`, `next/font` y Next 16                                                                                                                                 |
| C12 | No     | Sin secretos ni variables de entorno nuevas                                                                                                                                                                                                                                                                                            |

Sin excepciones.

## Verificación manual

- **RF-app-shell-07, tema sin parpadeo.** Con el frontend compilado (`pnpm build` y `pnpm start`),
  en Chrome, con las DevTools en "Network: Slow 4G" y "Disable cache" (el JavaScript tarda varios
  segundos):
  1. Sistema operativo (o la emulación de `prefers-color-scheme` de las DevTools) en claro; elegir
     **Oscuro** y recargar. Desde el primer cuadro, y mientras el JavaScript sigue cargando, la
     página se ve oscura.
  2. Sistema operativo en oscuro; elegir **Claro** y recargar. Nunca aparece un cuadro oscuro, y los
     componentes con variantes `dark:` se ven claros.
  3. Opción **Sistema** con el sistema operativo en oscuro; abrir la aplicación en una pestaña
     nueva. Se ve oscura desde el primer cuadro.
  4. En los tres casos, la consola no muestra errores ni advertencias de hidratación.

  Si las DevTools no alcanzan a capturar el primer cuadro, se usa su grabación de rendimiento con
  capturas de pantalla.

## Dudas abiertas

Ninguna. Resueltas en la clarificación del 2026-10-10:

- **Tamaño:** L, capacidad nueva `app-shell`.
- **Alcance:** solo la base. El frontend de `auth` (login, rutas privadas, perfil en la cabecera,
  cerrar sesión) queda para un cambio posterior de la spec `auth` (Fuera de alcance).
- **Navegación:** la barra lateral muestra solo las secciones que existen (hoy, el Panel); cada
  capacidad agrega la suya (RF-app-shell-02).
- **Textos:** en español, tipados por props y en configuraciones `as const`, sin i18n
  (RNF-app-shell-03).

## Historial

| Fecha      | Cambio                                                                                                                                                                                                                                                                                                                                                      | PR  | Requisitos                              | Aprobó                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------- | ------------------------ |
| 2026-10-10 | Creación: base del frontend (tema Claro/Oscuro/Sistema sin parpadeo, skeletons, toasts, estados vacíos, cliente HTTP con credenciales, layouts y shell del panel)                                                                                                                                                                                           | —   | RF-app-shell-01…15, RNF-app-shell-01…06 | Dayanna (G1)             |
| 2026-10-10 | Validación (G4): implementado y verificado. RF-07 con test (5 casos) y verificación manual en Chrome (JS demorado 4 s, 4 casos); RF-14 y RF-15 con test, y RF-15 además de punta a punta con la API real. Revisión local (code-reviewer, frontend-reviewer, security-auditor): el foco de los ítems del menú se corrigió; dos observaciones bajas aceptadas | —   | RF-app-shell-01…15                      | Dayanna (G4)             |
| 2026-10-10 | Delta de texto por el frontend de `auth`: login fuera del shell (RF-01), menú de la persona en la cabecera (RF-03), contexto, actores, casos límite "Panel sin sesión" y `Set-Cookie`, fuera de alcance. Sin RF nuevos ni retirados                                                                                                                         | —   | RF-app-shell-01, 03                     | Dayanna (G1, 2026-10-10) |
| 2026-10-11 | Delta de texto por el cambio `2026-10-11-frontend-vms`: el Panel muestra el panel de recursos y el listado de VMs en vez del estado vacío (RF-11). Sin RF nuevos ni retirados                                                                                                                                                                               | —   | RF-app-shell-11                         | Dayanna (G1, 2026-10-11) |
