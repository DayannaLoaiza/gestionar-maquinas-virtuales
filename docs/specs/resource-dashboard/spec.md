# Especificación — Panel de recursos

| Campo                         | Valor                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Estado                        | vigente                                                                                                                          |
| Aprobada por / fecha          | Dayanna — 2026-10-11 (puerta G1)                                                                                                 |
| Capacidad                     | `resource-dashboard`                                                                                                             |
| Responsable                   | Dayanna                                                                                                                          |
| Constitución                  | revisada contra v1.0.0                                                                                                           |
| Última verificación vs código | 2026-10-11 (frontend: árbol de trabajo sobre `179a83c`; lo sella el commit de Dayanna)                                           |
| Código                        | `apps/frontend/src/features/resource-dashboard/`, `apps/frontend/src/lib/resource-dashboard/`, `apps/frontend/src/lib/format.ts` |

## Contexto y objetivo

`docs/product.md` → "Visualización de datos": un panel con gráficos del **uso total de recursos
asignados**, es decir, la suma de cores, RAM y disco de todas las VMs **activas**. Hoy el Panel
(`/`) muestra un estado vacío que anuncia ese resumen (RF-app-shell-11).

Esta capacidad nace en el cambio `2026-10-11-frontend-vms` (plan y tareas en
`docs/specs/virtual-machines/changes/2026-10-11-frontend-vms/`), junto con el frontend de
`virtual-machines` y el de `realtime-vm-status`. El panel vive en el Panel (`/`), **encima del
listado de VMs** (DF1). No pide datos propios: se calcula sobre el mismo listado que se ve en
pantalla (RF-virtual-machines-13), así que refleja al instante lo que cambia en ese listado
(creaciones y cambios optimistas, reversiones, eventos en tiempo real, nuevas cargas).

"VM activa" es una VM cuyo `status` es `Encendida` (`VM_STATUSES.ON`, `@vm/shared-types`). Una VM
recién creada o editada cuenta según el estado que se ve en pantalla, aunque el servidor todavía no
lo haya confirmado: si el cambio falla y se revierte, el panel también vuelve atrás. Una VM con una
eliminación pendiente ya no se ve, así que no cuenta.

Resuelve la decisión abierta "Gráficos" de `docs/product.md`: Recharts, por pedido explícito.

**Forma (DF3).** Tres indicadores con los totales y dos gráficos: uno que pone los tres recursos en
un mismo eje (qué parte de lo asignado está en VMs encendidas) y otro que muestra qué VMs encendidas
aportan cada recurso. Las tres unidades (cores, GB de RAM, GB de disco) no comparten escala: el
primer gráfico usa porcentajes y el segundo es un gráfico chico por recurso, nunca un gráfico con
dos ejes.

## Actores y permisos

Roles de `ROLES` (`@vm/shared-types`, spec `auth`). El panel es de solo lectura y es igual para los
dos roles: el Cliente ve los mismos totales que el Administrador (todo usuario ve todas las VMs,
spec `virtual-machines`).

## Requisitos funcionales (EARS)

**Cálculo**

- **RF-resource-dashboard-01** · crítico (K4) — El sistema debe calcular, sobre las VMs que se ven
  en el listado:
  - los totales de las **activas**: suma de `cores`, suma de `ram` (GB) y suma de `disk` (GB);
  - para cada recurso, el total asignado a **todas** las VMs (activas o no);
  - la cantidad de VMs activas y la cantidad total.

  Una VM `Apagada` no suma en los totales de activas. Sin VMs, o sin ninguna activa, los totales
  de activas valen `0`.

- **RF-resource-dashboard-02** · crítico (K4) — Para cada recurso, el sistema debe ordenar las VMs
  activas por su valor en ese recurso, de mayor a menor; a igual valor, por nombre en orden
  alfabético sin distinguir mayúsculas. Con 6 VMs activas o menos, se muestran todas. Con más, las
  5 primeras y una fila `Otras (n)` con la suma de las demás y cuántas son. La suma de las filas es
  siempre el total de activas de RF-resource-dashboard-01.

**Presentación**

- **RF-resource-dashboard-03** · estándar — El panel debe mostrar los tres totales de
  RF-resource-dashboard-01 como indicadores: el valor, su unidad (`cores`, `GB`) y una línea con
  cuánto hay asignado en total (`de 32 asignados`) y en cuántas VMs encendidas, de cuántas.
- **RF-resource-dashboard-04** · estándar — El panel debe mostrar un gráfico de barras horizontales
  apiladas al 100 %, hecho con Recharts: una barra por recurso (Cores, RAM y Disco) y dos
  segmentos, **Encendidas** (color de acento) y **Apagadas** (gris), cada uno como porcentaje del
  total asignado a ese recurso. El tooltip de cada segmento muestra el valor absoluto con su unidad
  y el porcentaje. Tiene leyenda y título.
- **RF-resource-dashboard-05** · estándar — El panel debe mostrar, debajo, un gráfico chico de
  barras horizontales por recurso, hecho con Recharts, con el aporte de cada VM activa en el orden
  de RF-resource-dashboard-02: una barra por VM, con su nombre y su valor, y la fila `Otras (n)`
  cuando corresponde, en gris. Todas las barras de un mismo gráfico usan un solo color: el color no
  identifica a la VM, lo hace su nombre.
- **RF-resource-dashboard-06** · estándar — CUANDO cambia el listado de VMs que se ve en pantalla
  (una creación, edición, cambio de estado o eliminación optimista, su reversión, un evento de
  tiempo real o una nueva carga del listado), el panel debe mostrar los totales y los gráficos
  recalculados sin recargar la página ni pedir nada a la API.
- **RF-resource-dashboard-07** · estándar — El panel debe mostrar estos estados:
  - **Cargando:** el skeleton de gráfico (`ChartSkeleton`, RF-app-shell-08) mientras carga el
    listado o el código de los gráficos.
  - **Sin VMs:** un solo estado vacío (RF-app-shell-10) en lugar de los indicadores y los gráficos,
    que explica que el resumen aparece cuando haya máquinas virtuales.
  - **Ninguna VM encendida:** los indicadores en `0` y el texto `Ninguna máquina virtual está
encendida`. El gráfico al 100 % muestra todo lo asignado como apagado; en lugar de los gráficos
    de aporte se ve ese mismo texto.
  - **Error al cargar el listado:** el mismo estado de error del listado
    (RF-virtual-machines-15), sin totales parciales.
- **RF-resource-dashboard-08** · estándar — Los números se muestran con el formato de `es`
  (separador de miles), en GB para RAM y disco, sin convertir a TB. Los totales no llevan
  decimales; los porcentajes se redondean al entero, y un segmento que no es 0 nunca se muestra
  como `0 %` (se muestra `< 1 %`).
- **RF-resource-dashboard-09** · estándar — El panel debe ser accesible:
  - los totales están en texto, no solo dentro de un gráfico;
  - cada gráfico tiene un título y una descripción accesibles, y se puede recorrer con el teclado
    (capa de accesibilidad de Recharts 3, activa por defecto);
  - los datos de cada gráfico también están disponibles como tabla para lectores de pantalla;
  - el color nunca va solo: cada serie tiene su nombre en la leyenda o en la etiqueta, y en el
    tooltip;
  - se ve bien en los dos temas, desde 320 px de ancho y sin desplazamiento horizontal; un nombre
    de VM largo se corta con `…` y se lee completo en el tooltip;
  - la animación de las barras respeta `prefers-reduced-motion`.

## Requisitos no funcionales

- **RNF-resource-dashboard-01** — Gráficos con Recharts (pedido explícito; versión exacta en el
  plan). Solo colores de la paleta (`theme.css`) como `var(--color-…)`: la guarda
  `palette.test.ts` sigue en verde. La paleta de los gráficos se valida para daltonismo y contraste
  en los dos temas.
- **RNF-resource-dashboard-02** — Los gráficos se dibujan solo en el navegador y su código no
  bloquea el primer pintado del Panel: mientras carga, se ve el skeleton (RF-resource-dashboard-07).
- **RNF-resource-dashboard-03** — Tipado estricto (sin `any`) sobre `VirtualMachine` de
  `@vm/shared-types`; el cálculo (RF-01 y RF-02) es una función pura, separada de los componentes;
  funciones de menos de 50 líneas; `pnpm lint`, `pnpm typecheck` y `pnpm build` sin errores.

## Casos límite

- Diez VMs, ninguna encendida: indicadores en `0`, texto `Ninguna máquina virtual está encendida`;
  el gráfico al 100 % muestra los tres recursos como 100 % apagados (RF-resource-dashboard-07).
- Todas encendidas: los tres recursos al 100 % encendidos; no se dibuja un segmento vacío de
  apagadas (RF-resource-dashboard-04).
- Una VM de 1 GB de disco encendida entre 3.000 GB apagados: el segmento se ve como `< 1 %`, no
  `0 %` (RF-resource-dashboard-08).
- Ocho VMs encendidas: cada gráfico de aporte muestra 5 VMs y `Otras (3)`; con seis, las seis y sin
  `Otras` (RF-resource-dashboard-02).
- Dos VMs con 8 cores, `web-02` y `api-01`: `api-01` va primero (RF-resource-dashboard-02).
- El Administrador enciende una VM de 4 cores: el total de cores sube 4 al instante; si el `PUT`
  falla, vuelve a bajar al revertirse (RF-resource-dashboard-06, RF-virtual-machines-22).
- Otro Administrador apaga una VM: el evento llega y el total baja en todas las pantallas abiertas
  (RF-resource-dashboard-06, RF-realtime-vm-status-12).
- Totales grandes (100 VMs de 64 TB de disco): `6.553.600 GB`, sin desbordar el indicador en 320 px
  (RF-resource-dashboard-08).
- Una creación optimista de una VM `Encendida` suma desde que aparece en el listado y deja de sumar
  si la creación falla (RF-resource-dashboard-01, RF-virtual-machines-21).

## Fuera de alcance

- Consumo real (uso de CPU, memoria o disco medido): las VMs son registros; el panel muestra lo
  **asignado**.
- Históricos y tendencias en el tiempo.
- Filtros (por sistema operativo, por estado), elegir el recurso o el tipo de gráfico, y exportar
  datos.
- Un endpoint de totales en la API: el cálculo es del cliente, sobre el listado completo (spec
  `virtual-machines`: lista completa, sin paginar).
- Límites o cuotas de recursos.

## Contratos visibles

- Sin endpoints nuevos ni cambios en la API: usa `GET /api/vms` (RF-virtual-machines-01).
- Sin cambios en `@vm/shared-types`: usa `VirtualMachine` y `VM_STATUSES`.
- Ubicación: el Panel (`/`), encima del listado de VMs (DF1). Sin rutas nuevas.

## Verificación contra la constitución

| ID  | Aplica | Cómo se cumple                                                                                                                                  |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Todo el comportamiento del panel está en esta spec antes de implementarse                                                                       |
| C2  | Sí     | Spec antes que código, en el mismo PR                                                                                                           |
| C3  | Sí     | G1 sobre esta spec (junto con los deltas de `virtual-machines` y `realtime-vm-status`); G2 antes del código                                     |
| C4  | Sí     | DF1 y DF3 se resolvieron en la clarificación (2026-10-11)                                                                                       |
| C5  | Sí     | RF-app-shell-11 dice que el Panel muestra un estado vacío "hasta que la complete `resource-dashboard`": recibe un delta de texto en el mismo PR |
| C6  | Sí     | RF-01 y RF-02 son Críticos (K4): test unitario con su ID. Los demás son Estándar y se comprueban en G4                                          |
| C7  | No     | Sin cambios en el backend                                                                                                                       |
| C8  | Sí     | Sin entradas nuevas: el panel lee el listado ya recibido. Nombres de VM como texto (React escapa; hallazgo V7 de `virtual-machines`)            |
| C9  | Sí     | RNF-resource-dashboard-03                                                                                                                       |
| C10 | No     | Nada nuevo se comparte con el backend                                                                                                           |
| C11 | Sí     | Recharts 3 consultado con Context7 (capa de accesibilidad por defecto, `responsive`); el plan fija la versión                                   |
| C12 | No     | Sin secretos ni variables de entorno nuevas                                                                                                     |

Sin excepciones.

## Verificación manual

Ninguna: los RF Críticos (RF-01 y RF-02) son lógica pura con test.

## Dudas abiertas

Ninguna. Resueltas en la clarificación del 2026-10-11 (IDs comunes al cambio, en la spec
`virtual-machines`):

- **DF1.** El panel vive en el Panel (`/`), encima del listado de VMs.
- **DF3.** Indicadores, gráfico al 100 % por recurso y gráficos de aporte por VM.

## Historial

| Fecha      | Cambio                                                                                                                                                                                | PR  | Requisitos                                                | Aprobó       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------- | ------------ |
| 2026-10-11 | Creación: panel de recursos de las VMs encendidas (indicadores, gráfico al 100 % por recurso y aporte por VM, con Recharts), calculado sobre el listado que se ve                     | —   | RF-resource-dashboard-01…09, RNF-resource-dashboard-01…03 | Dayanna (G1) |
| 2026-10-11 | Validación (G4): implementado y verificado. RF-01 y RF-02 con test; Estándar comprobados en Chrome (claro, oscuro, 320 px, movimiento reducido). Recharts en un chunk diferido aparte | —   | RF-resource-dashboard-01…09                               | Dayanna (G4) |
