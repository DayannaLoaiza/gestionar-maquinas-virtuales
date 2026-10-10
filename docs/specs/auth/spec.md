# Especificación — Autenticación y control de acceso

| Campo                         | Valor                                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado                        | vigente                                                                                                                                                                                                                                                   |
| Aprobada por / fecha          | Dayanna — 2026-10-10 (puerta G1)                                                                                                                                                                                                                          |
| Capacidad                     | `auth`                                                                                                                                                                                                                                                    |
| Responsable                   | Dayanna                                                                                                                                                                                                                                                   |
| Constitución                  | revisada contra v1.0.0                                                                                                                                                                                                                                    |
| Última verificación vs código | 2026-10-10 (`2780fa8`)                                                                                                                                                                                                                                    |
| Código                        | `apps/backend/src/modules/auth/`, `apps/backend/src/modules/users/`, `apps/backend/src/database/`, `apps/backend/src/app.setup.ts`, `apps/backend/src/shared/exceptions/`, `packages/shared-types/src/auth/`, `packages/shared-types/src/dto/auth.dto.ts` |

## Contexto y objetivo

Antes de esta capacidad, la API no tenía usuarios, sesión ni control de acceso: el único endpoint
era `GET /health`. Esta spec cubre la parte de backend de `auth` (`docs/product.md` → "Autenticación"): login con
email y contraseña, sesión en una cookie `HttpOnly`, cierre de sesión, control de acceso por rol y
el endurecimiento HTTP que exige OWASP. La parte de frontend (pantalla de login, rutas privadas en
`proxy.ts`) entra en un cambio posterior de esta misma spec.

### Análisis OWASP del estado previo

Revisión del código anterior a esta capacidad contra el OWASP Top 10:2025 y los Cheat Sheets de OWASP
(Authentication, Session Management, JSON Web Token, CSRF Prevention, Password Storage), consultados
con Context7 el 2026-10-10.

| #   | Categoría OWASP                           | Hallazgo                                                                                                                                                                                                                                                                                                                                                    | Severidad        | Dónde                                                                                         | Lo resuelve                                          |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| H1  | A02 Security Misconfiguration             | Sin cabeceras de seguridad. Express envía `X-Powered-By: Express`, que revela la tecnología del servidor                                                                                                                                                                                                                                                    | Media            | `apps/backend/src/main.ts` (bootstrap previo)                                                 | RF-auth-10, RF-auth-16                               |
| H2  | A01 Broken Access Control                 | No hay control de acceso: todo endpoint es público. Hoy solo existe `health`, pero el primer endpoint de negocio nacería abierto si la protección depende de acordarse de ponerla en cada controller                                                                                                                                                        | Alta (latente)   | `apps/backend/src/app.module.ts`                                                              | RF-auth-06                                           |
| H3  | A07 Authentication Failures               | Sin limitación de tasa: nada frena la fuerza bruta cuando exista el login                                                                                                                                                                                                                                                                                   | Alta (latente)   | —                                                                                             | RF-auth-04                                           |
| H4  | A06 Insecure Design                       | El navegador llega al backend por el rewrite de Next (`/api/*`). Next 16.4 reenvía con `httpxy` agregando solo `x-forwarded-host`: no agrega `X-Forwarded-For` con la IP real y deja pasar sin tocar el que mande el cliente. Un límite solo por IP agruparía a todos los usuarios en la IP de Next o, confiando en el header, se esquivaría falsificándolo | Alta (de diseño) | `apps/frontend/next.config.ts:10`; `next/dist/server/lib/router-utils/proxy-request.js:31-40` | RF-auth-04 (límite por IP de confianza y por cuenta) |
| H5  | A02 Security Misconfiguration             | `GET /health` es público y devuelve `uptime`, que permite saber cuándo se reinició el servidor                                                                                                                                                                                                                                                              | Baja             | `apps/backend/src/modules/health/health.controller.ts` (`check()`)                            | Fuera de alcance                                     |
| —   | A10 Mishandling of Exceptional Conditions | Correcto: `AllExceptionsFilter` nunca devuelve el mensaje de un 5xx ni los issues de Zod                                                                                                                                                                                                                                                                    | —                | `apps/backend/src/shared/filters/all-exceptions.filter.ts`                                    | —                                                    |
| —   | A02 / CORS                                | Correcto: lista explícita de orígenes y sin `credentials`. Debe seguir así: la cookie viaja en el mismo origen gracias al rewrite, así que no hace falta habilitar `credentials`, y habilitarlo ampliaría la superficie de CSRF                                                                                                                             | —                | `apps/backend/src/main.ts` (`enableCors`)                                                     | RNF-auth-05                                          |
| —   | A04 / C12                                 | Correcto: `.env` ignorado, solo `.env.example` versionado                                                                                                                                                                                                                                                                                                   | —                | `.gitignore`                                                                                  | —                                                    |

### Duración de la sesión

Se pidió no tener que volver a iniciar sesión cada hora ni cada día, sin perder seguridad. Las
opciones analizadas:

| Opción                                        | Re-login                          | Revocación                      | Costo                                                                                                                                                          |
| --------------------------------------------- | --------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT largo sin estado                          | Al expirar                        | No: vale hasta que expira       | Inseguro: un token robado sirve días (OWASP JWT Cheat Sheet)                                                                                                   |
| Access token corto + refresh token rotativo   | Al vencer el refresh              | Sí                              | Dos cookies, endpoint de refresh y lógica de reintento en el frontend. Su ventaja es no consultar la base en cada petición, y aquí ya se consulta (RF-auth-06) |
| **Sesión deslizante validada en el servidor** | Tras 7 días sin uso o 30 de login | Sí, inmediata (tabla `Session`) | Una escritura de "último uso" acotada; transparente para el frontend                                                                                           |

Se elige la **sesión deslizante**. Como el guard ya valida contra la tabla `Session` en cada
petición (revocación inmediata, usuario activo), el refresh token no agrega seguridad, solo
complejidad. Cumple lo que pide OWASP (Session Management Cheat Sheet): timeout por inactividad
**y** absoluto, aplicados en el servidor, e invalidación en el servidor al cerrar sesión.

- **7 días de inactividad:** quien usa la aplicación al menos una vez por semana no vuelve a
  iniciar sesión hasta el límite absoluto. Una sesión olvidada en un equipo muere sola en una
  semana.
- **30 días absolutos:** obliga a reautenticarse al menos una vez al mes. Es el máximo que NIST
  SP 800-63B fija para AAL1 (un solo factor, como este login).
- **Cookie persistente (`Max-Age`).** OWASP prefiere cookies de sesión no persistentes; aquí se
  acepta la persistente a propósito, porque sin ella cada cierre del navegador obligaría a volver a
  iniciar sesión. La compensan `HttpOnly`, `SameSite=Strict`, la expiración en el servidor y la
  revocación al cerrar sesión.

## Actores y permisos

Roles: **Administrador** y **Cliente** (`docs/product.md` → "Roles"). Sus valores se definen como
constante en `@vm/shared-types` (`ROLES`) y son los únicos válidos. Esta capacidad no crea endpoints
de negocio: provee el mecanismo (`@Roles(...)`) que usarán `virtual-machines` y las siguientes.

| Actor            | Puede                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| Anónimo          | `POST /api/auth/login`, `POST /api/auth/logout` (idempotente), `GET /health` |
| Cualquier sesión | `GET /api/auth/me`, rutas sin restricción de rol                             |
| Por rol          | Rutas marcadas con `@Roles(...)`: solo los roles listados                    |

## Requisitos funcionales (EARS)

- **RF-auth-01** · crítico (K1, K3) — CUANDO se recibe `POST /api/auth/login` con el email y la
  contraseña de un usuario activo, el sistema debe crear una sesión nueva, responder `200` y
  establecer el token de sesión (JWT firmado) en una cookie con los atributos `HttpOnly`, `Secure`
  (RF-auth-14), `SameSite=Strict`, `Path=/` y `Max-Age` igual a la expiración por inactividad
  (RF-auth-05). El cuerpo debe contener **solo** `{ user: { id, email, role } }`
  dentro del sobre `{ success: true, data }`: nunca el token, el hash de la contraseña ni otro campo
  interno.
- **RF-auth-02** · crítico (K1) — SI en el login el email no existe, la contraseña no coincide o el
  usuario está inactivo, ENTONCES el sistema debe responder `401` con el mismo mensaje y el mismo
  `code` (`INVALID_CREDENTIALS`) en los tres casos, sin establecer cookie, y ejecutando la misma
  verificación de hash en los tres casos, para que el tiempo de respuesta no revele si la cuenta
  existe.
- **RF-auth-03** · crítico (K1) — SI el cuerpo del login no cumple `LoginDTO` (email con formato
  inválido, contraseña vacía o de más de 128 caracteres, campos faltantes), ENTONCES el sistema debe
  responder `400` `VALIDATION_ERROR` sin consultar credenciales.
- **RF-auth-04** · crítico (K1) — SI se superan 5 intentos de login en 60 segundos desde una misma
  IP de cliente, o 5 intentos en 60 segundos contra un mismo email (normalizado como en
  RF-auth-13), ENTONCES el sistema debe responder `429` (`TOO_MANY_REQUESTS`, con cabecera
  `Retry-After`) sin evaluar las credenciales, hasta que la ventana termine. Cuentan todos los
  intentos, exitosos o no. La IP de cliente es la que informa el proxy de confianza configurado
  (`TRUST_PROXY`); sin proxy configurado, es la IP de la conexión. Una cabecera `X-Forwarded-For`
  que no viene de un proxy de confianza nunca se usa. **Requisito de despliegue:** el rewrite de
  Next no agrega `X-Forwarded-For` (hallazgo H4), así que en producción debe haber delante de Next
  un proxy (nginx, balanceador) que **sobrescriba** `X-Forwarded-For` con la IP de la conexión, y la
  API debe correr con `TRUST_PROXY` apuntando a Next (p. ej. `loopback`). Sin ese proxy, todo lo que
  llega por el rewrite comparte la IP de Next y el límite por IP pasa a ser compartido entre
  usuarios: riesgo aceptado solo en desarrollo.
- **RF-auth-05** · crítico (K1, K4) — La sesión debe expirar, verificado en el servidor, al cumplirse
  lo primero de: **7 días sin ninguna petición autenticada** (inactividad) o **30 días desde el
  login** (absoluto). Una petición autenticada válida extiende la expiración por inactividad, sin
  pasar del límite absoluto, y renueva la cookie con la nueva expiración, **como mucho una vez cada
  5 minutos por sesión** (acota las escrituras a la base): la sesión puede vencer hasta 5 minutos
  antes de cumplirse 7 días desde la última petición. Pasado cualquiera de los
  dos límites, la sesión se trata como inexistente (RF-auth-06). Motivo de los valores: "Duración
  de la sesión", más abajo.
- **RF-auth-06** · crítico (K1) — Toda ruta debe exigir una sesión válida, salvo las declaradas
  públicas (`POST /api/auth/login`, `POST /api/auth/logout` y `GET /health`). SI una petición a una ruta protegida llega sin
  cookie de sesión, o con un token alterado, mal firmado, firmado con otro algoritmo, expirado, de
  una sesión revocada o de un usuario inactivo o inexistente, ENTONCES el sistema debe responder
  `401` (`UNAUTHENTICATED`) sin ejecutar la ruta. El token solo se acepta desde la cookie: un token
  enviado en la cabecera `Authorization`, en el cuerpo o en la query se ignora.
- **RF-auth-07** · crítico (K1) — SI un usuario con sesión válida pide una ruta restringida a roles
  que no incluyen el suyo, ENTONCES el sistema debe responder `403` (`FORBIDDEN`) sin ejecutar la
  ruta. El rol se toma del usuario guardado, no de lo que diga el cliente.
- **RF-auth-08** · crítico (K1, K2) — CUANDO se recibe `POST /api/auth/logout`, el sistema debe
  revocar la sesión en el servidor y expirar la cookie en la respuesta. A partir de ahí, el mismo
  token debe recibir `401` aunque no haya expirado. Sin sesión válida, el logout responde igual (es
  idempotente) y también expira la cookie.
- **RF-auth-09** · crítico (K3) — CUANDO se recibe `GET /api/auth/me` con una sesión válida, el
  sistema debe responder `{ user: { id, email, role } }` del usuario de esa sesión.
- **RF-auth-10** · crítico (K1) — Toda respuesta de la API, también las de error, debe llevar las
  cabeceras de seguridad de `helmet` (entre ellas `X-Content-Type-Options: nosniff`,
  `Content-Security-Policy` y `X-Frame-Options` o `frame-ancestors`), y no debe llevar
  `X-Powered-By`, incluidas las de un cuerpo que no se pudo leer (RF-auth-16). En producción debe
  llevar además `Strict-Transport-Security`.
- **RF-auth-11** · crítico (K1) — SI una petición con método que cambia estado (`POST`, `PUT`, `PATCH`, `DELETE`) trae una cabecera `Origin` que no está en
  `CORS_ORIGIN`, ENTONCES el sistema debe responder `403` sin ejecutar la ruta. Una petición sin
  `Origin` (Postman, `curl`) se procesa normalmente.
- **RF-auth-12** · crítico (K1, K2) — El sistema debe guardar cada contraseña solo como hash
  Argon2id con sal aleatoria propia y parámetros no menores al mínimo de OWASP (m = 19 MiB, t = 2,
  p = 1). Dos usuarios con la misma contraseña deben tener hashes distintos.
- **RF-auth-13** · crítico (K2) — El email de un usuario debe ser único sin distinguir mayúsculas
  ni espacios de los extremos: se guarda normalizado (recortado y en minúsculas) y el login
  normaliza igual antes de buscar.
- **RF-auth-14** · crítico (K5) — SI al arrancar falta el secreto de firma o tiene menos de 32
  bytes, falta la configuración de la base de datos, o `COOKIE_SECURE=false` con
  `NODE_ENV=production`, ENTONCES el proceso no debe arrancar y debe indicar qué variable falla,
  sin mostrar su valor. `COOKIE_SECURE` vale `true` por defecto; solo fuera de producción puede
  ponerse en `false`, para probar con herramientas sobre `http://localhost`.
- **RF-auth-15** · estándar — `pnpm --filter @vm/backend db:seed` debe crear, sin duplicarlos si ya
  existen, un usuario Administrador y uno Cliente de prueba, con emails y contraseñas tomados de
  variables `SEED_*` (valores de desarrollo en `.env.example`) y contraseñas guardadas como en
  RF-auth-12. SI `NODE_ENV=production`, ENTONCES el seed no debe crear ningún usuario y debe
  terminar con error: las credenciales de prueba están publicadas en el README.
- **RF-auth-16** · crítico (K1) — SI el cuerpo de una petición no es JSON válido o supera 100 KB,
  ENTONCES el sistema debe responder `400` (`INVALID_BODY`) o `413` (`PAYLOAD_TOO_LARGE`) con un
  mensaje genérico que no repite la entrada, sin ejecutar la ruta ni registrarlo como error del
  servidor. La API solo lee cuerpos `application/json`: un formulario HTML no puede enviarle datos.

## Requisitos no funcionales

- **RNF-auth-01** — Persistencia en PostgreSQL. El esquema se crea y cambia **solo** con
  migraciones versionadas; la sincronización automática del esquema queda desactivada en todo
  entorno. ORM: TypeORM (decisión en el plan del cambio).
- **RNF-auth-02** — Entidad `User`: `id` (UUID, clave primaria), `email` (único, normalizado),
  `passwordHash` (Argon2id), `role` (`Administrador` | `Cliente`, restringido también en la base),
  `isActive` (por defecto `true`), `createdAt`, `updatedAt`.
- **RNF-auth-03** — Entidad `Session`: identificador único que viaja en el token (`jti`), usuario,
  emisión, último uso, expiración absoluta y revocación. Es la base para cerrar sesión en el servidor, revocar todas
  las sesiones de un usuario o agregar un refresh token más adelante, sin rediseñar.
- **RNF-auth-04** — El secreto de firma del JWT se lee de una variable de entorno validada (C12): sin
  valor por defecto en el código. La verificación acepta un único algoritmo fijo.
- **RNF-auth-05** — CORS sigue con lista explícita de orígenes y sin `credentials: true`.
- **RNF-auth-06** — Cada login exitoso, login fallido, `429` y `403` deja una línea en el log del
  backend con el id de usuario si se conoce, la IP de origen y el motivo. Nunca registra la
  contraseña, el token ni el hash (A09).
- **RNF-auth-07** — Todo lo nuevo funciona sin `// TODO` ni implementaciones simuladas, con tipado
  estricto y excepciones formales (`src/shared/exceptions/` o las de Nest con mensaje para el
  usuario).
- **RNF-auth-08** — Endpoints probables con Postman: el README documenta cómo hacer login y usar la
  cookie (pasos y credenciales de prueba).

## Casos límite

- Email con mayúsculas o espacios (` Admin@Ejemplo.com`): encuentra al mismo usuario (RF-auth-13).
- Contraseña de 10 000 caracteres: `400` por `LoginDTO` antes de calcular ningún hash (RF-auth-03).
  Evita usar el hash costoso como vector de denegación de servicio.
- Usuario desactivado con una sesión abierta: la siguiente petición recibe `401` (RF-auth-06).
- JSON malformado (`{"email": abc`): `400 INVALID_BODY` con las cabeceras de seguridad y sin repetir
  el texto recibido (RF-auth-16).
- Despliegue sin proxy delante de Next: 5 intentos fallidos por minuto de cualquiera bloquean el
  login por IP de todos durante la ventana (RF-auth-04, requisito de despliegue).
- Sesión usada todos los días: a los 30 días del login recibe `401` aunque nunca estuvo 7 días
  inactiva (RF-auth-05).
- Sesión sin uso durante 7 días y 1 minuto: `401` aunque falten días para el límite absoluto
  (RF-auth-05).
- Login estando ya logueado: se crea una sesión nueva con otro `jti` y otra cookie, nunca se
  reutiliza la anterior (fijación de sesión). La anterior sigue válida hasta expirar o cerrarse.
- Token con `alg: none` o firmado con HS512 en vez del algoritmo fijo: `401` (RF-auth-06).
- Token válido en `Authorization: Bearer` y sin cookie: `401` (RF-auth-06).
- Cookie válida de una sesión revocada: `401` (RF-auth-08).
- Base de datos caída durante el login: `500` genérico (`INTERNAL_ERROR`), nunca un `401` que
  parezca credencial incorrecta.
- Atacante que cambia `X-Forwarded-For` en cada intento sin un proxy de confianza configurado: el
  header se ignora y, además, el límite por email lo frena a los 5 intentos (RF-auth-04).
- Alguien agota los 5 intentos de la cuenta de otra persona: esa cuenta no puede iniciar sesión
  durante el resto de la ventana (como mucho 60 s). Se acepta como costo del límite por cuenta.
- Cuerpo con campos de más (`role: "Administrador"`) en el login: se ignoran; el login nunca asigna
  ni cambia rol.

## Fuera de alcance

- Frontend: pantalla de login, rutas privadas (`proxy.ts`), manejo del `401` en el cliente. Va en
  un cambio posterior de esta spec.
- Registro de usuarios, recuperación y cambio de contraseña, verificación de email, MFA.
- Refresh token (la entidad `Session` lo deja preparado, RNF-auth-03).
- Bloqueo de cuenta por intentos fallidos (se cubre con la limitación de tasa, RF-auth-04).
- Limpieza periódica de sesiones expiradas en la base.
- CRUD de usuarios o administración de roles.
- `uptime` en `GET /health` (hallazgo H5): se propone un cambio aparte.
- Endurecimiento propuesto en la revisión local y no aplicado por decisión del 2026-10-10: publicar
  PostgreSQL solo en `127.0.0.1`, rechazar el `JWT_SECRET` de ejemplo con `NODE_ENV=production` y
  `Cache-Control: no-store` en las respuestas de `/api/auth/*`.
- Autenticación del socket de tiempo real (capacidad `realtime-vm-status`).

## Contratos visibles

| Endpoint                | Acceso  | Request    | Respuesta 2xx (`data`)        | Errores                                                               |
| ----------------------- | ------- | ---------- | ----------------------------- | --------------------------------------------------------------------- |
| `POST /api/auth/login`  | Público | `LoginDTO` | `{ user: AuthUser }` + cookie | 400 (`VALIDATION_ERROR`, `INVALID_BODY`), 401, 403 (Origin), 413, 429 |
| `POST /api/auth/logout` | Público | —          | `null` + cookie expirada      | 400 (`INVALID_BODY`), 403 (Origin), 413                               |
| `GET /api/auth/me`      | Sesión  | —          | `{ user: AuthUser }`          | 401                                                                   |

Las rutas siguen la convención del repo (`@Controller('api/…')`) y pasan por el rewrite `/api/*`
de Next, en vez del `POST /login` del pedido original (decidido en la clarificación).

En `@vm/shared-types`: `LoginDTO` (schema y tipo, `src/dto/auth.dto.ts`), `ROLES` y `Role`,
`AuthUser` (`{ id, email, role }`) en `src/auth/`. Códigos de error nuevos: `INVALID_CREDENTIALS`,
`UNAUTHENTICATED`, `FORBIDDEN`, `TOO_MANY_REQUESTS`, `INVALID_BODY` y `PAYLOAD_TOO_LARGE`. Sus
mensajes son para el usuario (el frontend muestra los 4xx tal cual):

| Code                  | Mensaje                                                    |
| --------------------- | ---------------------------------------------------------- |
| `INVALID_CREDENTIALS` | `Correo o contraseña incorrectos`                          |
| `UNAUTHENTICATED`     | `Tu sesión no es válida o expiró. Inicia sesión de nuevo`  |
| `FORBIDDEN`           | `No tienes permisos para realizar esta acción`             |
| `TOO_MANY_REQUESTS`   | `Demasiados intentos. Espera un momento y vuelve a probar` |
| `INVALID_BODY`        | `El cuerpo de la petición no es válido`                    |
| `PAYLOAD_TOO_LARGE`   | `El cuerpo de la petición es demasiado grande`             |

## Verificación contra la constitución

| ID  | Aplica | Cómo se cumple                                                                                                                               |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Todo el comportamiento de `auth` está en esta spec antes de implementarse                                                                    |
| C2  | Sí     | Spec antes que código, en el mismo PR                                                                                                        |
| C3  | Sí     | G1 sobre esta spec; G2 sobre plan y tareas antes de tocar `apps/` y `packages/`                                                              |
| C4  | Sí     | Las seis dudas se resolvieron en la clarificación (2026-10-10); no queda ningún `[NECESITA ACLARACIÓN]`                                      |
| C5  | Sí     | Los hallazgos del análisis OWASP y de la revisión local se reportaron; los desvíos constan en el plan del cambio                             |
| C6  | Sí     | Todos los RF salvo RF-auth-15 son Críticos (K1–K5) y tienen test con su ID; RF-auth-02 además, verificación manual                           |
| C7  | Sí     | Módulos `auth` y `users` con Controller → Service → Repository; los guards usan services, no repositorios                                    |
| C8  | Sí     | `LoginDTO` (Zod) en el borde; Argon2id (RF-auth-12); OWASP Top 10:2025 (análisis y RF-auth-02, 04, 06–11, 16)                                |
| C9  | Sí     | Sin `any`, funciones < 50 líneas (RNF-auth-07)                                                                                               |
| C10 | Sí     | `LoginDTO`, `ROLES`, `AuthUser` en `@vm/shared-types`                                                                                        |
| C11 | Sí     | OWASP, `helmet`, `@nestjs/throttler`, TypeORM, `@nestjs/jwt`, `argon2` y Zod consultados con Context7 o en el paquete instalado (2026-10-10) |
| C12 | Sí     | Secreto JWT, credenciales de la base y del seed solo por variables de entorno; `.env.example` con valores de dev                             |

## Verificación manual

- **RF-auth-01 con Postman** (además del e2e): `POST /api/auth/login` con las credenciales de
  prueba → la pestaña Cookies muestra `__Host-vm_session` con `HttpOnly`, `Secure`,
  `SameSite=Strict`, `Path=/`; el body no contiene el token. `GET /api/auth/me` sin tocar nada
  responde el usuario. Si Postman no reenvía la cookie `Secure` sobre `http://localhost` y se prueba
  con `COOKIE_SECURE=false` (solo fuera de producción), la cookie se llama `vm_session` y no lleva
  `Secure`: el resto de los atributos se verifica igual, y `Secure` se verifica en el e2e.

- **RF-auth-02, paridad de tiempos** (un test automático de tiempos sería flaky): cinco logins
  con emails inexistentes y cinco con un email existente y contraseña incorrecta, dentro de una
  ventana del rate limit (el límite por email corta en 5 por minuto; el de IP también, así que en
  una instancia local se usan IPs distintas con `TRUST_PROXY=loopback` y `X-Forwarded-For`). Las
  medianas de tiempo de respuesta difieren en menos del 20 %, y las dos incluyen el costo de un hash
  Argon2id (decenas de milisegundos, no 1–2 ms).

## Dudas abiertas

Ninguna. Resueltas en la clarificación del 2026-10-10: rutas `/api/auth/*`; sesión de 7 días por
inactividad y 30 de máximo; 5 intentos por minuto por IP y por email; verificación de `Origin`; `COOKIE_SECURE`;
seed por script.

## Historial

| Fecha      | Cambio                                                                                                                                                                                                                        | PR  | Requisitos                     | Aprobó                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------ | ------------------------ |
| 2026-10-10 | Creación: backend de `auth` (login, sesión deslizante, RBAC, endurecimiento OWASP)                                                                                                                                            | —   | RF-auth-01…15, RNF-auth-01…08  | Dayanna (G1)             |
| 2026-10-10 | Delta en el plan: RF-auth-04 también por cuenta y con IP solo de proxy de confianza (hallazgo H4)                                                                                                                             | —   | RF-auth-04                     | Dayanna (G1, 2026-10-10) |
| 2026-10-10 | Delta tras la revisión local: RF-auth-16 (cuerpos ilegibles), requisito de despliegue de RF-auth-04, seed bloqueado en producción, renovación cada 5 min (RF-auth-05), logout público                                         | —   | RF-auth-04, 05, 06, 10, 15, 16 | Dayanna (G1, 2026-10-10) |
| 2026-10-10 | Validación (G4): implementado y verificado. RF-auth-02, paridad de tiempos manual: medianas de 60 y 61 ms (2,4 %), con 5+5 intentos en lugar de 10+10 porque el límite por email corta en 5                                   | —   | RF-auth-01…16                  | Dayanna (G4)             |
| 2026-10-10 | Correcciones de redacción, sin cambio de RF: campo Código, análisis en pasado, códigos y errores de los contratos, verificaciones manuales ejecutables, tabla de constitución, endurecimiento no aplicado en fuera de alcance | —   | —                              | Dayanna                  |
