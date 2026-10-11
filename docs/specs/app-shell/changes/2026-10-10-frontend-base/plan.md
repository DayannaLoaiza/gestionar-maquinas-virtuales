# Plan — Base del frontend: tema, feedback y layouts (app-shell)

Spec: `docs/specs/app-shell/spec.md` · Añade: RF-app-shell-01…15, RNF-app-shell-01…06 · Modifica:
— · Retira: — · Constitución: v1.0.0

## Chequeo de constitución (puerta: antes de diseñar; se revisa en G2)

| ID  | Aplica | Cómo se cumple                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Solo se implementa lo de la spec aprobada (G1, 2026-10-10)                                                                                                                                                                                                                                                                                                                                              |
| C2  | Sí     | La spec ya está aprobada; si algo la cambia durante la implementación, me detengo y vuelvo a G1 por ese delta                                                                                                                                                                                                                                                                                           |
| C3  | Sí     | No se toca `apps/` ni `packages/` hasta el "apruebo" de G2                                                                                                                                                                                                                                                                                                                                              |
| C4  | Sí     | Sin dudas abiertas. Las decisiones técnicas (D1–D7) quedan en este plan y se aprueban en G2                                                                                                                                                                                                                                                                                                             |
| C5  | Sí     | Se reportan tres discrepancias con las reglas, resueltas en T7: `component-imports.md` manda instalar con `npx shadcn add` (D2), `component-conventions.md` da por existente una regla de movimiento reducido que `globals.css` no tiene, y `nextjs-patterns.md` documenta el `revalidate` de `serverFetch` (D5)                                                                                        |
| C6  | Sí     | Tests solo para los Críticos (RF-07, RF-14, RF-15), según la tabla de abajo. RF-07 además tiene verificación manual. Ningún test para un Estándar                                                                                                                                                                                                                                                       |
| C7  | No     | Sin cambios en el backend                                                                                                                                                                                                                                                                                                                                                                               |
| C8  | Sí     | El valor del tema en `localStorage` se valida contra las tres opciones, en el script inicial y en el store (D1). Sin formularios                                                                                                                                                                                                                                                                        |
| C9  | Sí     | Sin `any`; funciones < 50 líneas; `'use client'` solo en el selector de tema, el menú móvil, los enlaces de navegación, el sincronizador de tema y el `Toaster`                                                                                                                                                                                                                                         |
| C10 | No     | Nada se comparte con el backend; `@vm/shared-types` no cambia                                                                                                                                                                                                                                                                                                                                           |
| C11 | Sí     | Consultados el 2026-10-10:<br/>- con Context7: `next-themes`, shadcn/ui (Tailwind v4, `empty`, `sonner`), `sonner` y Next 16 (`next/font`, cookies en Server Components);<br/>- el código fuente de `next-themes` 0.4.6 y del registro de shadcn (`new-york-v4`);<br/>- las fechas de publicación en npm.<br/>Los docs que trae `next` 16.4 (`node_modules/next/dist/docs/`) se consultan en cada tarea |
| C12 | No     | Sin secretos ni variables de entorno nuevas                                                                                                                                                                                                                                                                                                                                                             |

Sin excepciones técnicas.

## Enfoque

### Dirección visual (skill `frontend-design`)

**Sujeto:** una consola de infraestructura, donde administradores y clientes miran y operan VMs.
**Referencia del pedido:** el minimalismo de Autodesk y Tesla, con la facilidad de uso de Autodesk.
**Trabajo principal de la interfaz:** que el estado de las máquinas se lea de un vistazo. El shell
tiene que desaparecer detrás del contenido.

- **Color** (paleta cerrada, sin agregar nada):
  - Superficies: blanco `#ffffff` en claro; `navy-950` `#070a1f` y `navy-900` `#11153d` en oscuro.
  - Líneas finas: `surface-300` `#d6d6d6` en claro y `navy-800` `#232a5c` en oscuro.
  - Una sola acción por pantalla: el azul `primary-500` `#003cde`.
  - El cian `secondary-500` `#00e0ff` es señal, nunca decoración: solo marca lo activo (la sección
    actual) y, más adelante, los cambios en tiempo real.
- **Tipografía:** una sola familia, **Archivo** (variable, con eje de ancho), con `next/font`.
  - **Títulos:** semi-expandidos (`wdth` 112.5), peso 600 y tracking ajustado. Es el gesto que
    recuerda al lettering ancho de Tesla.
  - **Texto:** ancho normal, pesos 400 y 500.
  - **Cifras de datos:** tabulares.
  - **Escala:** 14 · 16 · 20 · 28 · 36 px, en frase normal. Nada en mayúsculas sostenidas ni
    etiquetas sobre los títulos.
- **Layout:**

  ```text
  Escritorio (≥ 1024 px)
  ┌─────────────┬───────────────────────────────────────────────┐
  │ ◆ Gestor    │                                   [◐ Tema]    │ ← cabecera 56 px, línea inferior
  │   de VMs    ├───────────────────────────────────────────────┤
  │             │  Panel                                        │ ← h1 semi-expandido
  │ ▌▣ Panel    │  Resumen de tus máquinas virtuales            │
  │             │                                               │
  │             │            ( ícono )                          │
  │             │            Todavía no hay un resumen…         │ ← estado vacío, centrado
  └─────────────┴───────────────────────────────────────────────┘
   240 px, línea derecha · ▌ = línea vertical azul → cian de la sección activa

  Móvil (< 1024 px)
  ┌────────────────────────────────┐
  │ [≡]  ◆ Gestor de VMs     [◐]   │
  ├────────────────────────────────┤
  │ Panel                          │
  │ …                              │
  ```

  Alineación a la izquierda; solo los estados vacíos van centrados. Contenido con un ancho máximo
  de 1152 px (`max-w-6xl`), márgenes de 16 px en móvil y 32 px en escritorio, y la grilla de 8 px.

- **Principios:**
  1. **Un solo gesto memorable:** la línea de marca azul → cian, en el ícono de la marca y como
     indicador de la sección activa. Todo lo demás es silencioso.
  2. **Estructura con líneas de 1 px, no con sombras.** Solo los overlays (menú, panel móvil y
     toasts) llevan sombra.
  3. **Radios por jerarquía:** 6 px en los controles y 8 px en los paneles.
  4. **Movimiento solo como respuesta a una acción:** abrir, cerrar o confirmar. Sin entradas
     animadas por sección.

**Revisión contra el brief.** El resultado por defecto para "dashboard cloud premium" sería el kit
SaaS:

- tarjetas idénticas con sombra gris;
- un degradado de fondo;
- etiquetas en mayúsculas sobre cada título;
- una tipografía genérica (Inter o Geist).

Este plan lo evita a propósito: líneas en lugar de sombras, el degradado reducido a una línea de
2 px con significado (la sección activa) y Archivo semi-expandida como voz. Los colores los fija el
brief.

### Tema (D1)

- **Proveedor propio**, sin `next-themes`. Tiene tres piezas en `src/lib/theme/`:
  - **`theme-preference.ts`:** la clave `vm-theme`, las opciones `light`, `dark` y `system`, y el
    type guard que valida un valor leído.
  - **`theme-script.ts`:** `THEME_INIT_SCRIPT`, un string de JS plano. Se inyecta en el `<head>`
    del layout raíz (Server Component) y corre antes del primer pintado. Lee y valida la
    preferencia, resuelve Sistema con `matchMedia` y pone o quita la clase `dark` en `<html>`. Todo
    va en `try/catch`. Es un string y no un `fn.toString()`: así el test ejecuta exactamente el
    código que se envía, sin depender de lo que el compilador haga con una función.
  - **`theme-store.ts`:** el store externo para `useSyncExternalStore`. Guarda la preferencia en
    memoria si `localStorage` falla, escucha `storage` (las otras pestañas) y el `change` de
    `matchMedia` (el sistema operativo), y aplica la clase con las transiciones desactivadas un
    cuadro.
- **Componentes de `src/components/theme/`:**
  - `theme-sync.tsx`, en el layout raíz: mantiene `<html>` al día;
  - `theme-toggle.tsx`: el selector;
  - el hook `useTheme()`, que devuelve `{ preference, resolvedTheme, setPreference }`. En el
    servidor, la preferencia es `null`, para no generar diferencias de hidratación.
- **`globals.css`:**
  - los tokens oscuros pasan de `@media (prefers-color-scheme: dark)` a `.dark`;
  - se agrega `@custom-variant dark (&:where(.dark, .dark *))`, para que las variantes `dark:`
    sigan a la clase y no al sistema operativo;
  - `color-scheme` va por tema (`light` en `:root` y `dark` en `.dark`) y ya no `light dark`;
  - `<html>` lleva `suppressHydrationWarning`, porque el script le cambia la clase antes de
    hidratar.
- **Prueba hecha en el scratchpad** con Chrome headless, el 2026-10-10:
  - **`next-themes` 0.4.6:** con `vm-theme = "a b"`, la página entera cae con "This page couldn't
    load" (`InvalidCharacterError` en `classList.add`). Además, no valida el valor guardado
    (incumple un caso límite aprobado) y su última publicación es del 2025-03-11.
  - **Script propio en el `<head>`:** con el JavaScript de la app bloqueado, da el tema correcto
    en los cuatro casos probados: oscuro guardado con el sistema en claro, claro guardado con el
    sistema en oscuro, sin valor guardado y valor inválido. La consola no mostró advertencias de
    React por el `<script>` en un Server Component.

### Componentes (D2, D6, D7)

shadcn/ui se **copia del registro** (`new-york-v4`) y se adapta a mano, sin la CLI. Cada
componente se traduce:

- a los tokens del proyecto: `bg-popover` → `bg-card`, `bg-accent` → `bg-muted`, `destructive`
  → `error-*`, `bg-primary` → `bg-primary-500`;
- a los íconos de `src/components/svg/` (de Tabler, como manda `icon-conventions.md`), en lugar de
  `lucide-react`.

Organización (Atomic Design → carpetas del repo):

| Nivel      | Carpeta                                   | En este cambio                                                                                                              |
| ---------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Átomos     | `components/svg/`, `components/ui/`       | Íconos, `BrandMark`, `Button`, `Skeleton`                                                                                   |
| Moléculas  | `components/ui/`, `components/feedback/`  | `DropdownMenu`, `Sheet`, `Empty*`, `Toaster` y `notify`; `EmptyState`, `CardGridSkeleton`, `TableSkeleton`, `ChartSkeleton` |
| Organismos | `components/layout/`, `components/theme/` | `AppShell`, `AppSidebar`, `AppHeader`, `NavLinks`, `MobileNav`, `SkipLink`, `PageHeader`, `ThemeToggle`, `ThemeSync`        |
| Plantillas | `app/**/layout.tsx`                       | `app/layout.tsx` (raíz) y `app/(panel)/layout.tsx` (shell)                                                                  |
| Páginas    | `app/**/page.tsx`, `app/not-found.tsx`    | Panel y 404                                                                                                                 |

- **`components/ui/`:** queda solo para primitivos genéricos (la frontera con Radix y `sonner`).
- **`components/feedback/`:** lo listo para usar, con props tipadas, que consumen las features.
- **`src/config/navigation.ts`:** las secciones (`href` tipado con `Route` de `typedRoutes`,
  nombre e ícono), `as const satisfies readonly NavSection[]`.
- **`components/theme/theme-options.ts`:** las tres opciones del selector, en una configuración del
  mismo tipo.

**Toasts:**

- `components/ui/sonner.tsx` (`Toaster`) sigue el tema resuelto, con `closeButton`,
  `position="bottom-right"` y los íconos propios coloreados por tipo (`success-600`, `error-600` y
  `warning-600`; en oscuro, el paso 500).
- `components/ui/toast.ts` (`notify`) expone `success`, `warning`, `error` (8 s) y
  `apiError(error, fallback)`, que es `error(toUserMessage(error, fallback))`.

**Skeletons:** comparten `SkeletonRegion`, un `role="status"` con el texto solo para lectores de
pantalla y los bloques con `aria-hidden`.

**Movimiento reducido:** la regla global de `component-conventions.md` se agrega a `globals.css`.
Las animaciones duran 0,01 ms y se repiten una sola vez; `animate-spin` queda exceptuado.

### Layouts y rutas

```text
app/
  layout.tsx          raíz: <html lang="es"> + Archivo + <head> con THEME_INIT_SCRIPT,
                      ThemeSync, Toaster, metadata (plantilla "%s · Gestor de VMs")
  not-found.tsx       404 fuera del shell (EmptyState + "Ir al panel")
  (panel)/
    layout.tsx        AppShell: SkipLink, AppSidebar (≥ lg), AppHeader, <main id="contenido">
    page.tsx          Panel: PageHeader + EmptyState  (reemplaza a app/page.tsx)
```

- **Menú móvil:** usa `Sheet` (Radix Dialog), que ya da la retención del foco, `Esc`, el clic fuera
  y la devolución del foco.
- **Cierre al elegir una sección:** `onNavigate` de `next/link`.
- **Cierre al pasar a 1024 px o más:** un `useMediaQuery` en `src/hooks/`.
- **Frontend de `auth`:** agregará su grupo `(auth)` con el login, sin tocar el shell.

### Cliente HTTP (D5)

- **`fetch-wrapper.ts`:** sin cambios. Ya cumple RF-14 (`credentials: 'include'`, `/api/*`
  tipado, `ApiError`); sus tests reciben el ID.
- **`server-fetch.ts`:** reenvía `(await cookies()).toString()` de `next/headers` como cabecera
  `cookie`, si hay alguna. Usa `cache: 'no-store'` siempre y pierde el parámetro `revalidate`,
  porque toda respuesta de la API depende de la sesión (RF-auth-06). Hoy no tiene llamadores.

## Cambios por paquete

| Paquete            | Cambio                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vm/shared-types` | Ninguno                                                                                                                                                                                                                                                                                                                                                                                                           |
| `@vm/backend`      | Ninguno                                                                                                                                                                                                                                                                                                                                                                                                           |
| `@vm/frontend`     | Dependencias: `radix-ui` 1.6.7, `class-variance-authority` 0.7.1, `sonner` 2.0.8; dev: `tw-animate-css` 1.4.0 (D3). `globals.css`, `theme.css`, `layout.tsx`, `not-found.tsx`, `(panel)/`; `src/lib/theme/`; `src/components/{svg,ui,feedback,layout,theme}/`; `src/config/navigation.ts`; `src/hooks/use-media-query.ts`; `server-fetch.ts` y sus tests; se borra `src/app/page.tsx` (pasa a `(panel)/page.tsx`) |
| Docs               | `apps/frontend/CLAUDE.md`; reglas del frontend (`component-conventions.md`, `component-imports.md`, `nextjs-patterns.md`); `docs/product.md` (decisión "Toggle de tema" resuelta); `CLAUDE.md` raíz y `README.md` (estado, estructura del frontend, decisiones); `docs/specs/README.md`                                                                                                                           |

**Instalación:** edito `apps/frontend/package.json` y verifico en el scratchpad. Tú corres
`pnpm install` desde Windows, que actualiza `pnpm-lock.yaml`. Hasta entonces, el `typecheck` de tu
carpeta no encuentra los paquetes nuevos.

## Compatibilidad entre apps (`docs/sdd/README.md`)

No cambia ningún contrato: el frontend llama a los mismos endpoints con la misma forma, la API no
cambia y `@vm/shared-types` tampoco. El reenvío de cookies desde el servidor es lo mismo que el
navegador ya hace por el rewrite.

## Seguridad y permisos (C8)

- **Cookie de sesión:**
  - El navegador nunca la lee: es `HttpOnly` y el código no la toca (RF-14).
  - El servidor de Next la reenvía solo a `NEXT_PUBLIC_API_URL`, la única URL que arma
    `serverFetchResult`.
  - Con `cache: 'no-store'`, ninguna respuesta queda en la Data Cache de Next, que podría servirla a
    otra sesión (RF-15).
- **Script inline del tema:**
  - No interpola nada que venga del usuario: solo constantes del código (la clave y las opciones,
    con `JSON.stringify`).
  - El valor leído se valida contra las tres opciones antes de usarse.
  - Si algún día se agrega una CSP al frontend, este script va a necesitar un nonce o su hash
    (Riesgos).
- **Panel sin sesión** (aceptado en G1): hoy no muestra datos, y la API responde `401` sin sesión.

## Pruebas por requisito (`docs/testing.md`)

| RF              | Criticidad     | Test (nivel)                                           | Qué verifica                                                                                                                                                                                                                                                                                                                                                        | Archivo                              |
| --------------- | -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| RF-app-shell-07 | Crítico K5     | Vitest de lógica (jsdom), un `it.each` de 5 casos      | Ejecuta `THEME_INIT_SCRIPT` y comprueba la clase `dark` de `<html>` en cinco casos, sin lanzar:<br/>- oscuro guardado con el sistema en claro → oscuro;<br/>- claro guardado con el sistema en oscuro → claro;<br/>- sin valor guardado y el sistema en oscuro → oscuro;<br/>- valor inválido → sigue al sistema;<br/>- `localStorage` que lanza → sigue al sistema | `src/lib/theme/theme-script.test.ts` |
| RF-app-shell-07 | Crítico K5     | Manual (spec, "Verificación manual")                   | Primer cuadro con el tema correcto en el build de producción, con el JS lento, en Chrome; sin advertencias de hidratación                                                                                                                                                                                                                                           | —                                    |
| RF-app-shell-14 | Crítico K1, K3 | Vitest de lógica: los 5 tests existentes reciben el ID | Sin cambiar las aserciones: `credentials: 'include'`, el body JSON, que desenvuelve `data`, `ApiError` con `status` y `code`, el error sin sobre y el `204`                                                                                                                                                                                                         | `src/lib/api/fetch-wrapper.test.ts`  |
| RF-app-shell-15 | Crítico K1, K3 | Vitest de lógica (mock de `next/headers` en el borde)  | `serverFetchResult` llama a `${NEXT_PUBLIC_API_URL}/api/…` con `cache: 'no-store'` y la cabecera `cookie` igual a las cookies del pedido entrante, y desenvuelve `data`                                                                                                                                                                                             | `src/lib/api/server-fetch.test.ts`   |

`palette.test.ts` (RNF-app-shell-01) no cambia: ya recorre todo `src`, también los archivos
nuevos. Los RF Estándar se comprueban en G4, con una línea cada uno en el informe y capturas de
claro, oscuro, escritorio y móvil.

### Tests que se retiran o reescriben

| Test (archivo › nombre)                                                                                 | Señal                                                                                                                                         | Qué lo reemplaza                                                                                             |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `server-fetch.test.ts` › `serverFetchResult` › "desenvuelve data y arma la URL con la base del backend" | Cambio de comportamiento aprobado en G1 (RF-15): espera `{ next: { revalidate: 0 } }` y deja de ser cierto al reenviar cookies con `no-store` | El test de RF-15 de la tabla, con las mismas comprobaciones de URL y de `data`, más las cookies y `no-store` |

Los demás tests de `server-fetch.test.ts` no cambian sus aserciones. Solo se agrega al archivo el
mock de `next/headers`, porque `serverFetchResult` ahora lee las cookies.

## Revisión de arquitectura

| Hallazgo                                                                                                 | Evidencia (archivo:línea o doc oficial)                                                                                                                | Cambio                                                        |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| El dark mode sigue solo al sistema operativo                                                             | `apps/frontend/src/app/globals.css:20` (`@media (prefers-color-scheme: dark)`)                                                                         | Clase `.dark` y `@custom-variant dark` (D1)                   |
| `next-themes` no valida el valor guardado y un valor con espacios tira la página                         | `next-themes@0.4.6/dist/index.mjs` (`classList.add(v)` sin validar); prueba en Chrome headless, "This page couldn't load"                              | Proveedor propio (D1)                                         |
| `shadcn add` instala `lucide-react` y escribe tokens `oklch` en `globals.css`                            | Registro `new-york-v4` (`dropdown-menu.json`, `sheet.json` importan `lucide-react`); `icon-conventions.md` prohíbe librerías de íconos; paleta cerrada | Copia adaptada a mano; se corrige `component-imports.md` (D2) |
| La regla de movimiento reducido que describen las reglas no existe                                       | `component-conventions.md`, "Animaciones"; `globals.css` no la tiene                                                                                   | Se agrega a `globals.css`                                     |
| `serverFetch` no reenvía la cookie de sesión, y su `revalidate` permitiría cachear respuestas con sesión | `apps/frontend/src/lib/api/server-fetch.ts:21-24`                                                                                                      | Cookies + `no-store`, sin `revalidate` (D5)                   |
| La cabecera actual vive en el layout raíz y la portada es provisional                                    | `apps/frontend/src/app/layout.tsx:19-27`, `apps/frontend/src/app/page.tsx`                                                                             | Shell en `(panel)/layout.tsx`; Panel en `(panel)/page.tsx`    |
| Next resuelve `@/` y `typedRoutes` obliga a enlazar rutas existentes                                     | `apps/frontend/next.config.ts:7`                                                                                                                       | La navegación lista solo `/`; `href` tipado con `Route`       |

## Riesgos y decisiones (incluidas las que trascienden el cambio)

- **D1. Tema propio en vez de `next-themes`.**
  - Motivos: la caída comprobada con un valor inválido, la falta de validación (C8) y que no se
    publica desde marzo de 2025.
  - Costo: unas 100 líneas propias, y el script inicial lleva un test con el ID de RF-07.
- **D2. shadcn copiado a mano, sin la CLI.** Un `npx shadcn add` futuro traería `lucide-react` y
  tokens que no existen. La regla pasa a decir: copiar del registro, traducir los tokens e íconos, y
  no correr la CLI.
- **D3. Versiones.** Se fijan exactas y con al menos dos semanas publicadas:
  - `radix-ui` 1.6.7 (del 2026-07-24), y no 1.7.0, publicado el 2026-10-05;
  - `sonner` 2.0.8 (2026-08-09);
  - `tw-animate-css` 1.4.0 (2025-09-24);
  - `class-variance-authority` 0.7.1 (2024-11-26).
- **D4. Archivo con `next/font/google`:** se descarga al compilar y se sirve desde el mismo origen;
  el navegador no le pide nada a Google. Riesgo: `pnpm build` necesita red. Si Archivo no
  convence en la ⏸ de T5, cambiar de familia toca una línea.
- **D5. `serverFetch` sin `revalidate`:**
  - Toda respuesta de la API depende de la sesión, así que cachear nunca es correcto.
  - Si algún día existe un endpoint público y cacheable, se agrega una función aparte, sin
    cookies.
  - Riesgo aceptado en G1: un `Set-Cookie` de renovación pedido desde el servidor no llega al
    navegador. Lo resuelve el frontend de `auth` con `proxy.ts`.
- **D6. Atomic Design** se mapea a las carpetas del repo (tabla de "Componentes"), en vez de
  carpetas `atoms/molecules/organisms`. Motivos: las reglas y el alias `ui` de shadcn fijan
  `components/ui/`, y el nivel de un componente se lee mejor por su responsabilidad. El mapeo
  queda en `component-conventions.md`.
- **D7. Sin tokens nuevos:** `popover` → `card`, `accent` → `muted`, `destructive` → `error-*`. La
  paleta y `palette.test.ts` no cambian.
- **CSP futura:** el script inline del tema va a necesitar un nonce o un hash.
- **`suppressHydrationWarning` en `<html>`:** silencia solo las diferencias de atributos de ese
  elemento (un nivel), no de sus hijos.
- **Fuera de alcance (nota):** `next dev` 16.4 crea `apps/frontend/AGENTS.md`, con un bloque que
  apunta a los docs de `node_modules/next/dist/docs/`. No modifica `CLAUDE.md`. Si prefieres que no
  aparezca, se apaga con `agentRules: false` en `next.config.ts`; sería un cambio S aparte.
- **Verificación visual:** las capturas y las verificaciones las hago desde WSL con
  `puppeteer-core` contra el Chrome de Windows en modo headless, con un perfil temporal y sin tocar
  tu perfil. Funciona porque WSL comparte `localhost` con Windows (`networkingMode=mirrored`).

## Desvíos durante la implementación

| Desvío                                                                                                                                                                           | Motivo                                                                                                                                                                                                                                                                      | Dónde                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| La marca no es un SVG propio (`components/svg/brand-mark.tsx`): es un recuadro con el degradado de Tailwind (`from-primary-500 to-secondary-500`) y el ícono `stack-2` de Tabler | Un `<linearGradient>` dentro del SVG necesita un `id`, que se repite entre la barra lateral y la cabecera; el navegador resuelve el primero, y en móvil ese está dentro de la barra oculta (`display: none`), así que el degradado no se pinta                              | `components/layout/brand.tsx`, `components/svg/stack-2.tsx`      |
| Sin `src/hooks/use-media-query.ts`: `MobileNav` escucha `matchMedia` en un efecto y cierra el menú desde el callback del evento                                                  | Un solo uso; leer el media query con un hook y cerrar en un efecto pondría `setState` sincrónico en el efecto (`react-hooks`)                                                                                                                                               | `components/layout/mobile-nav.tsx`                               |
| Los skeletons usan `bg-border/70` y `dark:bg-navy-700/70`, no `bg-muted`                                                                                                         | En las capturas de T4: `muted` (`surface-100`) casi no se ve sobre una tarjeta blanca, y en oscuro se confunde con el encabezado de la tabla (`muted` = `border` = `navy-800`). Sin colores nuevos; queda como excepción documentada                                        | `components/ui/skeleton.tsx`, `component-conventions.md`         |
| `serverFetch` reenvía la cabecera `cookie` cruda (`headers().get('cookie')`) en vez de `cookies().toString()`                                                                    | `RequestCookies.toString()` vuelve a codificar cada valor con `encodeURIComponent`; la cabecera cruda es exactamente lo que el navegador mandaría por el rewrite (RF-15). `headers()` se lee fuera del `try/catch` para no atrapar la señal de renderizado dinámico de Next | `lib/api/server-fetch.ts`                                        |
| `EmptyTitle` y `EmptyState` aceptan `h1` además de `h2` y `h3`                                                                                                                   | La 404 es una página entera cuyo único título es el del estado vacío                                                                                                                                                                                                        | `components/ui/empty.tsx`, `components/feedback/empty-state.tsx` |
| Los ítems del menú desplegable usan el contorno de foco global, metido hacia adentro (`focus-visible:-outline-offset-2`), en vez de `outline-hidden`                             | Hallazgo de la revisión local (`frontend-reviewer`): con `outline-hidden`, el ítem enfocado solo se distinguía por `bg-muted` (≈ 1.1:1 en claro, 1.3:1 en oscuro), lo que incumplía RF-app-shell-13. Verificado en Chrome con teclado en los dos temas                      | `components/ui/dropdown-menu.tsx`                                |
