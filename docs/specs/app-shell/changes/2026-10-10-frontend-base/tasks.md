# Tareas — base del frontend

| Campo                | Valor                                               |
| -------------------- | --------------------------------------------------- |
| Estado               | cerrada                                             |
| Aprobada por / fecha | Dayanna — 2026-10-10 (puerta G2)                    |
| Cerrada              | 2026-10-10 (puerta G4, Dayanna); lo sella su commit |

Plan: `plan.md` (esta carpeta). Spec: `docs/specs/app-shell/spec.md`. ⏸ = me detengo y muestro el
diff (G3). Los IDs abreviados (`RF-05`) son `RF-app-shell-05`. Todo se verifica primero en la copia
del scratchpad. Vitest y el build corren ahí; las capturas, con el Chrome de Windows en modo
headless.

- [x] T1. Dependencias y base de estilos · `@vm/frontend` · (infraestructura de RF-01…13;
      RNF-01, RNF-06) ⏸
  - En `apps/frontend/package.json`, versiones exactas: `radix-ui` 1.6.7,
    `class-variance-authority` 0.7.1 y `sonner` 2.0.8 en `dependencies`; `tw-animate-css` 1.4.0 en
    `devDependencies`.
  - En `globals.css`:
    - `@import 'tw-animate-css'` y `@custom-variant dark (&:where(.dark, .dark *))`;
    - los tokens oscuros bajo `.dark`, y `color-scheme` por tema;
    - la regla global de movimiento reducido y `cursor: pointer` en los botones.
  - `theme.css`: `--font-sans` con Archivo (`next/font/google`, eje `wdth`), aplicada en `<html>`.
  - Detención: tú corres `pnpm install` desde Windows.

  Hecho cuando: confirmas el `pnpm install` sin errores, y en el scratchpad `typecheck`, `lint`,
  `build` y `palette.test.ts` están en verde.

- [x] T2. Tema · `@vm/frontend` · (RF-05, RF-06, RF-07)
  - `src/lib/theme/`: `theme-preference.ts`, `theme-script.ts` (`THEME_INIT_SCRIPT`) y
    `theme-store.ts`.
  - `src/components/theme/`: `theme-sync.tsx` y el hook `useTheme`.
  - En el layout raíz: el `<head>` con el script, `suppressHydrationWarning` en `<html>` y
    `ThemeSync`.
  - Test `theme-script.test.ts`.

  Hecho cuando:
  - `pnpm --filter @vm/frontend test -t "RF-app-shell-07"` está en verde;
  - en Chrome headless, la clase de `<html>` cambia al llamar a `setPreference`, se sincroniza
    entre dos pestañas y sigue a la emulación de `prefers-color-scheme` cuando la opción es Sistema.

- [x] T3. Primitivos e íconos · `@vm/frontend` · (RNF-02; base de RF-02…05, RF-08…10)
  - En `src/components/ui/`, copiados del registro `new-york-v4` y adaptados a los tokens y a los
    íconos propios: `button.tsx` (con CVA), `dropdown-menu.tsx`, `sheet.tsx`, `skeleton.tsx` y
    `empty.tsx`.
  - En `src/components/svg/`, los íconos de Tabler necesarios y `brand-mark.tsx`.

  Hecho cuando: `typecheck`, `lint` y `palette.test.ts` están en verde.

- [x] T4. Feedback · `@vm/frontend` · (RF-08, RF-09, RF-10)
  - `src/components/ui/sonner.tsx` (`Toaster`, en el layout raíz) y `src/components/ui/toast.ts`
    (`notify.success`, `warning`, `error` y `apiError`).
  - En `src/components/feedback/`: `skeleton-region.tsx`, `card-grid-skeleton.tsx`,
    `table-skeleton.tsx`, `chart-skeleton.tsx` y `empty-state.tsx`.

  Hecho cuando: en una página temporal **solo del scratchpad** (nunca se copia al repo), las
  capturas en claro y en oscuro muestran los tres skeletons, los tres tipos de toast y el estado
  vacío. Además: el toast de error dura 8 s y los demás 4 s, el árbol de accesibilidad tiene un
  `status` por skeleton, y con la emulación de movimiento reducido el pulso se detiene.

- [x] T5. Shell, Panel y 404 · `@vm/frontend` · (RF-01, RF-02, RF-03, RF-04, RF-05, RF-11, RF-12,
      RF-13) ⏸
  - `src/config/navigation.ts` y `src/hooks/use-media-query.ts`.
  - En `src/components/layout/`: `app-shell.tsx`, `app-sidebar.tsx`, `app-header.tsx`,
    `nav-links.tsx`, `mobile-nav.tsx`, `skip-link.tsx`, `page-header.tsx` y `brand.tsx`.
  - `src/components/theme/theme-toggle.tsx` y `theme-options.ts`.
  - `src/app/(panel)/layout.tsx` y `(panel)/page.tsx`; se borra `src/app/page.tsx`.
  - `src/app/not-found.tsx`.
  - Detención: te muestro las capturas para revisar el diseño.

  Hecho cuando hay capturas a 1440 px y a 375 px, en claro y en oscuro, del Panel, del menú móvil
  abierto y de la 404 (status `404`), y en Chrome headless:
  - el `Tab` inicial enfoca "Saltar al contenido";
  - el menú móvil retiene el foco y se cierra con `Esc` y al navegar;
  - el selector se opera con teclado;
  - no hay desplazamiento horizontal a 320 px.

- [x] T6. Cliente HTTP · `@vm/frontend` · (RF-14, RF-15)
  - `server-fetch.ts`: reenvía las cookies con `cookies()` de `next/headers` y usa
    `cache: 'no-store'`, sin `revalidate`.
  - Tests: el `describe` de `fetch-wrapper.test.ts` recibe el ID `RF-app-shell-14`, sin tocar las
    aserciones. En `server-fetch.test.ts` se reescribe el test de la URL como el test de RF-15
    (tabla de retiros del plan) y se agrega el mock de `next/headers`.

  Hecho cuando `pnpm --filter @vm/frontend test -t "RF-app-shell-14"` y `-t "RF-app-shell-15"`
  están en verde, y el resto de `server-fetch.test.ts` también, sin cambios en sus aserciones.

- [x] T7. Documentación · docs · (RNF-02, RNF-03; C5 del plan)
  - `apps/frontend/CLAUDE.md`: estructura, tema y componentes disponibles.
  - Reglas del frontend:
    - `component-conventions.md`: el mapeo de Atomic Design, el tema por clase y el movimiento
      reducido existente;
    - `component-imports.md`: shadcn copiado a mano, `notify.warning` y la lista de primitivos y
      de componentes de feedback;
    - `nextjs-patterns.md`: `serverFetch` con cookies y `no-store`, y el grupo `(panel)`.
  - `docs/product.md`: la decisión "Toggle de tema" resuelta.
  - `CLAUDE.md` raíz y `README.md`: estado, estructura del frontend, decisiones y el diagrama sin
    cambios.
  - `docs/specs/README.md`.

  Hecho cuando: `pnpm format:check` está en verde y ninguna regla describe algo que el código no
  hace.

- [x] T8. Validación y revisión local · todos · (RF-01…15, RNF-01…06)
  - En el scratchpad: `pnpm typecheck`, `lint`, `test` y `build` de todo el monorepo.
  - `next dev` arranca sin errores.
  - La verificación manual de RF-07, ejecutada en Chrome headless con el build de producción y el
    JavaScript de la app demorado.
  - Una línea por cada RF Estándar.
  - La revisión del diff con `code-reviewer`, `frontend-reviewer` y `security-auditor`.

  Hecho cuando el informe de G4 está completo, con los hallazgos resueltos o aceptados.
