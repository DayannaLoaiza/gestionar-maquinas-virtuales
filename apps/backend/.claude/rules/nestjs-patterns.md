# NestJS 11 Patterns — apps/backend

## Layer Separation (Strict) — C7

```
Controller  →  Service  →  Repository  →  store
(HTTP)         (logic)     (data access)   (PostgreSQL vía TypeORM)
```

| Capa           | Hace                                                                                                                                                                  | No hace                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Controller** | Ruta, pipes (`ZodValidationPipe`, `ParseIdPipe`), `@HttpCode`. Extraer y **parsear** query/params (string → number/boolean). La forma HTTP: `{ recurso }` + `message` | Inyectar un repositorio. Filtrar, calcular, ordenar o mapear |
| **Service**    | Reglas de negocio, orquestación, paginación (`buildPaginationMeta`), el mapeo a los modelos de `@vm/shared-types` (nunca sale `passwordHash`), lanzar las excepciones | Tocar `req`/`res`                                            |
| **Repository** | Acceso a datos y **filtros en la consulta** (en el `where`, no en memoria después). Envuelve el `Repository<T>` de TypeORM y devuelve entidades internas              | Reglas de negocio                                            |

- **Un controller nunca inyecta un repositorio.** Si un endpoint necesita datos, hay un service que
  los pide (aunque solo los pase), porque ahí van a crecer las reglas.
- El service devuelve datos; **el controller decide la forma HTTP**: el envoltorio por recurso
  (`return { items, pagination }`, `return { item }`) y el `message` de una
  respuesta 2xx se arman en el controller.
- Los parámetros de query llegan como `string`: el controller los convierte y el service recibe
  tipos de dominio. Para la paginación, `normalizePagination()` (`shared/utils/pagination.util.ts`)
  en el controller y `buildPaginationMeta()` en el service. Es tolerante a propósito: un valor
  ilegible cae al default, no da 400.
- **Lógica pura en funciones puras**, en un archivo propio del módulo (p. ej. una máquina de
  estados): se prueban sin Nest ni mocks.
- `health` es solo un controller: no hay lógica ni datos que encapsular. No es una excepción a C7
  (no inyecta repositorios).
- **Persistencia:** PostgreSQL con TypeORM. Las entidades (`<singular>.entity.ts`)
  viven en su módulo y se registran en `src/database/database.options.ts`, junto con las
  migraciones. **El esquema cambia solo por migraciones** (`synchronize` nunca se activa):
  `pnpm --filter @vm/backend db:migration:generate src/database/migrations/<Nombre>`, revisar el
  SQL generado y agregarla al array `migrations`. Solo el repositorio importa TypeORM; services y
  controllers no ven `Repository<T>`.

## Rutas

- Cada controller declara su prefijo completo: `@Controller('api/<recurso>')`. **No** se usa
  `app.setGlobalPrefix`: así el e2e levanta solo `AppModule` y prueba exactamente lo que corre en
  producción. `health` queda fuera de `/api` (`@Controller('health')`).
- El frontend llega por el rewrite de Next (`/api/:path*` → backend), nunca directo desde el
  navegador.

## Request Validation

- Bodies con schemas Zod de `@vm/shared-types` y `ZodValidationPipe`:
  ```ts
  @Post()
  create(@Body(new ZodValidationPipe(CreateThingDTO)) body: CreateThingDTO) { ... }
  ```
- El pipe lanza el `ZodError` crudo: `AllExceptionsFilter` lo convierte en 400 `VALIDATION_ERROR`
  (los issues van solo al log).
- Ids con `ParseIdPipe` (`shared/pipes/parse-id.pipe.ts`): `ParseUUIDPipe` con un 400
  `VALIDATION_ERROR`. El `ParseUUIDPipe` pelado diría `Validation failed (uuid is expected)`, y el
  frontend muestra los 4xx tal cual.
- Never use `class-validator` or `class-transformer`.

## Response Handling

- `ResponseInterceptor` envuelve lo que devuelve un handler en `{ success: true, data: <valor> }`.
  Devolver los datos directo; no envolver a mano.
- Dos casos **no** pasan por el envoltorio, y son a propósito: si el valor ya trae la clave
  `success` lo deja pasar, y un handler con `@Res()` lo evita por completo (streams de archivos).
- **Un handler con `@Res()` que streamea:** abrir el origen **antes** de setear headers (si falla
  después, el filtro respondería JSON con el `Content-Type` del archivo) y escuchar `'error'` en el
  stream (`pipe()` no reenvía errores y un `'error'` sin listener tumba el proceso); con transforms
  en medio, `stream.pipeline()`.

## Contrato de error

Toda falla sale como `{ success: false, error: { message, code } }`, armado por
`AllExceptionsFilter` (`shared/filters/`):

| Status  | Qué sale                                                                   | Qué ve el usuario                                     |
| ------- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| **4xx** | El `message` de la excepción, tal cual; `code` el declarado o `HttpStatus` | **Ese mismo texto** — el front lo muestra sin filtrar |
| **5xx** | `Internal server error` + `INTERNAL_ERROR`; el mensaje real va solo al log | El fallback de la pantalla                            |
| Zod     | `Validation failed` + `VALIDATION_ERROR`; los issues van solo al log       | El fallback de la pantalla                            |

- **El `message` de un 4xx es copy de producto:** se escribe para la persona del otro lado
  (`Ya existe una máquina virtual con ese nombre`), nunca ecoa la entrada.
- **Un 5xx nunca filtra su mensaje.** No hace falta cuidar ese texto: el filtro lo descarta.
- Si el mensaje de una excepción nueva **no** es para el usuario, declararle un `code`
  (`new BadRequestException({ message, code: 'ALGO' })`) y el front usará su fallback.
- El otro extremo del contrato: `apps/frontend/src/lib/api/api-error.ts` (`toUserMessage`).

## Error Handling

- Lanzar `HttpException` de Nest con mensaje para el usuario, o excepciones propias de
  `src/shared/exceptions/` (nunca declaradas dentro de un service).
- Never return error objects manually — always throw.

## Global Providers (registered via DI in AppModule)

- `APP_FILTER` → `AllExceptionsFilter`
- `APP_INTERCEPTOR` → `ResponseInterceptor`
- No registrarlos en `main.ts`: por DI se testean y el e2e los obtiene solo con `AppModule`.
- `main.ts` queda para lo que es del proceso: CORS, `enableShutdownHooks`, `listen`, y la llamada a
  `configureHttpApp(app)` (`src/app.setup.ts`: helmet, cookies, parser solo JSON, `trust proxy`),
  que el harness de e2e también llama. Va antes de `init()` para correr antes que el parser: no
  moverlo a un middleware de módulo.

## Configuration

- Use `ConfigService` from `@nestjs/config` — never `process.env` in services, guards or
  repositories.
- Las variables se validan al arrancar con un schema Zod en `src/config/env.validation.ts`
  (`z.coerce.number()` para números: en `process.env` todo es string). Si falta o sobra algo, el
  proceso no arranca.
- Leer con `ConfigService<Env, true>` y `config.get('PORT', { infer: true })`.

## Authentication & Authorization (módulo `auth`, spec `docs/specs/auth/spec.md`)

- **Guards globales** por `APP_GUARD` en `AuthModule`, en este orden: `OriginGuard` (CSRF:
  `Origin` fuera de `CORS_ORIGIN` en `POST/PUT/PATCH/DELETE` → 403), `JwtAuthGuard` (sesión) y
  `RolesGuard`. **Toda ruta nace protegida**: no se pone `@UseGuards(JwtAuthGuard)` en cada
  controller. Las rutas sin sesión llevan `@Public()` (hoy: `health`, login y logout).
- `@Roles(ROLES.ADMIN)` con la constante de `@vm/shared-types`, nunca el string. El rol se lee del
  usuario en la base en cada petición, no del token.
- `@CurrentUser()` para el usuario de la sesión (`AuthUser`), solo en rutas protegidas.
- El JWT viaja **solo** en la cookie `HttpOnly` (`__Host-vm_session`; `vm_session` con
  `COOKIE_SECURE=false`, solo fuera de producción). El login nunca lo devuelve en el body y el guard
  nunca lo lee de `Authorization`. La cookie la manejan `SessionCookieService` (leer, poner,
  expirar) y nadie más.
- La sesión es una fila de `sessions` (el `jti` del token): vence a los 7 días sin uso o a los 30
  del login, se renueva como mucho cada 5 minutos y el logout la revoca. La lógica de expiración es
  pura, en `session-expiry.ts`.
- Contraseñas con Argon2id (`password-hasher.ts`, C8). Un login fallido lanza siempre
  `InvalidCredentialsException`, tras verificar contra un hash (real o señuelo): ni el mensaje ni el
  tiempo revelan si la cuenta existe.
- Rate limit solo del login (`LoginThrottlerGuard`, 5/min por IP y por email). La IP sale de
  `TRUST_PROXY`: nunca confiar en `X-Forwarded-For` sin un proxy que lo sobrescriba.
- Excepciones de auth en `shared/exceptions/auth.exceptions.ts`, con mensajes para el usuario.
- Si se agrega refresh token: también en cookie `HttpOnly`, leído solo de la cookie, nunca del
  body. La tabla `sessions` ya sirve de base.

## Data safety

- Nunca concatenar strings para armar una consulta o un comando: siempre parámetros.
- Filtros en la consulta, no en memoria después de traer todo.
- Una respuesta nunca lleva `passwordHash`, tokens ni `deletedAt`: el service mapea al modelo
  compartido antes de devolver.

## Testing

Qué se testea y qué no: `docs/testing.md` (por riesgo, con el ID del RF en el nombre). Cómo:

- Jest + ts-jest + `@nestjs/testing`. `pnpm --filter @vm/backend test`; e2e con
  `pnpm --filter @vm/backend test:e2e` (`test/*.e2e-spec.ts`, supertest sobre `AppModule`).
- **El e2e usa una base PostgreSQL real** (`TEST_DATABASE_URL`, distinta de `DATABASE_URL`; se
  vacía en cada suite) y corre en serie. Harness en `test/support/`: `createTestApp({ env, imports })`
  (migraciones + tablas vacías; `env` cambia la configuración reemplazando `ConfigService`) y los
  helpers de auth (`seedUser`, `loginAs`, `postLogin`).
- Lógica pura: unitario sin mocks (como `shared/utils/pagination.util.spec.ts`).
- Services: `Test.createTestingModule` con mocks `Record<string, jest.Mock>` solo en los bordes
  (repositorio, red).
- El contrato de error se prueba en `shared/filters/all-exceptions.filter.spec.ts`; el sobre de
  éxito y el de error de punta a punta, en `test/app.e2e-spec.ts`.
- **Los pipes no corren** si se llama al método del controller directo: para probar que un endpoint
  valida, usar el e2e (pasa por Express, pipes, filtro e interceptor).
- `reflect-metadata` se carga en `setupFiles` de Jest; el alias `@/` con `moduleNameMapper`.

## Imports

- **`./` solo para la misma carpeta o sus subcarpetas; todo lo que sube de nivel va con `@/`**
  (`@/shared/…`, `@/modules/<otro>/…`). Así una dependencia hacia otro módulo o hacia `shared/` se
  lee en el propio import. Lo hace cumplir `no-restricted-imports` en
  `apps/backend/eslint.config.mjs` (`..` y `../*` son error).
- `nest build` reescribe el alias a rutas relativas en `dist/` (hook `tsconfig-paths` del CLI)
  resolviendo contra el **cwd**; por eso el script `build` termina con
  `scripts/check-dist-aliases.mjs`, que falla si quedó un `require("@/…")`.
- **No usar `import('@/…')` dinámico.** El hook solo reescribe imports estáticos: el dinámico llega a
  `dist/` sin reescribir. Jest sí lo resuelve, así que **los tests pasan y el build falla** en la
  guarda.
- **Decorator metadata:** las clases que se inyectan por constructor o que tipan un parámetro
  decorado se importan con `import` normal, nunca `import type` (por eso la config `nest` de ESLint
  apaga `consistent-type-imports`).
- **Editor:** para que el autocompletado genere `@/` también dentro de un mismo módulo, setting de
  usuario `"typescript.preferences.importModuleSpecifier": "non-relative"`.

## Existing Modules

`health`, `users`, `auth`, `virtual-machines` — revisar `src/modules/` antes de crear uno nuevo,
para no duplicar.
