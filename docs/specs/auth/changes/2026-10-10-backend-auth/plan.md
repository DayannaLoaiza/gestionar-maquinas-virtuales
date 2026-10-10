# Plan — backend de autenticación (auth)

Spec: `docs/specs/auth/spec.md` · Añade: módulos `users` y `auth`, `src/database/`, persistencia
PostgreSQL, guards globales · Modifica: `app.module.ts`, `env.validation.ts`,
`health.controller.ts`, `@vm/shared-types` · Retira: nada · Constitución: v1.0.0

## Chequeo de constitución (puerta: antes de diseñar; se revisa en G2)

| ID  | Aplica | Cómo se cumple                                                                                                                                                                                                                                                                |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Cada tarea cita sus RF; nada fuera de la spec aprobada (G1 + delta de RF-auth-04)                                                                                                                                                                                             |
| C2  | Sí     | La spec y el delta de RF-auth-04 se escribieron antes del código                                                                                                                                                                                                              |
| C3  | Sí     | No se edita `apps/` ni `packages/` hasta el "apruebo" de G2                                                                                                                                                                                                                   |
| C4  | Sí     | Sin dudas abiertas. El cambio de RF-auth-04 se presenta en G1 junto con G2                                                                                                                                                                                                    |
| C5  | Sí     | Las diferencias entre las reglas y el diseño se reportan en "Revisión de arquitectura" (guards globales, helmet en `AppModule`)                                                                                                                                               |
| C6  | Sí     | Un test por RF Crítico con su ID (tabla "Pruebas por requisito"); RF-auth-15 (Estándar) sin test; los tests anteriores que se ajustan están en su tabla                                                                                                                       |
| C7  | Sí     | `users`: entity → `UserRepository` → `UsersService`. `auth`: `SessionRepository` → `AuthService` → `AuthController`. Guards y seed usan services, nunca repositorios. La lógica de expiración, en un archivo puro                                                             |
| C8  | Sí     | `LoginDTO` con `ZodValidationPipe`; Argon2id (`argon2`, parámetros sobre el mínimo de OWASP); JWT HS256 con algoritmo fijo, `iss` y `aud`; `helmet`; throttler; verificación de Origin; SQL solo por TypeORM con parámetros                                                   |
| C9  | Sí     | Sin `any` (el `req` de Express tipado; el payload del JWT validado con un schema Zod antes de usarlo); funciones < 50 líneas; early returns                                                                                                                                   |
| C10 | Sí     | `ROLES`, `Role`, `AuthUser`, `LoginDTO` en `@vm/shared-types`                                                                                                                                                                                                                 |
| C11 | Sí     | Consultado con Context7 el 2026-10-10: OWASP Cheat Sheets y Top 10:2025, `@nestjs/throttler`, `node-argon2`, TypeORM 1.1.1, `@nestjs/typeorm`, docs de Nest (helmet, cookies, trust proxy), Next.js (rewrites). La implementación vuelve a consultar cada API antes de usarla |
| C12 | Sí     | `JWT_SECRET`, `DATABASE_URL`, `TEST_DATABASE_URL`, `SEED_*` solo en `.env` (ignorado); `.env.example` con valores de desarrollo y un secreto de ejemplo que avisa que hay que cambiarlo                                                                                       |

Sin excepciones técnicas.

## Enfoque

**Sesión.** Tabla `sessions` (`id` = `jti`, `user_id`, `created_at`, `last_used_at`,
`absolute_expires_at`, `revoked_at`). El JWT (HS256, `sub` = usuario, `jti` = sesión, `iss`,
`aud`, `exp`) solo transporta la referencia. La verdad está en la tabla: el guard la consulta en
cada petición. La lógica de expiración es una función pura, `session-expiry.ts`:

- Válida si no está revocada, `now − last_used_at ≤ 7 d` y `now ≤ absolute_expires_at`.
- Se renueva si pasaron más de 5 min desde `last_used_at`: actualiza `last_used_at` y reemite el
  JWT y la cookie con `exp = min(now + 7 d, absolute_expires_at)`. Así se acota a una escritura
  cada 5 minutos por sesión.

**Cookie.** `Set-Cookie` con `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=<hasta exp>`.

- Nombre `__Host-vm_session` con `COOKIE_SECURE=true`. El prefijo `__Host-` lo recomienda OWASP
  (Session Management) y el navegador lo exige con `Secure`, sin `Domain` y con `Path=/`.
- `vm_session` cuando `COOKIE_SECURE=false`, que solo es posible fuera de producción.
- Un helper, `session-cookie.ts`, arma y expira la cookie. Lo usan el controller y el guard (DRY).

**Login (RF-auth-01/02/13).** `AuthService.login(email, password, clientIp)`:

1. Normaliza el email y busca el usuario.
2. Verifica **siempre** con Argon2: contra el hash real o contra un hash señuelo calculado al
   iniciar el módulo, si el usuario no existe o está inactivo.
3. Un solo `if` combina las tres fallas en `InvalidCredentialsException` (`401`,
   `INVALID_CREDENTIALS`, en `shared/exceptions/`).
4. Crea la sesión y firma el token.

El controller pone la cookie (`@Res({ passthrough: true })`), responde `200` (`@HttpCode`) y
devuelve `{ user }`.

**Guards globales**, por `APP_GUARD` y en este orden:

1. `OriginGuard` (RF-auth-11): en `POST`/`PUT`/`PATCH`/`DELETE`, si llega `Origin` y no está en
   `CORS_ORIGIN`, responde `403`.
2. `JwtAuthGuard` (RF-auth-06):
   - Deja pasar las rutas `@Public()`.
   - Lee el token **solo** de la cookie.
   - `verifyAsync` con `algorithms: ['HS256']`, `issuer` y `audience`; valida el payload con Zod.
   - `AuthService.authenticate()` revisa sesión y usuario activo y renueva si toca.
   - Pone `request.user: AuthUser` y `request.sessionId`.
3. `RolesGuard` (RF-auth-07): lee `@Roles(...)` con `Reflector`. Si la ruta no declara roles,
   deja pasar.

Decoradores: `@Public()`, `@Roles()` y `@CurrentUser()`, en `modules/auth/decorators/`.

**Rate limit (RF-auth-04).**

- `ThrottlerModule.forRoot` con dos throttlers de 5 cada 60 s: `ip`, con el tracker por defecto
  `req.ip`, y `email`, con un `getTracker` que normaliza `req.body.email` y, si no es string, cae
  a la IP.
- **No** se registra `ThrottlerGuard` global: el login lleva `@UseGuards(LoginThrottlerGuard)`.
  `LoginThrottlerGuard` extiende `ThrottlerGuard` y sobreescribe `throwThrottlingException` para
  registrar el bloqueo (RNF-auth-06) y lanzar `429 TOO_MANY_REQUESTS` con el mensaje de la spec.
- `Retry-After` lo pone el propio guard (doc de `@nestjs/throttler`, `handleRequest`).
- `trust proxy` se configura con `TRUST_PROXY`:
  - `false` por defecto: `req.ip` es la IP del socket y se ignora `X-Forwarded-For`.
  - Un número de saltos o una lista de subredes, en producción detrás de un proxy que sobrescribe
    el header.
- Storage en memoria: una sola instancia (ver "Riesgos").

**Endurecimiento HTTP (RF-auth-10).** El e2e levanta **solo** `AppModule`
(`apps/backend/test/app.e2e-spec.ts:15-19`), así que todo lo que el comportamiento necesita se
conecta desde `AppModule` y no desde `main.ts`:

- `helmet()` y `cookieParser()` como middleware (`configure(consumer)` para todas las rutas).
  `hsts: false` salvo con `NODE_ENV=production`.
- `trust proxy`, en `onApplicationBootstrap` vía `HttpAdapterHost`.

**Logout (RF-auth-08).** Es `@Public()` para que sea idempotente. Si la cookie trae un token
válido, revoca la sesión; siempre expira la cookie. Responde `200` con `data: null`.

**Errores.** Excepciones nuevas en `src/shared/exceptions/`, con los mensajes y códigos de la
spec: `InvalidCredentialsException`, `UnauthenticatedException`, `ForbiddenRoleException`
(también la usa `OriginGuard`) y `TooManyAttemptsException`. `AllExceptionsFilter` no cambia.

**Log (RNF-auth-06).** `Logger` de Nest en `AuthService` (login correcto o fallido), en
`LoginThrottlerGuard` (`429`) y en `RolesGuard`/`OriginGuard` (`403`). Registra el id de usuario
si se conoce, la IP y el motivo. Nunca la contraseña, el token, el hash ni el email.

**Seed (RF-auth-15).** `src/database/seed.ts` es un script de arranque, como `main.ts`, y puede
leer `process.env`:

- Crea un contexto de aplicación (`NestFactory.createApplicationContext`).
- Valida `SEED_*` con Zod.
- Llama a `UsersService.ensureUser()`, que crea el usuario si no existe y no hace nada si existe.

## Cambios por paquete

| Paquete                          | Cambio                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vm/shared-types`               | Dependencia `zod` 4.6.5, la misma que el backend. `src/auth/roles.ts`: `ROLES` `as const` y `Role`. `src/auth/auth-user.ts`: `AuthUser`. `src/dto/auth.dto.ts`: `LoginDTO` (email normalizado con `trim` + minúsculas, contraseña de 1 a 128 caracteres, mensajes en español). Todo exportado en `index.ts`                                                    |
| `@vm/backend` — dependencias     | `typeorm` 1.1.1, `@nestjs/typeorm` 11.0.3, `pg` 8.23.0, `@nestjs/jwt` 11.0.2, `@nestjs/throttler` 6.7.0, `helmet` 8.3.0, `cookie-parser` 1.4.7, `argon2` 0.44.0 (ver "Desvíos"); dev: `@types/cookie-parser` 1.4.10. Todas con más de 14 días publicadas y compatibles con Nest 11 y CommonJS. `argon2` va en `onlyBuiltDependencies` de `pnpm-workspace.yaml` |
| `@vm/backend` — config           | `env.validation.ts` suma: `DATABASE_URL` (URL `postgres://`, requerida), `JWT_SECRET` (≥ 32 bytes, requerida, sin default), `COOKIE_SECURE` (bool, default `true`, `false` prohibido en producción), `TRUST_PROXY` (default `false`). Los mensajes de error nombran la variable, nunca su valor. `.env.example` actualizado                                    |
| `@vm/backend` — `src/database/`  | `data-source.ts` (DataSource para el CLI de TypeORM, lee `process.env` como script de arranque), `migrations/<ts>-create-users-and-sessions.ts`, `seed.ts`. Scripts `db:migrate`, `db:migration:generate`, `db:seed` (compilan y corren sobre `dist/`, con `node --env-file-if-exists=.env`)                                                                   |
| `@vm/backend` — `modules/users/` | `user.entity.ts` (`role` enum de PostgreSQL, `email` único con `CHECK (email = lower(btrim(email)))`), `user.repository.ts`, `users.service.ts` (`findByEmail`, `findActiveById`, `ensureUser`, `toAuthUser`), `users.module.ts`                                                                                                                               |
| `@vm/backend` — `modules/auth/`  | `session.entity.ts`, `session.repository.ts`, `session-expiry.ts` (puro), `password-hasher.ts`, `session-cookie.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.module.ts`, `guards/` (`jwt-auth`, `roles`, `origin`, `login-throttler`), `decorators/` (`public`, `roles`, `current-user`)                                                                |
| `@vm/backend` — otros            | `app.module.ts`: TypeORM, Throttler, `UsersModule`, `AuthModule`, guards globales, middleware helmet + cookie-parser, `trust proxy`. `health.controller.ts`: `@Public()`. `shared/exceptions/`: 4 excepciones                                                                                                                                                  |
| Raíz                             | `docker-compose.yml` (PostgreSQL 16 para desarrollo); README: puesta en marcha con base, migraciones y seed; credenciales de prueba; guía de Postman (RNF-auth-08); contrato de la API                                                                                                                                                                         |
| Documentación                    | `apps/backend/CLAUDE.md` (stack, módulos, configuración); `nestjs-patterns.md` (persistencia y auth: guards globales); `.claude/rules/shared-types.md` (estructura); `docs/product.md` (decisiones abiertas de persistencia y sesión resueltas); `security-auditor.md` (helmet y throttler ya existen); índice de specs                                        |
| `@vm/frontend`                   | Ninguno. La pantalla de login va en un cambio posterior de esta spec                                                                                                                                                                                                                                                                                           |

## Compatibilidad entre apps (`docs/sdd/README.md`)

- No cambia ningún contrato existente: solo se agregan endpoints, modelos y códigos de error.
- El frontend actual no consume nada de `auth`, así que un frontend viejo con este backend sigue
  funcionando.
- **Health:** `GET /health` sigue público y sin cambios.
- **Cookies a través del rewrite:** el rewrite de Next reenvía `Cookie` y `Set-Cookie` al mismo
  origen del frontend. La cookie, sin `Domain`, queda asociada al host del frontend, y por eso CORS
  sigue sin `credentials`.
- **Códigos nuevos y frontend:** `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `FORBIDDEN` y
  `TOO_MANY_REQUESTS` no están en `GENERIC_ERROR_CODES`. El frontend mostrará su `message`, que
  está escrito para el usuario.

## Seguridad y permisos (C8)

- **Por qué deniega por defecto:** `JwtAuthGuard` global, salvo `@Public()`. Así el próximo
  controller nace protegido (hallazgo H2).
- **Roles:** se leen del usuario en la base en cada petición, no del token (RF-auth-07).
- **JWT:**
  - Algoritmo fijo `HS256` en `verify`, para rechazar `alg: none` y la confusión de algoritmos.
  - `iss` y `aud` verificados.
  - Secreto de al menos 32 bytes (OWASP JWT Cheat Sheet: secreto del tamaño de la salida del
    HMAC).
- **Argon2id** (`argon2`, implementación de referencia):
  - Parámetros explícitos `memoryCost: 65536` (64 MiB), `timeCost: 3`, `parallelism: 4`, todos
    por encima del mínimo de OWASP (19 MiB, 2, 1).
  - `argon2.verify` compara en tiempo constante.
- **Enumeración:** la misma excepción y la misma verificación de hash en los tres casos
  (RF-auth-02).
- **Login y DoS:** `LoginDTO` corta a 128 caracteres antes del hash, y el throttler va antes que el
  pipe.
- **CSRF:** cumple las condiciones de OWASP para que `SameSite` alcance:
  - `SameSite=Strict`.
  - Verificación de Origin.
  - Ningún `GET` que cambie estado.
  - Cookie `__Host-`.

## Pruebas por requisito (`docs/testing.md`)

Los e2e (supertest sobre `AppModule`) corren contra `TEST_DATABASE_URL`, con las migraciones
aplicadas y las tablas vaciadas entre suites. El harness va en `test/support/` (crear la app,
limpiar la base, crear usuarios con `UsersService.ensureUser`).

| RF         | Criticidad | Test (nivel)    | Qué verifica                                                                                                                                                                                                                                                | Archivo                                                            |
| ---------- | ---------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| RF-auth-01 | K1, K3     | HTTP            | Login válido: `200`; `Set-Cookie` con `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, `Max-Age`; `data` es exactamente `{ user: { id, email, role } }`; el body no contiene el token                                                                     | `test/auth.e2e-spec.ts`                                            |
| RF-auth-02 | K1         | HTTP + manual   | Email inexistente, contraseña mala y usuario inactivo: el mismo status y body, sin `Set-Cookie`. La paridad de tiempos va en la verificación manual (un test de tiempos sería flaky)                                                                        | `test/auth.e2e-spec.ts`                                            |
| RF-auth-03 | K1         | HTTP            | Email inválido, contraseña vacía y contraseña de 129 caracteres: `400 VALIDATION_ERROR`                                                                                                                                                                     | `test/auth.e2e-spec.ts`                                            |
| RF-auth-04 | K1         | HTTP            | 6.º intento desde la misma IP con emails distintos: `429` + `Retry-After`. 6.º intento al mismo email cambiando `X-Forwarded-For` (con `TRUST_PROXY=false`): `429`. Con `TRUST_PROXY=loopback`, dos `X-Forwarded-For` distintos tienen contadores separados | `test/auth-throttling.e2e-spec.ts`                                 |
| RF-auth-05 | K1, K4     | Unitario + HTTP | Unitario sin mocks: válida a los 7 d − 1 min, vencida a los 7 d + 1 min sin uso, vencida a los 30 d aunque se use, la renovación no pasa del límite absoluto, renueva solo tras 5 min. HTTP: con `last_used_at` atrasado 8 días, `401`                      | `src/modules/auth/session-expiry.spec.ts`, `test/auth.e2e-spec.ts` |
| RF-auth-06 | K1         | HTTP            | Ruta protegida: `401` sin cookie, con token alterado, con `alg: none`, con HS512, con token expirado, con usuario inactivo y con el token solo en `Authorization: Bearer`; `GET /health` sin cookie da `200`                                                | `test/auth.e2e-spec.ts`                                            |
| RF-auth-07 | K1         | HTTP            | Controller de prueba con `@Roles(ROLES.ADMIN)`, montado solo en el test: Cliente da `403 FORBIDDEN` y Administrador `200`                                                                                                                                   | `test/roles.e2e-spec.ts`                                           |
| RF-auth-08 | K1, K2     | HTTP            | Logout: `Set-Cookie` expirada; la cookie anterior da `401` en `/me`; logout sin cookie da `200` y expira la cookie                                                                                                                                          | `test/auth.e2e-spec.ts`                                            |
| RF-auth-09 | K3         | HTTP            | `/me` con sesión devuelve `{ user: { id, email, role } }`                                                                                                                                                                                                   | `test/auth.e2e-spec.ts`                                            |
| RF-auth-10 | K1         | HTTP            | En un `200` y en un `404`: `x-content-type-options: nosniff`, `content-security-policy`, `x-frame-options`, sin `x-powered-by`. Con `NODE_ENV=production`, además `strict-transport-security`                                                               | `test/security-headers.e2e-spec.ts`                                |
| RF-auth-11 | K1         | HTTP            | `POST` de login con `Origin` ajeno: `403`; con el `Origin` permitido o sin `Origin`, se procesa                                                                                                                                                             | `test/auth.e2e-spec.ts`                                            |
| RF-auth-12 | K1, K2     | Unitario        | El hash empieza con `$argon2id$`, con `m`, `t`, `p` ≥ mínimo de OWASP; dos hashes de la misma contraseña difieren; verifica la correcta y rechaza otra                                                                                                      | `src/modules/auth/password-hasher.spec.ts`                         |
| RF-auth-13 | K2         | HTTP + slice    | HTTP: el login con `"  ADMIN@…  "` encuentra al usuario. Slice (`UsersService` + base de test): `ensureUser` con el mismo email en otra capitalización no crea un segundo usuario                                                                           | `test/auth.e2e-spec.ts`, `test/users.e2e-spec.ts`                  |
| RF-auth-14 | K5         | Unitario        | `validateEnv` falla sin `JWT_SECRET`, con un secreto de 31 bytes, sin `DATABASE_URL` y con `COOKIE_SECURE=false` + `NODE_ENV=production`; el mensaje nombra la variable y no contiene su valor                                                              | `src/config/env.validation.spec.ts`                                |
| RF-auth-15 | Estándar   | —               | Sin test: en G4 se corre `db:seed` dos veces y se comprueba que hay 2 usuarios                                                                                                                                                                              | —                                                                  |

**Agregados tras la revisión local** (aprobados por Dayanna, 2026-10-10):

| RF                     | Criticidad | Test (nivel) | Qué verifica                                                                                                                                                      | Archivo                                   |
| ---------------------- | ---------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| RF-auth-05             | K1, K4     | HTTP         | Con `last_used_at` atrasado 10 min: `200`, `Set-Cookie` nueva y `last_used_at` actualizado. Con `absolute_expires_at` en el pasado: `401`                         | `test/auth.e2e-spec.ts`                   |
| RF-auth-05             | K1, K4     | Unitario     | Sesión revocada no vigente (ya escrito, se registra)                                                                                                              | `src/modules/auth/session-expiry.spec.ts` |
| RF-auth-04             | K1         | HTTP         | 5 fallos y un 6.º intento con la contraseña correcta: `429` sin `Set-Cookie` (no evalúa credenciales)                                                             | `test/auth-throttling.e2e-spec.ts`        |
| RF-auth-10, RF-auth-16 | K1         | HTTP         | JSON malformado → `400 INVALID_BODY` sin repetir la entrada y con las cabeceras de seguridad; cuerpo de más de 100 KB → `413 PAYLOAD_TOO_LARGE` con las cabeceras | `test/security-headers.e2e-spec.ts`       |
| RF-auth-14             | K5         | Unitario     | `DATABASE_URL` que no es PostgreSQL rechazada sin mostrar su valor; `COOKIE_SECURE=false` aceptado fuera de producción (ya escritos, se registran)                | `src/config/env.validation.spec.ts`       |

### Tests que se retiran o reescriben

No se retira ninguno. Se ajustan dos archivos anteriores a las specs (`docs/testing.md`, punto 6),
sin cambiar sus aserciones:

| Test (archivo › nombre)                         | Señal                                                                                                                 | Qué lo reemplaza                                                                                                                                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `env.validation.spec.ts` › los 4 tests actuales | Cambió el contrato: `DATABASE_URL` y `JWT_SECRET` pasan a ser obligatorias, así que `validateEnv({})` ya no es válido | Los mismos 4 casos con una base mínima válida (`{ ...REQUIRED_ENV, PORT: '3101' }`). "Aplica valores por defecto" suma los defaults nuevos (`COOKIE_SECURE: true`, `TRUST_PROXY: false`). Mismas aserciones sobre `PORT` y `CORS_ORIGIN` |
| `test/app.e2e-spec.ts` › sus 2 tests            | `AppModule` ahora necesita base y secretos para arrancar                                                              | Mismo archivo y mismas aserciones; el `beforeAll` usa el harness de `test/support/` (env de test + migraciones)                                                                                                                          |

## Revisión de arquitectura

| Hallazgo                                                                                                                                  | Evidencia                                                                                                  | Cambio                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| La regla dice "`@UseGuards(JwtAuthGuard, RolesGuard)` a nivel de clase en cada controller", pero RF-auth-06 pide que todo nazca protegido | `apps/backend/.claude/rules/nestjs-patterns.md` → "Authentication & Authorization"; hallazgo H2 de la spec | Guards por `APP_GUARD` (globales) con `@Public()`. Se actualiza la regla en este PR (C5: se reporta, no se cambia en silencio) |
| El e2e levanta solo `AppModule`: helmet, cookie-parser o `trust proxy` puestos en `main.ts` no se probarían                               | `apps/backend/test/app.e2e-spec.ts:15-19`; regla "Filtro e interceptor por DI"                             | Middleware en `AppModule.configure()` y `trust proxy` en `onApplicationBootstrap`                                              |
| Nest 11 no tiene `app.useSecurityHeaders()` (llegó en Nest 12.1)                                                                          | Docs de Nest, "Security headers" (Context7)                                                                | Paquete `helmet` 8                                                                                                             |
| `@nestjs/typeorm` 12 y `@nestjs/jwt` 12 son ESM-only y para Nest 12                                                                       | `npm view @nestjs/typeorm@12.0.2 type` da `module`                                                         | Usar 11.0.3 y 11.0.2                                                                                                           |
| El rewrite de Next no agrega `X-Forwarded-For` y deja pasar el del cliente                                                                | `next/dist/server/lib/router-utils/proxy-request.js:31-40` (Next 16.4.0)                                   | `TRUST_PROXY=false` por defecto y límite por email (delta de RF-auth-04)                                                       |
| `ThrottlerException` trae un mensaje en inglés que el frontend mostraría tal cual                                                         | Contrato de error 4xx (`apps/backend/CLAUDE.md`)                                                           | `LoginThrottlerGuard.throwThrottlingException` lanza `TooManyAttemptsException`                                                |
| `data-source.ts` y `seed.ts` leen `process.env`                                                                                           | `.claude/rules/code-style.md`: "`process.env` is only acceptable in bootstrap files"                       | Son scripts de arranque, como `main.ts`; validan con el mismo schema Zod                                                       |

## Riesgos y decisiones (incluidas las que trascienden el cambio)

- **Persistencia:** PostgreSQL 16 con TypeORM 1.x y `@nestjs/typeorm` 11 (la 12 es ESM-only); el
  esquema cambia solo por migraciones.
- **Instalación de dependencias:** no se puede correr `pnpm install` desde WSL. Tras T1 me detengo
  (⏸) para que la usuaria corra `pnpm install` desde Windows. Verifico en una copia del repo en el
  scratchpad.
- **Base para los e2e:** hace falta un PostgreSQL alcanzable con una base de test
  (`TEST_DATABASE_URL`). Desde WSL el PostgreSQL 16 de Windows responde en `:5432`, pero hacen
  falta credenciales; las pido en la pausa de T1. Alternativa: `docker compose up -d`.
- **Throttler en memoria:** con más de una instancia del backend, cada una cuenta por su lado. Si
  se escala, `ThrottlerStorage` en Redis (fuera de alcance).
- **TypeORM 1.x es reciente** (1.0 de mayo de 2026). Riesgo de incompatibilidad con
  `@nestjs/typeorm` 11: si T4 falla, la alternativa es TypeORM 0.3.31 sin tocar el diseño.
- **`argon2` es nativo:** trae binarios precompilados por plataforma. Funciona en Windows y en
  Linux con instalaciones separadas, que es como ya se trabaja (`CLAUDE.md` → "Environment").
- **Sesión renovada en el guard:** el guard escribe `Set-Cookie` en la respuesta. Si una ruta usa
  `@Res()` sin `passthrough`, la cookie igual sale (se setea antes del handler).

## Desvíos durante la implementación

| Fecha      | Tarea    | Desvío                                                                                                                                                                                                                  | Motivo                                                                                                                                                                                                                                                                                              | Impacto                                                                                                                                                                                                                                                |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-10-10 | T1       | `argon2` 0.44.0 en lugar de 0.45.1                                                                                                                                                                                      | El binario precompilado `linux-x64` de 0.45.1 da segfault al cargarse (Node 20, glibc 2.39) y la instalación cae a compilar desde fuente, que falla sin toolchain. La 0.44.0 (agosto de 2025, misma API) carga y verifica bien                                                                      | Ninguno en la spec ni en el diseño; misma API                                                                                                                                                                                                          |
| 2026-10-10 | T4       | `uuidExtension: 'pgcrypto'` e `installExtensions: false` en la conexión                                                                                                                                                 | La migración generada usaba `uuid_generate_v4()` (extensión `uuid-ossp`, que TypeORM instalaba sola y exige superusuario). Con `gen_random_uuid()` (núcleo de PostgreSQL ≥ 13) no hace falta ninguna extensión                                                                                      | Ninguno en la spec; la migración usa `gen_random_uuid()`                                                                                                                                                                                               |
| 2026-10-10 | T7, T8   | Implementadas juntas, con sus e2e al final                                                                                                                                                                              | Los guards necesitan la cookie y una ruta protegida (`/me`), que el plan ponía en T8                                                                                                                                                                                                                | Ninguno                                                                                                                                                                                                                                                |
| 2026-10-10 | T8       | `LoginThrottlerGuard` pone el `Retry-After` estándar                                                                                                                                                                    | Con throttlers con nombre, `@nestjs/throttler` emite `Retry-After-ip` / `Retry-After-email`, no el `Retry-After` que exige RF-auth-04. Lo detectó el e2e                                                                                                                                            | Cumple RF-auth-04 tal como está                                                                                                                                                                                                                        |
| 2026-10-10 | T8       | El 2.º caso del e2e de RF-auth-04 usa `TRUST_PROXY=loopback`                                                                                                                                                            | Con `TRUST_PROXY=false` y el mismo email, el 6.º intento da 429 también por el límite de IP: el test no distinguiría cuál de los dos límites actuó. Con IPs de cliente distintas, el 429 solo puede venir del límite por email. El caso "`X-Forwarded-For` ignorado sin proxy" quedó en el 1.º caso | Test más estricto que el de la tabla, mismo RF                                                                                                                                                                                                         |
| 2026-10-10 | T9, T10  | `src/database/database.module.ts` (conexión) y `SessionTokenService` (JWT)                                                                                                                                              | El seed reutiliza la conexión sin `AppModule` (su `onApplicationBootstrap` necesita Express). El JWT en su propio service mantiene `AuthService` bajo 50 líneas por función (C9)                                                                                                                    | Ninguno                                                                                                                                                                                                                                                |
| 2026-10-10 | T6       | Sin `UsersService.findActiveById`: `SessionRepository.findWithUser` carga la sesión con su usuario (`relations: { user: true }`) y `AuthService` evalúa `isActive`                                                      | Una sola consulta por petición autenticada en vez de dos. Ningún módulo inyecta el repositorio de otro, pero el repositorio de `auth` lee la tabla `users` por la relación (señalado por la revisión local)                                                                                         | Ninguno en el comportamiento (RF-auth-06 probado). Aceptado por Dayanna tras la revisión local (2026-10-10)                                                                                                                                            |
| 2026-10-10 | Revisión | helmet, cookie-parser, `trust proxy` y un parser **solo JSON** pasan de `AppModule` a `configureHttpApp(app)` (`src/app.setup.ts`), que llaman `main.ts` y el harness de e2e antes de `init()`, con `bodyParser: false` | Nest registra su body-parser en `init()` antes que el middleware de los módulos: los errores del parser salían sin helmet, con `X-Powered-By`, repitiendo la entrada (400) o como 500 (413). Lo encontró `security-auditor`; aprobado por Dayanna (RF-auth-16)                                      | El e2e sigue probando lo mismo que producción: la misma función en los dos. Sin dependencias nuevas: el parser se registra con `app.useBodyParser('json')` de `NestExpressApplication` y sus errores se traducen con un middleware de error de Express |
| 2026-10-10 | Revisión | No se aplica el endurecimiento F (Postgres en `127.0.0.1`, rechazar el `JWT_SECRET` de ejemplo en producción, `Cache-Control: no-store` en `/api/auth/*`)                                                               | Decisión de Dayanna en la revisión local                                                                                                                                                                                                                                                            | Queda como recomendación, fuera de este cambio                                                                                                                                                                                                         |
