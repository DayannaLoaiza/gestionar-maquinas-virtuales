# Tareas — backend de autenticación

| Campo                | Valor                                             |
| -------------------- | ------------------------------------------------- |
| Estado               | cerrada                                           |
| Aprobada por / fecha | Dayanna — 2026-10-10 (puerta G2)                  |
| Cerrada              | 2026-10-10, commit `2780fa8` (puerta G4, Dayanna) |

Plan: `plan.md` (esta carpeta). Spec: `docs/specs/auth/spec.md`. ⏸ = me detengo y muestro el diff
(G3).

- [x] T1. Dependencias y entorno de desarrollo · raíz, `@vm/backend`, `@vm/shared-types` ·
      (RNF-auth-01; infraestructura: sin dependencias no hay ninguna otra tarea) ⏸
      Versiones exactas del plan en los `package.json`, `argon2` en `onlyBuiltDependencies`,
      `docker-compose.yml` (PostgreSQL 16), `.env.example` con las variables nuevas. Detención: la
      usuaria corre `pnpm install` desde Windows y me pasa el acceso a una base de test.
      Hecho cuando: `pnpm install` termina sin errores en Windows y en la copia del scratchpad, y
      `docker compose config` valida.
- [x] T2. Contratos compartidos · `@vm/shared-types` · (RF-auth-01, RF-auth-03, RF-auth-07,
      RF-auth-09)
      `ROLES`/`Role`, `AuthUser`, `LoginDTO`, exportados en `index.ts`.
      Hecho cuando: `pnpm --filter @vm/shared-types build` y `typecheck` en verde.
- [x] T3. Configuración validada · `@vm/backend` · (RF-auth-14)
      `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECURE`, `TRUST_PROXY` en `env.validation.ts`. Se
      reescriben los 4 tests existentes (tabla del plan) y se agregan los de RF-auth-14.
      Hecho cuando: `test -- src/config/env.validation.spec.ts` en verde, con `-t "RF-auth-14"` en
      verde.
- [x] T4. Persistencia y harness de e2e · `@vm/backend` · (RNF-auth-01, RNF-auth-02, RNF-auth-03,
      RF-auth-13) ⏸
      TypeORM en `AppModule`, `data-source.ts`, entidades `User` y `Session`, migración inicial,
      scripts `db:migrate` y `db:migration:generate`, `test/support/` (env de test, migraciones,
      limpieza), `app.e2e-spec.ts` adaptado.
      Hecho cuando: `db:migrate` crea las tablas en la base de desarrollo, y `test:e2e` (los 2 tests
      existentes) está en verde contra la base de test.
- [x] T5. Hash de contraseñas y módulo `users` · `@vm/backend` · (RF-auth-12, RF-auth-13)
      `password-hasher.ts` (Argon2id), `UserRepository`, `UsersService` (`findByEmail`,
      `findActiveById`, `ensureUser`, `toAuthUser`), `UsersModule`.
      Hecho cuando: `-t "RF-auth-12"` en verde y el slice `-t "RF-auth-13"` de
      `test/users.e2e-spec.ts` en verde.
- [x] T6. Sesiones y `AuthService` · `@vm/backend` · (RF-auth-02, RF-auth-05, RF-auth-08)
      `session-expiry.ts` (puro), `SessionRepository`, `AuthService` (`login` con hash señuelo,
      `authenticate` con renovación, `logout`), excepciones de `shared/exceptions/`, log de
      seguridad (RNF-auth-06).
      Hecho cuando: el unitario `-t "RF-auth-05"` de `session-expiry.spec.ts` está en verde.
- [x] T7. Guards y decoradores globales · `@vm/backend` · (RF-auth-06, RF-auth-07, RF-auth-11)
      `OriginGuard`, `JwtAuthGuard` (solo cookie, HS256, `iss`/`aud`), `RolesGuard`, `@Public`,
      `@Roles`, `@CurrentUser`, registrados por `APP_GUARD`; `health` con `@Public()`.
      Hecho cuando: los e2e `-t "RF-auth-06"`, `-t "RF-auth-07"` (`roles.e2e-spec.ts`) y
      `-t "RF-auth-11"` están en verde.
- [x] T8. `AuthController` y limitación de tasa · `@vm/backend` · (RF-auth-01, RF-auth-03,
      RF-auth-04, RF-auth-08, RF-auth-09, RF-auth-13)
      `session-cookie.ts` (`__Host-` según `COOKIE_SECURE`), login, logout, me, `ThrottlerModule`
      con los throttlers `ip` y `email`, `LoginThrottlerGuard`, `trust proxy` desde `TRUST_PROXY`.
      Hecho cuando: los e2e `-t "RF-auth-01"`, `"RF-auth-02"`, `"RF-auth-03"`, `"RF-auth-04"`,
      `"RF-auth-05"`, `"RF-auth-08"`, `"RF-auth-09"` y `"RF-auth-13"` están en verde.
- [x] T9. Cabeceras de seguridad · `@vm/backend` · (RF-auth-10)
      `helmet` y `cookie-parser` como middleware de `AppModule`, HSTS solo en producción.
      Hecho cuando: `-t "RF-auth-10"` (`security-headers.e2e-spec.ts`) está en verde.
- [x] T10. Seed de usuarios de prueba · `@vm/backend` · (RF-auth-15)
      `src/database/seed.ts`, script `db:seed`, schema Zod de `SEED_*`.
      Hecho cuando: `db:seed` corrido dos veces deja exactamente un Administrador y un Cliente
      (comprobación de G4, sin test).
- [x] T11. Documentación · raíz, `docs/`, `.claude/` · (RNF-auth-08; RF-auth-01 verificación
      manual)
      README (puesta en marcha con base, migraciones y seed; credenciales; guía de Postman;
      contrato de la API), `apps/backend/CLAUDE.md`, `nestjs-patterns.md` (persistencia; guards
      globales), `.claude/rules/shared-types.md`, `docs/product.md` (decisiones resueltas),
      `security-auditor.md`, `docs/specs/README.md`.
      Hecho cuando: los pasos del README, seguidos desde cero en la copia del scratchpad, dejan el
      login funcionando con `curl` y la cookie.
- [x] T13. Correcciones de la revisión local · `@vm/backend`, docs · (RF-auth-04, RF-auth-05,
      RF-auth-10, RF-auth-15, RF-auth-16; aprobadas por Dayanna el 2026-10-10)
      `configureHttpApp` (helmet, cookie-parser, `trust proxy`, parser solo JSON) en `main.ts` y el
      harness; excepciones `INVALID_BODY` / `PAYLOAD_TOO_LARGE`; seed bloqueado en producción; log de
      403 con IP; requisito de despliegue de `TRUST_PROXY` en README y `.env.example`; tests agregados
      de la tabla del plan.
      Hecho cuando: `-t "RF-auth-04"`, `"RF-auth-05"`, `"RF-auth-10"` y `"RF-auth-16"` en verde, y
      `db:seed` con `NODE_ENV=production` termina con error sin crear usuarios.
- [x] T12. Validación completa · todo el monorepo · (todos los RF)
      En la copia del scratchpad: `pnpm lint`, `pnpm typecheck`, `pnpm build` (con
      `check-dist-aliases`), `pnpm test`, `test:e2e`, `pnpm audit --prod`, y `grep` de `TODO`,
      `.only` y `.skip`. Revisión local con `security-auditor` y `api-reviewer` en contexto nuevo.
      Hecho cuando: todo en verde, los hallazgos de la revisión resueltos o aceptados, y la puerta G4
      presentada.
