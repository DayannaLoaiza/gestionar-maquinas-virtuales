# Especificación — Autenticación y control de acceso

| Campo                         | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado                        | vigente (backend RF-auth-01…16 y frontend RF-auth-17…34)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Aprobada por / fecha          | Dayanna — 2026-10-10 (puerta G1, backend); Dayanna — 2026-10-10 (puerta G1, delta del frontend)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Capacidad                     | `auth`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Responsable                   | Dayanna                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Constitución                  | revisada contra v1.0.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Última verificación vs código | 2026-10-11 (frontend: árbol de trabajo sobre `179a83c`; lo sella el commit de Dayanna)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Código                        | `apps/backend/src/modules/auth/`, `apps/backend/src/modules/users/`, `apps/backend/src/database/`, `apps/backend/src/app.setup.ts`, `apps/backend/src/shared/exceptions/`, `packages/shared-types/src/auth/`, `packages/shared-types/src/dto/auth.dto.ts`; `apps/frontend/src/proxy.ts`, `apps/frontend/src/lib/auth/`, `apps/frontend/src/components/auth/`, `apps/frontend/src/features/auth/`, `apps/frontend/src/app/(auth)/`, `apps/frontend/src/app/(panel)/`, `apps/frontend/src/app/error.tsx`, `apps/frontend/src/config/auth.ts`, `apps/frontend/src/config/security-headers.ts`, `apps/frontend/next.config.ts` |

## Contexto y objetivo

Antes de esta capacidad, la API no tenía usuarios, sesión ni control de acceso: el único endpoint
era `GET /health`. Esta spec cubre la parte de backend de `auth` (`docs/product.md` → "Autenticación"): login con
email y contraseña, sesión en una cookie `HttpOnly`, cierre de sesión, control de acceso por rol y
el endurecimiento HTTP que exige OWASP. La parte de frontend (pantalla de login, rutas privadas en
`proxy.ts`) entra en un cambio posterior de esta misma spec: la sección "Frontend", más abajo.

### Frontend (cambio `2026-10-10-frontend-auth`)

Con el backend vigente y la base del frontend lista (spec `app-shell`), el navegador todavía no
puede iniciar sesión: no hay pantalla de login, el panel se ve sin sesión, la cabecera no muestra a
la persona ni deja cerrar sesión, y un `401` en medio del uso no tiene manejo. Este delta agrega el
login, el estado global de autenticación (Zustand), las rutas privadas y el control de la UI por
rol, con exclusión absoluta del DOM de lo que el rol no permite.

El estado del frontend se basa solo en el usuario que devuelve la API (login o `GET /api/auth/me`):
el token sigue viajando únicamente en la cookie `HttpOnly` y el frontend nunca lo ve. La UI oculta
lo que el rol no permite, pero quien decide sigue siendo la API (RF-auth-07,
RF-virtual-machines-02).

Los botones de crear, editar y eliminar VMs todavía no existen (frontend de `virtual-machines`,
cambio posterior). Este delta fija la **regla** (RF-auth-30, RF-auth-31) y entrega el **mecanismo**
que la aplica, probado por sí mismo; el frontend de `virtual-machines` lo usa en sus controles
reales.

**Discrepancias reportadas (C5):**

- El pedido dice `POST /login`; la API es `POST /api/auth/login` (decidido en la clarificación del
  backend). El navegador llega por el rewrite `/api/*`, con `credentials: 'include'`
  (RF-app-shell-14).
- `apps/frontend/.claude/rules/nextjs-patterns.md` prevé un "refresh del token en 401" dentro de
  `fetch-wrapper` y un "refresh automático" en `proxy.ts`. No hay refresh token ("Duración de la
  sesión"): la regla se corrige en este cambio.
- La spec `app-shell` dejó para este cambio el panel sin sesión y la renovación de la cookie en
  pedidos de servidor. Recibe un delta de texto en el mismo PR (C2).
- `apps/frontend/.claude/rules/forms-conventions.md` prohíbe `window.location` para navegar tras un
  formulario. El cierre de sesión y el `401` terminan a propósito con una carga completa de
  `/login` (hallazgo F3, RF-auth-26 y RF-auth-29): la regla documenta esa excepción en este cambio.

#### Análisis OWASP del frontend

Revisión del delta contra el OWASP Top 10:2025, los Cheat Sheets de OWASP (Session Management,
Authentication, Clickjacking Defense, Content Security Policy, HTTP Headers), MDN (cookies
`SameSite`, `<form>`, Broadcast Channel) y la documentación de Next 16 (guía de autenticación,
`cookies()`, CSP, caché del cliente), consultados con Context7 el 2026-10-10, y contra el código.

**Supuestos verificados:**

| Supuesto                                                           | Evidencia                                                                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El rewrite `/api/*` reenvía al navegador el `Set-Cookie` de la API | `next/dist/server/lib/router-utils/proxy-request.js` (httpxy copia las cabeceras de la respuesta); verificado de punta a punta en `app-shell` (RF-app-shell-15)     |
| La renovación de un pedido de servidor se pierde (RF-auth-27)      | Cada renovación emite un JWT nuevo con su `exp` (`jwt-auth.guard.ts`, `session-expiry.ts`); Next solo escribe cookies en Route Handlers, Server Functions o `proxy` |
| El estado de auth no puede ser global en el servidor (RF-auth-23)  | Guía de Zustand para Next.js: "No global stores"                                                                                                                    |
| Un layout no protege las páginas del panel (RF-auth-25)            | Guía de autenticación de Next 16: un layout no se vuelve a renderizar al navegar ni impide que la página aparezca en el payload RSC; `proxy` no es la única defensa |
| Verificar con `/api/auth/me` y no con el JWT en Next               | Validar el JWT en Next exigiría compartir `JWT_SECRET` (C12) y no vería una sesión revocada (RF-auth-08)                                                            |
| Las páginas privadas no quedan en la caché HTTP                    | Next manda `private, no-cache, no-store` en las páginas dinámicas (guía de self-hosting)                                                                            |
| Sin enumeración de cuentas, open redirect ni CSRF en el login      | Mismo `401` para todo (RF-auth-02); sin `?next=` (D1); `Origin` + solo JSON + `SameSite=Strict` en la API (RF-auth-01, 11, 16)                                      |

**Hallazgos:**

| #   | Categoría                       | Hallazgo                                                                                                                                                                                                                                                                                                         | Evidencia                                                                                                               | Lo resuelve                                         |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| F1  | A02 Security Misconfiguration   | Las páginas del frontend no mandan cabeceras de seguridad: se pueden enmarcar (clickjacking del formulario de login), sin `nosniff`, `Referrer-Policy` ni HSTS, y revelan `X-Powered-By: Next.js`                                                                                                                | `apps/frontend/next.config.ts` (sin `headers()` ni `poweredByHeader`); Cheat Sheets de Clickjacking y HTTP Headers      | RF-auth-34 (cabeceras estáticas, decisión F1)       |
| F2  | A07 / CWE-598                   | Un `<form>` enviado antes de que cargue el JavaScript usa `GET` por defecto: la contraseña quedaría en la URL, el historial y los logs                                                                                                                                                                           | MDN, `<form>`: el método por defecto es `get`                                                                           | RF-auth-32                                          |
| F3  | A07 (sesión)                    | Tras cerrar sesión o un `401` con navegación del cliente, Atrás puede mostrar la página privada desde la caché del router; `router.refresh()` limpia solo la ruta actual                                                                                                                                         | Glosario de Next 16: las páginas "se reutilizan en la navegación Atrás/Adelante"                                        | RF-auth-26, RF-auth-29 (carga completa)             |
| F4  | Usabilidad de `SameSite=Strict` | Quien llega desde un enlace de otro sitio no manda la cookie en esa navegación: la aplicación lo trata como sin sesión y volvería a iniciar sesión, acumulando sesiones                                                                                                                                          | MDN, CSRF › SameSite: con `Strict` "the user will not be recognized"                                                    | RF-auth-21 (verificación desde el navegador)        |
| F5  | A07 (sesión)                    | Iniciar sesión con otra cuenta en una pestaña deja a las demás mostrando el rol anterior mientras piden con la cookie nueva; un logout deja datos visibles en las demás pestañas                                                                                                                                 | —                                                                                                                       | RF-auth-33 (decisión F5)                            |
| F6  | A01 Broken Access Control       | La verificación de sesión y de rol no puede vivir solo en `proxy` ni en un layout                                                                                                                                                                                                                                | Guía de autenticación de Next 16                                                                                        | RF-auth-25, RF-auth-31                              |
| F7  | A01 / K3                        | `fetch-wrapper` hace un cast de `data` sin validar: un usuario mal formado o un rol desconocido no deben dar acceso                                                                                                                                                                                              | `apps/frontend/src/lib/api/fetch-wrapper.ts` (`payload.data as T`)                                                      | RF-auth-22, RF-auth-30 (falla cerrado)              |
| F8  | A03, A09                        | Dependencias nuevas y logs                                                                                                                                                                                                                                                                                       | —                                                                                                                       | RNF-auth-09, RNF-auth-13                            |
| F9  | A07 (sesión)                    | Una renovación hecha en un pedido de servidor, además de perderse, mueve el último uso de la sesión: durante los 5 minutos siguientes ningún pedido del navegador renueva. Con navegación activa, la cookie del navegador puede no renovarse nunca y cortarse a los 7 días. Hallado al planificar, el 2026-10-11 | `apps/backend/src/modules/auth/auth.service.ts` (`renew()` llama a `touch`), `session-expiry.ts` (`shouldRenewSession`) | RF-auth-27 (el plan: `proxy` reenvía la renovación) |

**Descartado:**

- **CSP de scripts con nonce** (decisión F1, 2026-10-10). Queda como riesgo aceptado de defensa en
  profundidad contra XSS. Lo mitigan React, que escapa todo texto, y que el único
  `dangerouslySetInnerHTML` es el script constante del tema. Costo evitado: con nonce, todas las
  páginas pasarían a ser dinámicas (guía de CSP de Next 16).
- **`Clear-Site-Data` en el logout**, que sugiere OWASP Session Management. Con `"storage"` borraría
  la preferencia de tema (RF-app-shell-06), y con `"cache"` aporta poco porque las páginas privadas
  ya son `no-store`. Además exige cambiar la API. La carga completa de F3 descarta lo que queda en
  memoria.
- **Renovar desde el navegador** (al montar, al volver a la pestaña o cada cierto tiempo) para
  RF-auth-27: por F9 no garantiza la renovación, porque los pedidos de servidor le ganan la ventana
  de 5 minutos. El plan usa `proxy`, que sí puede escribir cookies en la respuesta, y lo excluye de
  los prefetch (doc de `proxy` de Next 16): cuesta una llamada a `/api/auth/me` por página pedida
  con cookie.
- **Pasar la cookie a `SameSite=Lax`** para resolver F4: debilitaría la protección CSRF aprobada en
  RF-auth-01.

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

En el frontend, el Anónimo solo ve `/login` (y la página 404). Con sesión, el Cliente ve el panel en
modo lectura y el Administrador además los controles de escritura (RF-auth-30, RF-auth-31). El rol
sale siempre del usuario que devuelve la API.

## Requisitos funcionales (EARS)

### API (backend)

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

### Frontend

Las "páginas del panel" son las del shell de `app-shell` (hoy, el Panel en `/`). "El Panel" es la
página `/`.

**Login**

- **RF-auth-17** · estándar — La página `/login` debe ser pública y verse fuera del shell
  (RF-app-shell-01), con el tema elegido. Muestra:
  - la marca del producto;
  - los campos de correo y contraseña, cada uno con su etiqueta visible;
  - el botón "Iniciar sesión".

  Se usa sin desplazamiento horizontal desde 320 px de ancho. Cada error de campo se asocia a su
  campo, para que lo anuncien los lectores de pantalla.

- **RF-auth-18** · estándar — El formulario de login debe validar en el cliente con `LoginDTO`
  (`@vm/shared-types`), es decir, las mismas reglas que la API: correo con formato válido,
  contraseña no vacía y largos máximos. Los errores se ven junto a cada campo, en español, y no se
  envía ningún pedido mientras el formulario sea inválido.
- **RF-auth-19** · crítico (K1, K3) — CUANDO se envía un formulario de login válido, el sistema
  debe pedir `POST /api/auth/login` al mismo origen con `credentials: 'include'`, sin leer, guardar
  ni armar el token: la cookie la aplica el navegador. Con `200`, guarda en el estado de
  autenticación el `user` de la respuesta y lleva **siempre al Panel**, reemplazando la entrada del
  historial. Mientras el pedido está en curso, el botón queda deshabilitado y muestra que está
  trabajando: un doble clic envía un solo pedido.
- **RF-auth-20** · estándar — SI el login falla, ENTONCES el sistema debe mostrar un toast de error
  cuyo texto se decide por el status, no por el mensaje de la API (`forms-conventions.md`,
  pantallas de autenticación). La persona se queda en `/login` y el formulario conserva el correo,
  vacía la contraseña y le pone el foco.

  | Respuesta                 | Texto del toast                                               |
  | ------------------------- | ------------------------------------------------------------- |
  | `401`                     | `Correo o contraseña incorrectos`                             |
  | `429`                     | `Demasiados intentos. Espera un momento y vuelve a probar`    |
  | Cualquier otra, o sin red | `No se pudo iniciar sesión. Intenta de nuevo en unos minutos` |

- **RF-auth-21** · estándar — CUANDO alguien con sesión válida abre `/login`, el sistema debe
  llevarlo al Panel. Vale también cuando llega desde un enlace de otro sitio: en esa navegación el
  navegador no manda la cookie `SameSite=Strict` (hallazgo F4), así que `/login` además verifica la
  sesión con un pedido desde el navegador, que sí la manda, y si es válida lleva al Panel sin pedir
  credenciales.
- **RF-auth-32** · crítico (K1) — Las credenciales nunca deben viajar en la URL ni salir del
  navegador por otro camino que `POST /api/auth/login`. Vale también si la persona envía el
  formulario antes de que cargue el JavaScript de la página (hallazgo F2): en ese caso no se envía
  nada, o se envía sin que el correo ni la contraseña queden en la URL, el historial o los logs.

**Estado de autenticación**

- **RF-auth-22** · crítico (K1, K3) — El estado global de autenticación debe guardar solo el
  usuario de la sesión (`AuthUser`: `id`, `email`, `role`), o ninguno.
  - Solo acepta un usuario con la forma de `AuthUser` y un rol de `ROLES` (hallazgo F7). Cualquier
    otra respuesta de la API cuenta como sin sesión: falla cerrado.
  - "Está autenticado" se deriva de que haya usuario: no se guarda aparte, así que nunca contradice
    al usuario.
  - Vive solo en memoria. Ni el usuario ni el token se escriben en `localStorage`,
    `sessionStorage`, cookies legibles por JavaScript ni la URL.
  - Ofrece tres operaciones: iniciar sesión, cerrar sesión y verificar la sesión contra la API. Sus
    nombres se fijan en el plan.
- **RF-auth-23** · crítico (K1, K5) — El usuario de un pedido nunca debe aparecer en la respuesta
  de otro. En el servidor de Next, el estado de autenticación se crea para cada pedido y nunca vive
  en una variable de módulo compartida (guía oficial de Zustand para Next.js: "No global stores").
  Es K5: si se rompe, nada avisa hasta que dos personas se cruzan.

**Rutas privadas y sesión**

- **RF-auth-24** · crítico (K1, K3) — CUANDO se carga o recarga una página del panel, el sistema
  debe verificar la sesión con `GET /api/auth/me` antes de mostrar su contenido, y cargar en el
  estado de autenticación el usuario que devuelve. SI la API no responde o responde 5xx, ENTONCES
  muestra una página de error con un botón "Reintentar": nunca el contenido privado, y tampoco el
  login, porque no es un problema de credenciales.
- **RF-auth-25** · crítico (K1) — SI se pide una página del panel sin sesión válida (sin cookie, o
  con una que la API rechaza: expirada, revocada o de un usuario inactivo), ENTONCES el sistema debe
  redirigir a `/login` sin enviar nada del contenido privado, ni en el HTML ni en el payload de
  React. Vale para la carga completa y para la navegación dentro de la aplicación.
  - La verificación se hace en cada página privada, contra la API y junto a sus datos. Un chequeo
    previo (en `proxy`) puede adelantar la redirección cuando no hay cookie, pero no es la única
    defensa, y ningún layout la reemplaza (hallazgo F6).
  - Si ese chequeo previo no corre, el resultado es el mismo: la página no se renderiza sin una
    sesión verificada.
- **RF-auth-26** · crítico (K1, K4) — SI un pedido del navegador a la API responde `401` (salvo el
  del login, que es RF-auth-20, y la verificación que hace `/login` para RF-auth-21, donde un `401`
  solo significa que no hay sesión), ENTONCES el sistema debe vaciar el estado de autenticación y llevar
  a `/login` con una **carga completa de la página**. Así se descarta todo lo que quedaba en memoria,
  incluida la caché del router, y Atrás no recupera nada privado (hallazgo F3). `/login` muestra el
  aviso `Tu sesión expiró. Inicia sesión de nuevo`. Varios `401` simultáneos producen una sola
  redirección.
- **RF-auth-27** · crítico (K1, K5) — La renovación de la cookie que emite la API (RF-auth-05) debe
  llegar al navegador mientras la persona usa la aplicación. Así, con un uso al menos semanal, no
  se le pide iniciar sesión antes del límite absoluto de 30 días. Hoy los pedidos hechos desde el
  servidor de Next la pierden: cada renovación emite un token nuevo, y el `Set-Cookie` de un pedido
  de servidor nunca llega al navegador (`app-shell`, caso límite del `Set-Cookie`). Es K5: si se
  rompe, la sesión se corta a los 7 días sin aviso. Tiene verificación manual, porque cruza
  navegador, rewrite y API; si el plan aísla la lógica, también test.

**Cierre de sesión y pestañas**

- **RF-auth-28** · estándar — La cabecera del panel debe mostrar el menú de la persona, operable con
  teclado y también en pantallas angostas: su correo, su rol y la opción "Cerrar sesión".
- **RF-auth-29** · crítico (K1) — CUANDO la persona elige "Cerrar sesión", el sistema debe pedir
  `POST /api/auth/logout` y, con la respuesta, llevar a `/login` con una **carga completa de la
  página**, reemplazando la entrada del historial. Eso descarta el estado de autenticación y todo
  dato privado en memoria, y Atrás no vuelve a la página privada (hallazgo F3). `/login` muestra el
  aviso `Cerraste sesión`.

  SI el logout falla (sin red o 5xx), ENTONCES muestra un toast de error y la persona sigue en su
  página con la sesión intacta. La cookie `HttpOnly` sigue válida y solo el servidor puede
  expirarla: vaciar el estado igual haría creer que la sesión se cerró.

- **RF-auth-33** · crítico (K1) — CUANDO se inicia o se cierra sesión en una pestaña, las demás
  pestañas abiertas de la aplicación en ese navegador deben recargarse (hallazgo F5). Con la sesión
  nueva, muestran a su usuario; sin sesión, quedan en `/login`. Así ninguna pestaña sigue mostrando
  el rol ni los datos de otra cuenta. El aviso entre pestañas no lleva datos del usuario: cada una
  vuelve a verificar con la API.

**Roles en la UI**

- **RF-auth-30** · crítico (K1) — Todo control que crea, edita o elimina VMs debe existir en el DOM
  solo si el rol del usuario de la sesión es `Administrador`. Lo mismo vale para toda acción que la
  API reserva al Administrador (RF-virtual-machines-02).
  - Para un Cliente, para un rol desconocido o mientras el rol no se conoce, el control **no se
    renderiza**: no se oculta con CSS, no se deshabilita y no lleva `aria-hidden`. Tampoco aparece
    en el HTML que manda el servidor ni en el payload de React.
  - El rol sale del usuario cargado desde la API (login o `/me`), nunca de algo que la persona
    pueda editar (URL, almacenamiento del navegador).
  - La UI oculta; la API decide.
- **RF-auth-31** · crítico (K1) — SI un Cliente abre una ruta declarada solo para Administrador (hoy
  ninguna: crear y editar una VM son modales del Panel, spec `virtual-machines`), ENTONCES el sistema debe responder con la página 404 de
  `app-shell` (RF-app-shell-12), sin renderizar la página pedida. Es el mismo "no existe o no
  tienes acceso" de `dataOrNotFound`: no revela qué rutas existen. El rol se verifica en el
  servidor, en la propia página, igual que la sesión en RF-auth-25.

**Cabeceras de seguridad**

- **RF-auth-34** · crítico (K1, K5) — Toda página que sirve el frontend (incluidas `/login` y la 404) debe llevar estas cabeceras (hallazgo F1):
  - `Content-Security-Policy: frame-ancestors 'none'` y `X-Frame-Options: DENY`, para que ningún
    sitio pueda enmarcar el formulario de login;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - en producción, `Strict-Transport-Security`.

  Ninguna lleva `X-Powered-By`. La CSP de scripts queda fuera de alcance (decisión F1). Es K5: si
  falta una cabecera, nada avisa.

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
- **RNF-auth-09** — El estado de autenticación del frontend usa Zustand (pedido explícito), sin
  persistencia (`persist`). La versión y la forma de integrarlo con el App Router se consultan con
  Context7 en el plan (C11). Para las dependencias nuevas (Zustand, `react-hook-form`,
  `@hookform/resolvers`): versión exacta y `pnpm audit` sin vulnerabilidades altas ni críticas
  (A03).
- **RNF-auth-10** — `AuthUser`, `Role`, `ROLES` y `LoginDTO` se importan de `@vm/shared-types`, sin
  redefinirlos en el frontend. El estado de autenticación tiene un tipo explícito, sin `any`
  (C9, C10).
- **RNF-auth-11** — El formulario de login usa `react-hook-form` con `zodResolver(LoginDTO)`
  (`forms-conventions.md`), y sus campos declaran `autocomplete` `email` y `current-password` para
  que funcionen los gestores de contraseñas.
- **RNF-auth-12** — El delta del frontend no cambia la API ni `@vm/shared-types`, así que no hay
  compatibilidad entre apps que resolver. `pnpm typecheck`, `pnpm lint`, `pnpm build` y la guarda
  de la paleta (`palette.test.ts`) pasan. Los componentes nuevos se construyen sobre shadcn/ui con
  los tokens del proyecto, y los textos van en español.
- **RNF-auth-13** — Ni el navegador ni el servidor de Next registran (consola, logs, reportes de
  error) contraseñas, cookies ni tokens (A09). Los avisos y toasts nunca repiten lo que escribió la
  persona.

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

### Frontend

- Cookie presente pero sesión vencida o revocada: la página del panel redirige a `/login`, y
  `/login` muestra el formulario. `/login` nunca devuelve al Panel solo porque haya una cookie, así
  que no hay bucle de redirecciones (RF-auth-21, RF-auth-25).
- API caída al cargar una página del panel: página de error con "Reintentar", sin contenido
  privado y sin mandar al login (RF-auth-24).
- API caída o `429` al iniciar sesión: toast con el texto de su fila, y la persona sigue en el
  formulario (RF-auth-20).
- Doble clic en "Iniciar sesión": un solo pedido (RF-auth-19).
- Correo con mayúsculas o espacios: `LoginDTO` lo normaliza antes de enviarlo, igual que la API
  (RF-auth-18, RF-auth-13).
- Un Administrador pasa a Cliente en la base con la sesión abierta: la UI muestra el rol nuevo en
  la próxima carga. Mientras tanto, si usa un control de escritura, la API responde `403` y el toast
  muestra su mensaje (RF-auth-07, RF-auth-30).
- Usuario desactivado con la aplicación abierta: el próximo pedido recibe `401` y lleva a `/login`
  con el aviso de sesión expirada (RF-auth-26).
- Varios pedidos en curso cuando la sesión expira: una sola redirección (RF-auth-26).
- Logout en otra pestaña: esta pestaña se recarga y queda en `/login` (RF-auth-33).
- Login con otra cuenta en otra pestaña: esta pestaña se recarga y muestra la cuenta nueva, con su
  rol (RF-auth-33).
- Logout sin red: toast de error y la sesión sigue (RF-auth-29).
- "Atrás" después de cerrar sesión o de un `401`: no vuelve a mostrar la página privada, ni desde la
  caché del router (RF-auth-26, RF-auth-29).
- Enlace al panel desde un correo u otro sitio, con la sesión vigente: en esa primera navegación el
  navegador no manda la cookie (`SameSite=Strict`). La persona pasa por `/login`, que verifica la
  sesión desde el navegador y la lleva al Panel sin pedirle credenciales (RF-auth-21).
- Formulario enviado antes de que cargue el JavaScript: ni el correo ni la contraseña quedan en la
  URL (RF-auth-32).
- Contraseña de más de 128 caracteres pegada en el campo: se ve el error de campo y no se recorta
  en silencio (RF-auth-18).
- `/login` con un código de aviso desconocido o manipulado en la URL: no se muestra ningún aviso, y
  nunca se muestra texto tomado de la URL (RF-auth-26, RF-auth-29).
- Alguien intenta enmarcar `/login` en un `iframe` de otro sitio: el navegador no lo muestra
  (RF-auth-34).
- Cliente que escribe a mano la URL de una ruta solo de Administrador: página 404 (RF-auth-31).
- Un Cliente edita el estado del navegador (almacenamiento, URL) para hacerse pasar por
  Administrador: no cambia nada, porque el rol sale solo de la API (RF-auth-30). Si forzara un
  pedido de escritura, la API responde `403` (RF-virtual-machines-02).
- Navegador sin JavaScript: el login no funciona. Se acepta, como en `app-shell`: la aplicación es
  una SPA.

## Fuera de alcance

- Del frontend (cambio `2026-10-10-frontend-auth`):
  - volver tras el login a la página que se pedía (`?next=`, con su validación contra open
    redirect): se evalúa en el frontend de `virtual-machines`, cuando haya páginas a las que volver;
  - "recordarme" (la sesión ya dura 7 días sin uso y 30 de máximo) y mostrar u ocultar la
    contraseña;
  - el aviso de "sesión expirada" en las redirecciones del servidor (solo lo muestran los `401` de
    pedidos del navegador, RF-auth-26);
  - la CSP de scripts con nonce (decisión F1): riesgo aceptado, ver "Análisis OWASP del frontend";
  - `Clear-Site-Data` en el logout (descartado en el mismo análisis);
  - los controles reales de crear, editar y eliminar VMs, y sus rutas: los agrega el frontend de
    `virtual-machines`, aplicando RF-auth-30 y RF-auth-31;
  - tests E2E de navegador (`docs/testing.md`).
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

### Frontend

- **Rutas:** `/login` es pública y está fuera del shell. Las páginas del panel (hoy `/`) exigen
  sesión, y las que se declaren solo para Administrador responden `404` a un Cliente.
- **Endpoints que consume:** los tres de la tabla de arriba, sin cambios, por el rewrite `/api/*`
  y con `credentials: 'include'`.
- **Sin cambios en la API ni en `@vm/shared-types`.** El frontend usa `LoginDTO`, `AuthUser`,
  `Role` y `ROLES` tal como están.
- **Para las features:** el plan fija el nombre y las props del estado de autenticación (usuario y
  tres operaciones, RF-auth-22) y del mecanismo de RF-auth-30 y RF-auth-31. Las reglas del frontend
  (`apps/frontend/CLAUDE.md`, `.claude/rules/`) los documentan.
- **Avisos de `/login`:** la URL lleva a lo sumo un código de una lista cerrada (sus nombres, en el
  plan). `/login` muestra el texto fijo de ese código y nunca texto tomado de la URL; un código
  desconocido no muestra nada.
- **Textos propios del frontend** (los de los errores del login están en RF-auth-20):

  | Cuándo                           | Dónde             | Texto                                                 |
  | -------------------------------- | ----------------- | ----------------------------------------------------- |
  | `401` en un pedido del navegador | Aviso en `/login` | `Tu sesión expiró. Inicia sesión de nuevo`            |
  | Cierre de sesión correcto        | Aviso en `/login` | `Cerraste sesión`                                     |
  | El logout falla                  | Toast             | Lo fija el plan, escrito para el usuario (RF-auth-29) |

- **Cabeceras de toda página del frontend:** las de RF-auth-34. Las respuestas de `/api/*` siguen
  llevando las de la API (RF-auth-10).
- **Mensaje entre pestañas** (RF-auth-33): solo dice que la sesión cambió. No lleva el usuario, el
  rol ni el token.

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

### Delta del frontend (revisado contra v1.0.0)

| ID  | Aplica | Cómo se cumple                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Todo el comportamiento del frontend de `auth` está en RF-auth-17…34 antes de implementarse                                                                                                                                                                                                                                                                                                                                |
| C2  | Sí     | Este delta y el de `app-shell` van antes que el código, en el mismo PR                                                                                                                                                                                                                                                                                                                                                    |
| C3  | Sí     | G1 sobre este delta; G2 sobre `changes/2026-10-10-frontend-auth/plan.md` y `tasks.md` antes de tocar `apps/`                                                                                                                                                                                                                                                                                                              |
| C4  | Sí     | Tamaño, alcance de los roles, D1–D3 y las decisiones F1, F3 y F5 del análisis OWASP, resueltos con la persona (2026-10-10); no queda ningún `[NECESITA ACLARACIÓN]`                                                                                                                                                                                                                                                       |
| C5  | Sí     | Cuatro discrepancias reportadas en "Contexto › Frontend": ruta del login, refresh token en `nextjs-patterns.md`, pendientes de `app-shell`, excepción a `window.location` en `forms-conventions.md`                                                                                                                                                                                                                       |
| C6  | Sí     | RF-auth-19, 22–27 y 29–34 son Críticos (K1, K3–K5): test con su ID; RF-auth-27 además, verificación manual. RF-auth-17, 18, 20, 21 y 28 son Estándar y se comprueban en G4                                                                                                                                                                                                                                                |
| C7  | No     | Sin cambios en el backend                                                                                                                                                                                                                                                                                                                                                                                                 |
| C8  | Sí     | "Análisis OWASP del frontend" (F1–F8). `LoginDTO` en el cliente es solo UX: la API sigue validando en el borde (RF-auth-03). Credenciales nunca en la URL (RF-auth-32); ningún token en el navegador (RF-auth-22); falla cerrado ante datos inesperados (RF-auth-22, 30); verificación en cada página, no solo en `proxy` (RF-auth-25, 31); cabeceras contra clickjacking (RF-auth-34). A01: la UI oculta y la API decide |
| C9  | Sí     | Tipos explícitos sin `any`, funciones < 50 líneas (RNF-auth-10)                                                                                                                                                                                                                                                                                                                                                           |
| C10 | Sí     | `LoginDTO`, `AuthUser`, `Role` y `ROLES` de `@vm/shared-types`, sin redefinirlos ni importar entre apps (RNF-auth-10)                                                                                                                                                                                                                                                                                                     |
| C11 | Sí     | Consultados con Context7 para esta spec: Zustand (guía de Next.js), Next 16 (autenticación, `cookies()`, CSP, caché del cliente, `poweredByHeader`), OWASP Cheat Sheets y MDN. El plan consulta además `react-hook-form` y `@hookform/resolvers`                                                                                                                                                                          |
| C12 | No     | Sin secretos ni variables de entorno nuevas                                                                                                                                                                                                                                                                                                                                                                               |

Sin excepciones.

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

### Frontend

Con `pnpm dev`, la API real, `COOKIE_SECURE=false` y los usuarios de `db:seed`:

- **RF-auth-27, la renovación llega al navegador.** Iniciar sesión y anotar el vencimiento de la
  cookie `vm_session` (DevTools → Application → Cookies). Pasados más de 5 minutos, usar la
  aplicación como lo haría la persona (recargar el Panel y navegar). Alguna respuesta que recibe el
  navegador trae `Set-Cookie` de `vm_session`, y el vencimiento de la cookie avanza.
- **RF-auth-19 y RF-auth-22, de punta a punta.** Tras iniciar sesión, en la consola del navegador:
  `document.cookie` no muestra la sesión, y `localStorage` y `sessionStorage` no tienen ni el
  usuario ni el token.
- **RF-auth-25, sin contenido privado.** `curl -i http://localhost:3000/` sin cookie responde una
  redirección a `/login`, y el cuerpo no trae nada del Panel. Con una cookie inventada, lo mismo: la
  redirección puede llegar como `307` o, si la ruta transmite en streaming, como `200` con
  `<meta http-equiv="refresh">`, pero sin contenido privado.
- **RF-auth-26 y RF-auth-29, Atrás no recupera nada.** Navegar del Panel a otra página del panel y
  cerrar sesión. Con Atrás y Adelante, el navegador nunca muestra contenido privado: termina en
  `/login`.
- **RF-auth-21, entrada desde otro sitio.** Con la sesión iniciada, abrir `http://localhost:3000/`
  desde un enlace en una página de otro origen (p. ej. un archivo HTML local). La aplicación lleva
  al Panel sin pedir credenciales.
- **RF-auth-34, cabeceras.** `curl -I http://localhost:3000/login` y `curl -I` de `/` y de una ruta
  inexistente: llevan las cabeceras de RF-auth-34 y no llevan `X-Powered-By`. La HSTS se verifica
  con `pnpm build` y `pnpm start` en modo producción.

## Dudas abiertas

Ninguna. Resueltas en la clarificación del 2026-10-10: rutas `/api/auth/*`; sesión de 7 días por
inactividad y 30 de máximo; 5 intentos por minuto por IP y por email; verificación de `Origin`; `COOKIE_SECURE`;
seed por script.

Frontend, resueltas en la clarificación del 2026-10-10:

- **Tamaño:** L, porque toca `auth` y `app-shell`, suma una dependencia y `proxy.ts`, y hay
  decisiones de arquitectura que piden un plan.
- **Roles:** este cambio entrega la regla y el mecanismo, probados por sí mismos. Los controles
  reales llegan con el frontend de `virtual-machines` (RF-auth-30, RF-auth-31).
- **D1, destino tras el login:** siempre el Panel (RF-auth-19). Volver a la página pedida queda
  fuera de alcance.
- **D2, Cliente en una ruta de Administrador:** la página 404 (RF-auth-31).
- **D3, logout que falla:** avisar y conservar la sesión (RF-auth-29).

Tras el análisis OWASP del frontend (2026-10-10), pedido en la primera presentación de G1:

- **F1, cabeceras:** solo cabeceras estáticas, sin CSP de scripts (RF-auth-34; la CSP con nonce
  queda fuera de alcance como riesgo aceptado).
- **F3, salida de la sesión:** carga completa de `/login` tras el logout o un `401`, con el aviso
  en `/login` (RF-auth-26, RF-auth-29).
- **F5, pestañas:** las demás pestañas se recargan al iniciar o cerrar sesión (RF-auth-33).

## Historial

| Fecha      | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | PR  | Requisitos                     | Aprobó                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------------------------------ | ------------------------ |
| 2026-10-10 | Creación: backend de `auth` (login, sesión deslizante, RBAC, endurecimiento OWASP)                                                                                                                                                                                                                                                                                                                                                                                                               | —   | RF-auth-01…15, RNF-auth-01…08  | Dayanna (G1)             |
| 2026-10-10 | Delta en el plan: RF-auth-04 también por cuenta y con IP solo de proxy de confianza (hallazgo H4)                                                                                                                                                                                                                                                                                                                                                                                                | —   | RF-auth-04                     | Dayanna (G1, 2026-10-10) |
| 2026-10-10 | Delta tras la revisión local: RF-auth-16 (cuerpos ilegibles), requisito de despliegue de RF-auth-04, seed bloqueado en producción, renovación cada 5 min (RF-auth-05), logout público                                                                                                                                                                                                                                                                                                            | —   | RF-auth-04, 05, 06, 10, 15, 16 | Dayanna (G1, 2026-10-10) |
| 2026-10-10 | Validación (G4): implementado y verificado. RF-auth-02, paridad de tiempos manual: medianas de 60 y 61 ms (2,4 %), con 5+5 intentos en lugar de 10+10 porque el límite por email corta en 5                                                                                                                                                                                                                                                                                                      | —   | RF-auth-01…16                  | Dayanna (G4)             |
| 2026-10-10 | Correcciones de redacción, sin cambio de RF: campo Código, análisis en pasado, códigos y errores de los contratos, verificaciones manuales ejecutables, tabla de constitución, endurecimiento no aplicado en fuera de alcance                                                                                                                                                                                                                                                                    | —   | —                              | Dayanna                  |
| 2026-10-10 | Delta: frontend de `auth` (login, estado global con Zustand, rutas privadas, manejo del `401`, renovación de la cookie, cerrar sesión, sincronización entre pestañas, roles en la UI, cabeceras de seguridad) con su análisis OWASP                                                                                                                                                                                                                                                              | —   | RF-auth-17…34, RNF-auth-09…13  | Dayanna (G1, 2026-10-10) |
| 2026-10-11 | Delta tras el plan: hallazgo F9 (la renovación de un pedido de servidor le gana la ventana al navegador); RF-auth-27 se resuelve con `proxy` y sale de "Descartado" la verificación desde el navegador; RF-auth-26 exceptúa la verificación de `/login`                                                                                                                                                                                                                                          | —   | RF-auth-26, 27                 | Dayanna (G1, 2026-10-11) |
| 2026-10-11 | Validación (G4) del frontend: implementado y verificado. 13 RF Críticos con test (69/69 en Vitest, Node de Windows y Linux); verificaciones manuales hechas con la API real y Chrome (RF-auth-27 con `curl`: `Set-Cookie` reenviado por `proxy` tras 5,5 min). Revisión local (code-reviewer, frontend-reviewer, security-auditor): 5 hallazgos corregidos (incluido el tiempo máximo de `serverFetch`, con la reescritura aprobada de una aserción de RF-app-shell-15) y 1 observación aceptada | —   | RF-auth-17…34                  | Dayanna (G4)             |
| 2026-10-11 | Delta de texto por el cambio `2026-10-11-frontend-vms`: crear y editar una VM son modales del Panel, así que hoy no hay rutas solo de Administrador (RF-31). Sin RF nuevos ni retirados                                                                                                                                                                                                                                                                                                          | —   | RF-auth-31                     | Dayanna (G1, 2026-10-11) |
