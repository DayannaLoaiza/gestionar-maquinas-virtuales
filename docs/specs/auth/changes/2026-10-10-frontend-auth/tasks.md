# Tareas — Frontend de `auth` (`2026-10-10-frontend-auth`)

| Campo                | Valor                                         |
| -------------------- | --------------------------------------------- |
| Estado               | cerrada                                       |
| Aprobada por / fecha | Dayanna — 2026-10-11 (puerta G2)              |
| Cerrada              | 2026-10-11 (puerta G4, Dayanna); PR pendiente |

Plan: `plan.md` (D1–D11). G3 propuesto: ⏸ tras T8.

- [x] T1. Dependencias y primitivos · `@vm/frontend` · (RNF-auth-09, RNF-auth-11, RNF-auth-12;
      infraestructura de T3–T8)
      `zustand` 5.0.15, `react-hook-form` 7.89.0 y `@hookform/resolvers` 5.9.1 en `package.json`;
      `src/types/api.ts` (`AuthUserResponse`); `components/ui/input.tsx` y `label.tsx` copiados del
      registro `new-york-v4` y traducidos a los tokens; íconos `loader-2`, `logout`, `user-circle` e
      `info-circle`.
      Hecho cuando: en el scratchpad, `pnpm install`, `pnpm audit` (sin altas ni críticas en las
      dependencias nuevas), `typecheck` y `lint` del frontend pasan, y `palette.test.ts` sigue en
      verde.
- [x] T2. Cabeceras de seguridad · `@vm/frontend` · (RF-auth-34)
      `src/config/security-headers.ts` y `next.config.ts` (`poweredByHeader: false`, `headers()`
      solo para las páginas).
      Hecho cuando: test `RF-auth-34` en verde, y `curl -I` de `/login`, `/` y una ruta inexistente
      muestra las cabeceras sin `X-Powered-By`.
- [x] T3. Capa de datos de la sesión · `@vm/frontend` · (RF-auth-24, RF-auth-25, RF-auth-31)
      `src/lib/auth/auth-user.ts` (`isAuthUser`, `isAdmin`), `src/lib/auth/session.ts`
      (`getCurrentUser`, `requireUser`, `requireAdmin`) y `src/app/error.tsx` ("Reintentar" con
      `retry()`).
      Hecho cuando: tests `RF-auth-24`, `RF-auth-25` y `RF-auth-31` de `session.test.ts` en verde.
- [x] T4. `proxy.ts`: renovación y rebote de `/login` · `@vm/frontend` · (RF-auth-27, RF-auth-21)
      `src/proxy.ts` con su `matcher` (sin `api`, estáticos ni prefetch) y
      `src/lib/auth/proxy-session.ts`.
      Hecho cuando: test `RF-auth-27` de `proxy.test.ts` en verde; con la API real, `/login` con
      sesión válida redirige a `/`.
- [x] T5. `401` en el cliente · `@vm/frontend` · (RF-auth-26)
      `src/lib/auth/session-navigation.ts` (`goToLogin`, `handleSessionExpired`), `RequestOptions`
      en `fetch-wrapper.ts`, `src/config/auth.ts` (`LOGIN_NOTICES`) y `notify.apiError` sin los
      `UNAUTHENTICATED`.
      Hecho cuando: tests `RF-auth-26` en verde, y los cinco de `RF-app-shell-14` siguen en verde
      sin cambios.
- [x] T6. Store, proveedor y pestañas · `@vm/frontend` · (RF-auth-22, RF-auth-23, RF-auth-29,
      RF-auth-33)
      `src/lib/auth/auth-store.ts`, `src/lib/auth/session-channel.ts`,
      `src/components/auth/auth-provider.tsx`, `use-auth-store.ts` y `session-sync.tsx` (montado en
      `app/layout.tsx`).
      Hecho cuando: tests `RF-auth-22`, `RF-auth-23`, `RF-auth-29` y `RF-auth-33` en verde.
- [x] T7. Panel protegido, roles y menú de la persona · `@vm/frontend` · (RF-auth-25, RF-auth-28,
      RF-auth-30)
      `(panel)/layout.tsx` (`requireUser()` + `AuthProvider`), `requireUser()` en
      `(panel)/page.tsx`, guarda `src/app/(panel)/session-guard.test.ts`,
      `src/components/auth/admin-only.tsx` y `features/auth/components/user-menu.tsx` en
      `AppHeader`.
      Hecho cuando: tests `RF-auth-25` (guarda) y `RF-auth-30` en verde; con la API real, el menú
      muestra el correo y el rol de cada usuario de `db:seed` (Estándar, RF-auth-28).
- [x] T8. Página de login · `@vm/frontend` · (RF-auth-17, RF-auth-18, RF-auth-19, RF-auth-20,
      RF-auth-21, RF-auth-32) ⏸
      `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`,
      `features/auth/components/login-form.tsx`, `login-notice.tsx` y `login-session-check.tsx`.
      Hecho cuando: tests `RF-auth-19` y `RF-auth-32` en verde; con la API real, login de cada
      usuario de `db:seed`, los tres toasts de RF-auth-20 (incluido el `429`), los dos avisos, la
      entrada desde otro sitio (RF-auth-21) y capturas en claro, oscuro, escritorio y 320 px
      (Estándar: RF-auth-17, 18, 20, 21).
- [x] T9. Documentación · Docs · (C5; RNF-auth-12)
      Reglas del frontend: `nextjs-patterns.md` (`proxy.ts`, capa de datos en cada página, `401`,
      sin refresh token), `forms-conventions.md` (pantallas de auth y la excepción de
      `window.location`), `component-imports.md` (`Input`, `Label`, `AdminOnly`),
      `component-conventions.md` (`components/auth/`, `features/auth/`). `apps/frontend/CLAUDE.md`,
      `CLAUDE.md` raíz y `README.md` (login, flujo de sesión, estructura). `docs/specs/README.md` y
      el campo `Código` de la spec `auth`.
      Hecho cuando: ningún documento contradice el código (refresh token, "`proxy.ts` no existe",
      "todavía no hay features"), y `pnpm format:check` pasa.
- [x] T10. Validación · `@vm/frontend` · (todos los RF del delta; RNF-auth-10, RNF-auth-13)
      Suite completa (Vitest con el Node de Windows, Jest del backend sin cambios), `typecheck`,
      `lint` y `build` en el scratchpad; las verificaciones manuales de la spec (RF-auth-19/22, 21,
      25, 26/29, 27, 34); revisión local con `code-reviewer`, `frontend-reviewer` y
      `security-auditor`.
      Hecho cuando: todo en verde, verificaciones manuales hechas y hallazgos de la revisión
      resueltos o aceptados; se presenta G4.
