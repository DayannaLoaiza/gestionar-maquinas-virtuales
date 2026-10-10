# apps/backend — API NestJS (`@vm/backend`)

Aplica también el `CLAUDE.md` raíz y `docs/constitution.md`, que manda sobre todo lo de este
archivo. El detalle de cada convención está en `.claude/rules/nestjs-patterns.md` (carga junto con
este archivo).

## Stack

NestJS 11 (CommonJS), Zod 4 (`ZodValidationPipe` + schemas de `@vm/shared-types`), `@nestjs/config`
con validación Zod, PostgreSQL 16 con TypeORM 1.x, autenticación con JWT en cookie
`HttpOnly` (`@nestjs/jwt`), Argon2id (`argon2`), `helmet`, `@nestjs/throttler`, Jest 30 + ts-jest +
supertest.

## Modules

| Module   | Description                                                                        |
| -------- | ---------------------------------------------------------------------------------- |
| `health` | `GET /health` (fuera de `/api`, `@Public()`)                                       |
| `users`  | Entidad `users`, repositorio y `UsersService` (búsqueda, `ensureUser`, `AuthUser`) |
| `auth`   | `/api/auth/login`, `logout`, `me`; sesiones; guards globales; rate limit del login |

Spec de `users` + `auth`: `docs/specs/auth/spec.md`. Cada capacidad nueva entra por el flujo SDD
(`docs/sdd/README.md`), con `/generate-module`.

## Architecture Pattern

**Controller → Service → Repository** (C7), un módulo plano por feature en `src/modules/<feature>/`:
`<feature>.module.ts`, `.controller.ts`, `.service.ts`, `<singular>.repository.ts` y, si hay
lógica pura, su propio archivo con su spec. Lo que más se olvida: **un controller nunca inyecta un
repositorio** ni filtra, calcula o mapea; parsea la entrada, llama a un service y arma
`{ recurso }`. Los imports que suben de carpeta van con `@/`.

Entre módulos se comparten services (el módulo dueño los exporta), nunca repositorios.

## Shared Infrastructure (`src/shared/`)

- **Filter:** `AllExceptionsFilter` — sobre de error `{ success: false, error: { message, code } }`;
  registrado con `APP_FILTER`.
- **Interceptor:** `ResponseInterceptor` — `{ success: true, data }`; registrado con
  `APP_INTERCEPTOR`.
- **Pipes:** `ZodValidationPipe` (bodies), y `ParseUUIDPipe` de Nest para ids.
- **Exceptions:** `shared/exceptions/` — excepciones de dominio (extienden `HttpException`). Hoy:
  `auth.exceptions.ts`.
- **Database:** `src/database/` — `DatabaseModule` (conexión), `database.options.ts` (entidades y
  migraciones), `data-source.ts` (CLI de TypeORM), `migrations/`, `seed.ts`.
- **Utils:** `shared/utils/pagination.util.ts` — `normalizePagination(page?, pageSize?)` en el
  controller (tolerante, default 50, máx. 100) y `buildPaginationMeta(pagination, total)` en el
  service (`{ page, pageSize, total, totalPages, hasNext, hasPrev }`).

## Contrato de error

4xx → el `message` tal cual (el frontend lo muestra: escribirlo para el usuario, sin ecoar la
entrada). 5xx → `Internal server error` + `INTERNAL_ERROR`. Zod → `Validation failed` +
`VALIDATION_ERROR`. Tabla completa en `.claude/rules/nestjs-patterns.md`; cubierto por
`src/shared/filters/all-exceptions.filter.spec.ts`. El otro extremo:
`apps/frontend/src/lib/api/api-error.ts`.

## Configuration

`src/config/env.validation.ts` (Zod): `NODE_ENV`, `PORT` (3001), `CORS_ORIGIN` (lista separada por
comas; también es la lista de `Origin` permitidos), `DATABASE_URL`, `JWT_SECRET` (≥ 32 bytes, sin
default), `COOKIE_SECURE` (default `true`; `false` prohibido en producción), `TRUST_PROXY` (default
`false`). Ver `.env.example`. Leer siempre con `ConfigService`; `process.env` solo en los scripts de
arranque (`main.ts`, `database/data-source.ts`, `database/seed.ts`).

`helmet`, `cookie-parser`, el parser **solo JSON** (100 KB, errores → `INVALID_BODY` /
`PAYLOAD_TOO_LARGE`) y `trust proxy` se registran en `configureHttpApp(app)` (`src/app.setup.ts`),
**antes** de `init()` y con `HTTP_APP_OPTIONS` (`bodyParser: false`): Nest registra su parser en
`init()` antes que el middleware de módulos, y un error del parser saltaría helmet. La llaman
`main.ts` y el harness de e2e, así el test prueba lo mismo que producción.

## Commands

```bash
pnpm --filter @vm/backend dev        # nest start --watch, :3001
pnpm --filter @vm/backend build      # nest build + scripts/check-dist-aliases.mjs
pnpm --filter @vm/backend test       # unit (src/**/*.spec.ts)
pnpm --filter @vm/backend test:e2e   # test/*.e2e-spec.ts sobre AppModule (necesita TEST_DATABASE_URL)
pnpm --filter @vm/backend db:migrate # compila y aplica migraciones
pnpm --filter @vm/backend db:seed    # usuarios de prueba (SEED_*)
pnpm --filter @vm/backend test -- -t "RF-<slug>-NN"
```

## Testing

**Qué** se testea: `docs/testing.md`. **Cómo**: Jest + ts-jest + `@nestjs/testing`;
`reflect-metadata` en `setupFiles`, alias `@/` con `moduleNameMapper`. El e2e usa solo `AppModule`
(filtro e interceptor llegan por DI), así que prueba lo mismo que corre en producción.

## Do's and Don'ts

| DO                                                               | DON'T                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------- |
| Validar bodies con `@Body(new ZodValidationPipe(Schema))`        | `class-validator` / `class-transformer`               |
| Devolver los datos directo (el interceptor envuelve)             | Envolver a mano en `{ success, data }`                |
| Lanzar excepciones (las atrapa `AllExceptionsFilter`)            | Devolver objetos de error desde controllers           |
| Escribir el `message` de un 4xx para el usuario final            | Poner detalle técnico en un 4xx (el front lo muestra) |
| Declarar un `code` si el mensaje no es para el usuario           | Confiar en que el front filtre por el texto           |
| `@Controller('api/<recurso>')`                                   | `app.setGlobalPrefix` o rutas sin prefijo             |
| Filtro e interceptor por `APP_FILTER` / `APP_INTERCEPTOR`        | Registrarlos en `main.ts`                             |
| `ConfigService` para la configuración                            | `process.env` en services                             |
| Mapear al modelo compartido antes de responder                   | Devolver `passwordHash` o filas internas              |
| `@Public()` solo en rutas que de verdad no exigen sesión         | `@UseGuards(JwtAuthGuard)` por controller (es global) |
| Cambiar el esquema con una migración                             | `synchronize: true`                                   |
| Importar con `@/` lo que sube de carpeta                         | `../` (error de lint) o `import('@/…')` dinámico      |
| `import` normal para clases inyectadas o de parámetros decorados | `import type` (rompe la metadata de decoradores)      |
| Registrar cada módulo en `app.module.ts`                         | Módulos sueltos sin registrar                         |
