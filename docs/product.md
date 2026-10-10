# Producto: gestor de máquinas virtuales

Visión y alcance del producto. Es la entrada de toda spec: cada capacidad de la tabla final se
especifica en `docs/specs/<slug>/spec.md` con el flujo SDD (`docs/sdd/README.md`). Este archivo dice
**qué** se quiere; las specs lo convierten en RF con criticidad y los planes deciden el **cómo**.
Lo que todavía no está decidido va marcado con `[NECESITA ACLARACIÓN]` (C4) y se resuelve en la
spec o en el plan, no antes.

## Qué es

Una **Single Page Application** pulida y responsiva para gestionar máquinas virtuales (VMs), con una
**API REST** de soporte. El frontend es el protagonista: arquitectura de componentes, manejo de
estado global y fidelidad visual. La API pone el foco en la seguridad y las buenas prácticas.

## Roles

| Rol               | Puede                                      | En la UI                                                                        |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| **Administrador** | Ver, crear, editar y eliminar VMs          | Ve todo                                                                         |
| **Cliente**       | Solo ver (listado, dashboard, tiempo real) | Los botones de crear, editar y eliminar se **ocultan**, no solo se deshabilitan |

La UI oculta, pero quien decide es la API: un Cliente que llame a un endpoint de escritura recibe
un error de autorización.

## Frontend

### Rutas

| Ruta                     | Acceso  | Qué hace                                                                                                   |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------- |
| Login                    | Pública | Email y contraseña                                                                                         |
| Dashboard                | Privada | Resumen y panel de recursos; acciones según el rol                                                         |
| Listado de VMs           | Privada | Todas las VMs                                                                                              |
| Creación / edición de VM | Privada | Formulario con validación en tiempo real (p. ej., RAM no negativa, formato del nombre); solo Administrador |

### Requisitos de UI/UX

- **Estética moderna:** dashboard de aspecto premium, tendencias de diseño limpias y **dark mode**
  nativo.
- **Optimistic UI:** al crear, actualizar o eliminar una VM la interfaz reacciona al instante,
  mientras la petición se resuelve, y **revierte el cambio** si la API falla.
- **Visualización de datos:** un panel con gráficos del uso total de recursos asignados: suma de
  cores, RAM y disco de todas las VMs **activas**.
- **Feedback visual:** skeletons durante la carga, toasts de éxito y error, y estados vacíos.

### Identidad visual

La UI usa **solo** esta paleta (tokens:
`apps/frontend/src/app/theme.css`). Tailwind no tiene otros colores.

| Color           | Valor     | Rol                                                                 |
| --------------- | --------- | ------------------------------------------------------------------- |
| **Azul**        | `#003cde` | Principal: botones, enlaces, foco, selección (`primary`)            |
| **Cian**        | `#00e0ff` | Acento: gráficos, resaltado de cambios en tiempo real (`secondary`) |
| **Azul marino** | `#11153d` | Base del dark mode y titulares (`navy`)                             |
| **Blanco**      | `#ffffff` | Fondo del modo claro, texto del modo oscuro                         |
| **Negro**       | `#000000` | Negro puro, para overlays                                           |

Además, grises neutros para fondos y bordes, y verde, ámbar y rojo para estados. El **dark mode** es
azul marino profundo y sigue la preferencia del sistema. El gradiente de marca es azul → cian.

### Tiempo real

Con WebSockets o Socket.io: si un Administrador cambia el estado de una VM (p. ej., de "Apagada" a
"Encendida"), su tarjeta se actualiza al instante en la pantalla de **todos los clientes
conectados**, con una animación leve que resalte el cambio.

## API

### Autenticación

- **Login** valida email y contraseña y **establece el JWT en una cookie `HttpOnly`, `Secure` y
  `SameSite`**. Responde solo con la información del usuario y su rol.
- El token **nunca** viaja en el body ni se guarda en `localStorage`. El frontend hace sus
  peticiones sabiendo que la cookie viaja sola.
- Contraseñas con Argon2id (C8).

### VMs

Todos los endpoints exigen sesión (guard de JWT). Una VM tiene `name`, `cores`, `ram`, `disk`, `os`
y `status`.

| Operación         | Roles                  |
| ----------------- | ---------------------- |
| Crear VM          | Administrador          |
| Listar VMs        | Administrador, Cliente |
| Actualizar una VM | Administrador          |
| Eliminar una VM   | Administrador          |

Rutas según la convención del repo (`@Controller('api/<recurso>')`): las de autenticación están
decididas en `docs/specs/auth/spec.md` (`/api/auth/login`, `/logout`, `/me`); las de VMs
(`GET|POST /api/vms`, `PUT|DELETE /api/vms/:id`), en `docs/specs/virtual-machines/spec.md`.

## Documentación que el README debe tener

- **Guía de despliegue local:** paso a paso para levantar el proyecto desde cero.
- **Credenciales de prueba:** al menos un Administrador y un Cliente preconfigurados, o un script de
  seed.
- **Diagrama base:** la interacción entre el cliente, la API y el servicio de tiempo real.
- **Decisiones de arquitectura:** por qué estas tecnologías y cómo se estructuran las carpetas del
  frontend.
- **Bitácora de IA:** qué herramientas de IA se usaron; qué se delegó y dónde hubo que intervenir;
  1 o 2 prompts clave que resolvieron un problema complejo (p. ej., WebSockets o el diseño de los
  componentes).

## Decisiones abiertas

Se resuelven en la spec o el plan de la capacidad que las necesite. No se instala nada antes.

| Tema                           | `[NECESITA ACLARACIÓN]`                                                                                   | Capacidad            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------- |
| ~~Persistencia~~               | Resuelta: PostgreSQL + TypeORM; usuarios de prueba por `db:seed` (spec `auth`)                            | `auth`               |
| Estado de servidor             | Librería para caché, optimistic UI y reversión (p. ej., TanStack Query)                                   | `virtual-machines`   |
| Gráficos                       | Recharts o Chart.js                                                                                       | `resource-dashboard` |
| Tiempo real                    | `@nestjs/websockets` + Socket.io; cómo se autentica el socket con la cookie                               | `realtime-vm-status` |
| Toggle de tema                 | La paleta y el dark mode están definidos; ¿además un toggle manual persistido?                            | transversal (UI)     |
| ~~Valores de `os` y `status`~~ | Resuelta: catálogo cerrado de `os` en `@vm/shared-types`; sin reglas por estado (spec `virtual-machines`) | `virtual-machines`   |
| ~~Listado~~                    | Resuelta: lista completa, sin paginar (spec `virtual-machines`)                                           | `virtual-machines`   |
| ~~Sesión~~                     | Resuelta (spec `auth`): 7 días sin uso / 30 desde el login, logout que revoca, sin refresh                | `auth`               |

## Capacidades previstas

Cada una es un cambio L con su spec. El orden sugerido sigue las dependencias.

| Orden | Slug                 | Alcance                                                                 |
| ----- | -------------------- | ----------------------------------------------------------------------- |
| 1     | `auth`               | Login, cookie de sesión, guards de JWT y de rol, rutas privadas, logout |
| 2     | `virtual-machines`   | CRUD de VMs, listado, formulario, optimistic UI, permisos por rol       |
| 3     | `resource-dashboard` | Panel de recursos asignados de las VMs activas                          |
| 4     | `realtime-vm-status` | Difusión de cambios de estado a todos los clientes conectados           |
