# Plan — Frontend de VMs, panel de recursos y tiempo real (`2026-10-11-frontend-vms`)

Specs: `docs/specs/virtual-machines/spec.md`, `docs/specs/resource-dashboard/spec.md`,
`docs/specs/realtime-vm-status/spec.md` · Añade: RF-virtual-machines-13…27, RNF-virtual-machines-07…09;
RF-resource-dashboard-01…09, RNF-resource-dashboard-01…03; RF-realtime-vm-status-11…16,
RNF-realtime-vm-status-06…07 · Modifica: RF-app-shell-11 y RF-auth-31 (texto, aprobado en G1) ·
Retira: — · Constitución: v1.0.0

## Chequeo de constitución (puerta: antes de diseñar; se revisa en G2)

| ID  | Aplica | Cómo se cumple                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sí     | Solo se implementa lo de las tres specs aprobadas en G1 (2026-10-11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| C2  | Sí     | Las specs ya están escritas y aprobadas. Si algo las cambia durante la implementación, me detengo y vuelvo a G1 por ese delta                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| C3  | Sí     | No se toca `apps/` ni `packages/` hasta el "apruebo" de G2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| C4  | Sí     | Sin dudas abiertas. Las decisiones técnicas (D1–D12) quedan en este plan y se aprueban en G2                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| C5  | Sí     | Se corrigen en T10 las reglas que este cambio contradice: `forms-conventions.md` (modo `onBlur`, confirmar tras la respuesta), `shadcn-ux-guide.md` (ruta propia desde 4 campos), `shared-types.md` ("solo la sesión se valida en el cliente"), `component-imports.md` (primitivos nuevos) y `nextjs-patterns.md` (estado del servidor)                                                                                                                                                                                                                             |
| C6  | Sí     | Un test por RF Crítico como mínimo (16 RF Críticos), según la tabla de "Pruebas por requisito"; RF-realtime-vm-status-11 y 15 además con verificación manual en el navegador. Ningún test para un RF Estándar. No se retira ni se reescribe ningún test                                                                                                                                                                                                                                                                                                             |
| C7  | No     | Sin cambios en el backend                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| C8  | Sí     | Ver "Seguridad y permisos": schemas de `@vm/shared-types` en el formulario, guarda de forma sobre cada evento, controles por rol fuera del DOM, nombres como texto                                                                                                                                                                                                                                                                                                                                                                                                  |
| C9  | Sí     | Sin `any`; funciones < 50 líneas; la lógica (versiones, cambios pendientes, formulario, totales, conexión) en funciones puras de `src/lib/` y `src/schemas/`, separada de los componentes; `'use client'` solo en proveedores, hooks y componentes interactivos                                                                                                                                                                                                                                                                                                     |
| C10 | Sí     | `VirtualMachine`, `CreateVirtualMachineDTO`, `UpdateVirtualMachineDTO`, `VmName`, `VM_LIMITS`, `VM_OPERATING_SYSTEMS`, `VM_STATUSES`, `REALTIME_CLIENT_OPTIONS`, `REALTIME_EVENTS` y los mapas de eventos de `@vm/shared-types`, sin redefinirlos. `@vm/shared-types` no cambia. Sin imports entre apps                                                                                                                                                                                                                                                             |
| C11 | Sí     | Consultados el 2026-10-11 con Context7: TanStack Query v5 (optimistic updates por la interfaz, `useMutationState`, `structuralSharing` como función, `cancelRefetch`, `focusManager`, guía de SSR avanzado con App Router), `@hookform/resolvers` (Zod con transformaciones), React Hook Form (`mode`, `isValid`, `setError`), Socket.io v4 cliente (`connect_error`, `disconnect`, `socket.active`) y Recharts 3 (accesibilidad, `responsive`); los docs de `next` 16.4 en `node_modules/next/dist/docs/` (`lazy-loading.md`); npm (versiones, fechas y peer deps) |
| C12 | No     | Sin secretos ni variables de entorno nuevas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Sin excepciones técnicas.

## Enfoque

### Arquitectura

```text
Servidor de Next                                  Navegador (una pestaña)
────────────────                                  ───────────────────────
(panel)/layout.tsx  requireUser()                 QueryProvider (un QueryClient por pestaña)
  AuthProvider ─ QueryProvider ─ RealtimeProvider   └─ caché ['vms']: versiones CONFIRMADAS
(panel)/page.tsx    requireUser()                       ▲ GET (carga, foco, conexión, tras mutar)
  <Suspense fallback=skeletons>                         ▲ respuesta de POST / PUT / DELETE
    VmsPrefetch (async): serverFetchResult              ▲ vm:status-changed (si es más nueva)
      ('/api/vms') → HydrationBoundary ──────────▶ │
        VmDashboard ◀── useVisibleVms() = confirmadas + mutaciones PENDIENTES (useMutationState)
          ├─ ResourcePanel  (totales y gráficos: Recharts diferido)
          └─ VmGrid → VmCard (interruptor, Editar, Eliminar: dentro de AdminOnly)
  VmDialogs (modales: crear, editar, eliminar; store de diálogos por proveedor)

RealtimeProvider ── socket.io-client (mismo origen, REALTIME_CLIENT_OPTIONS, cookie)
  connect           → invalidar ['vms']  (RF-rt-14)          indicador: En vivo / Conectando… /
  vm:status-changed → guarda de forma → versión más nueva     Sin conexión en tiempo real
                      → resalte + anuncio si cambia lo que se ve
  connect_error UNAUTHENTICATED → handleSessionExpired()      (RF-auth-26)
  io server disconnect → GET /api/auth/me → 401: login · 200: reconectar una vez
  otro rechazo → reintento manual 1 s … 30 s
```

### D1. Estado de las VMs: TanStack Query v5 (decisión abierta "Estado de servidor")

- **TanStack Query** y no un store propio de Zustand: trae lo que el cambio necesita y sería código
  propio con bugs propios: recarga al volver a la pestaña (`focusManager` escucha
  `visibilitychange`, RF-virtual-machines-26), estados de carga y error con `refetch`
  (RF-virtual-machines-15), cancelación de una recarga en curso (`invalidateQueries` con
  `cancelRefetch: true` por defecto) y mutaciones con su estado pendiente. Zustand sigue para la
  sesión (spec `auth`) y para los diálogos (D5).
- **`src/lib/query/query-client.ts`:** `getQueryClient()` según la guía de SSR avanzado: en el
  servidor, uno nuevo por llamada; en el navegador, uno por pestaña. Defaults: queries con
  `staleTime: 0`; reintento solo ante red o `5xx`, como mucho 2 veces (nunca ante `4xx`: un `401` ya
  lleva al login); mutaciones sin reintento.
- **`src/components/providers/query-provider.tsx`** (`'use client'`): `QueryClientProvider` con
  `getQueryClient()`, montado en `(panel)/layout.tsx`. Al cerrar sesión o al cambiar de cuenta la
  pestaña se recarga entera (RF-auth-26, 29, 33), así que la caché nunca pasa de una persona a otra.
- **Query `['vms']`** (`src/lib/vms/vms-query.ts`): `queryFn` = `get('/api/vms')` de
  `fetch-wrapper`; `refetchOnMount: false` (los datos llegan del servidor y la primera conexión del
  socket ya resincroniza, RF-realtime-vm-status-14); `structuralSharing: mergeFetchedList` (D2).

### D2. Optimistic UI por la interfaz, con versiones (RF-virtual-machines-21…24; hallazgo V2)

El patrón documentado escribe el cambio optimista en la caché y, si falla, restaura una copia de
toda la lista: eso borra lo que llegó mientras tanto (V2). Se usa el otro patrón documentado de v5,
"optimistic updates via the UI": **la caché guarda solo versiones confirmadas** y lo pendiente se
dibuja encima, leído de las mutaciones en curso.

- **`src/lib/vms/vm-versions.ts`** (puras):
  - `isNewerOrSame(incoming, current)`: compara `updatedAt` como fecha; a igual valor gana la que
    llega (un evento igual a lo que ya hay no cambia nada visible).
  - `upsertConfirmed(list, vm)`: reemplaza si es más nueva; si no está, la inserta en su lugar del
    orden (`createdAt` descendente). `removeConfirmed(list, id)`.
  - `mergeFetchedList(previous, fetched)`: la lista nueva manda en **qué** VMs hay; de cada VM que
    está en las dos se queda la versión más nueva. Es el `structuralSharing` de la query: también
    pasa por acá cada `setQueryData`.
- **`src/lib/vms/pending-changes.ts`** (puras): `PendingVmChange` =
  `{ kind: 'create', tempId, dto } | { kind: 'update', id, changes } | { kind: 'delete', id }`, y
  `deriveVisibleVms(confirmed, pending)`: las creaciones pendientes primero (la más reciente
  arriba), luego las confirmadas con sus ediciones pendientes aplicadas y sin las que tienen una
  eliminación pendiente. Cada VM visible lleva `pending: 'create' | 'update' | 'delete' | null`.
- **Mutaciones** (`src/features/vms/hooks/`): `useCreateVm`, `useUpdateVm`, `useDeleteVm`, todas
  con `mutationKey: ['vms']` y las variables de `PendingVmChange`. `useVisibleVms()` combina la
  query con `useMutationState({ filters: { mutationKey: ['vms'], status: 'pending' } })`.
  - **Éxito:** `setQueryData` con la versión que devolvió la API (`upsertConfirmed`) o sin la VM
    (`removeConfirmed`); después `invalidateQueries(['vms'])` sin esperarlo, que cancela una recarga
    vieja en curso (`cancelRefetch`). Así una carga que empezó antes de terminar la mutación nunca
    la deshace (RF-virtual-machines-24).
  - **Error:** no hay nada que revertir: la mutación deja de estar pendiente y se vuelve a ver la
    versión confirmada más reciente, incluida la de un evento que llegó mientras tanto. `404` en
    `PUT` → `removeConfirmed` + toast con el mensaje de la API; `404` en `DELETE` → `removeConfirmed`
    - advertencia (RF-virtual-machines-22, 23). Toasts con `notify` y los textos de
      `src/config/vms.ts` (RF-virtual-machines-25).
  - **Doble clic:** una VM con un cambio pendiente deshabilita sus acciones (RF-virtual-machines-22).

### D3. Carga inicial y estados (RF-virtual-machines-15, RF-resource-dashboard-07)

- **`(panel)/page.tsx`** (Server Component): `await requireUser()` en la primera línea (la guarda
  `session-guard.test.ts` lo exige), `PageHeader` y un `<Suspense>` cuyo fallback es el encabezado
  sin acciones + `ChartSkeleton` + `CardGridSkeleton`.
- **`features/vms/components/vms-prefetch.tsx`** (Server Component asíncrono): con un `QueryClient`
  nuevo, `prefetchQuery(['vms'])` cuya `queryFn` llama a `serverFetchResult('/api/vms')` (reenvía la
  cookie, `no-store`, 10 s) y lanza si no es `ok`. Pasa `dehydrate(queryClient)` a
  `HydrationBoundary` (guía de SSR avanzado). Una falla no se deshidrata: el cliente vuelve a pedir,
  con skeleton, y si falla muestra el error con "Reintentar" (`refetch`), sin "Crear máquina
  virtual".
- **Por qué precargar en el servidor:** el listado llega en el mismo HTML que el shell, sin un viaje
  más después de hidratar. La guía de autenticación ya hace dinámica la página (`requireUser`).

### D4. Formularios (RF-virtual-machines-16…20; DF2)

- **`src/schemas/vm-form.ts`** (solo del frontend: `forms-conventions.md`, "Schema Location"):
  - Valores del formulario como texto; `createVmFormSchema(otherNames)` transforma al DTO
    reutilizando `VmName` y los schemas de `CreateVirtualMachineDTO.shape` (mismas reglas y
    mensajes, C10).
  - **Números** (RF-virtual-machines-17): `<input type="text" inputMode="numeric">`. Con
    `type="number"`, `2,5` llega como `""` (`badInput`) y no se distingue de un campo vacío. El
    texto se recorta; `""` → `Ingresa los cores`; si no es `^\d+$` → el mensaje del DTO; si no,
    `Number(...)` y el schema del DTO (rango).
  - **Nombre único** (RF-virtual-machines-18): `isNameTaken(name, vms, ownId)` (recorta, compara en
    minúsculas, excluye la propia VM) en un `superRefine`; `otherNames` sale del listado visible.
  - **Edición** (RF-virtual-machines-20): `buildUpdatePayload(initial, next)` compara los valores ya
    transformados (no `dirtyFields`, que vería `web-01` como cambio) y devuelve solo los campos
    distintos, o `null` si no hay ninguno.
- **`features/vms/components/vm-form.tsx`:** `useForm<z.input<…>, unknown, z.output<…>>` con
  `zodResolver` (con transformaciones, los genéricos son explícitos según la doc de los resolvers),
  `mode: 'all'` (valida al escribir y al salir del campo), `defaultValues` explícitos. Enviar se
  deshabilita con `!isValid` (y en la edición, con `buildUpdatePayload` en `null`); junto al botón,
  un texto con los campos obligatorios vacíos o "Corrige los campos marcados". Errores con
  `aria-invalid` y `aria-describedby`.
- **Al enviar** (optimistic): `mutate()` y cerrar el modal, sin esperar la respuesta.
  `isSubmitting` no aplica. La regla `forms-conventions.md` documenta este caso (C5).
- **Modal** (`components/ui/dialog.tsx`, de shadcn `new-york-v4`): `onInteractOutside` con
  `preventDefault()`, para que un clic fuera no cierre ni pierda lo escrito (RF-virtual-machines-16).
  Sistema operativo con `<select>` nativo (`ui/native-select.tsx`); estado inicial con radios
  nativos en un `fieldset`.

### D5. Diálogos y reapertura tras un fallo (RF-virtual-machines-21, 23; DF4)

- **`features/vms/store/vm-dialogs-store.ts`:** un store de Zustand por proveedor (como el de
  sesión), creado en `VmWorkspace`: `{ current: VmDialog | null; pendingCreateRetry:
CreateRetry | null }`, con `VmDialog` = crear (con borrador y error de nombre opcionales), editar
  (id) o eliminar (id). Las transiciones son funciones puras:
  - `createFailed(state, retry)`: sin modal abierto → abre crear con el borrador; con otro modal →
    guarda el reintento; con un formulario de crear abierto → no hace nada (solo el toast).
  - `dialogClosed(state)`: si hay un reintento guardado, lo abre.
- Con `409`, el formulario abre con `setError('name', …)` y `setFocus('name')`; con otra falla, el
  foco va al primer campo (Radix lo hace al abrir).
- **Eliminar:** `components/ui/alert-dialog.tsx` (Radix `AlertDialog`: rol `alertdialog`, no se
  cierra con un clic fuera), con "Cancelar" enfocado al abrir.

### D6. Cliente de tiempo real (RF-realtime-vm-status-11, 12, 14, 15, 16; hallazgos V4, V5)

- **`src/lib/realtime/realtime-connection.ts`:** `createRealtimeConnection(deps)` sin React, con
  sus bordes inyectados (`createSocket`, `onVmChanged`, `onResync`, `onStatus`, `checkSession`,
  `onSessionExpired`, temporizador). Así se testea con un socket falso.
  - `createSocket` real: `io(REALTIME_CLIENT_OPTIONS)` sin URL (mismo origen), sin `auth`, `query`
    ni `extraHeaders`. Tipado `Socket<ServerToClientEvents, ClientToServerEvents>`. Nunca `emit`.
  - `connect` → `onStatus('live')`, reinicia la espera y llama a `onResync()` (invalida `['vms']`),
    la primera vez y en cada reconexión (RF-14).
  - `connect_error`: si `socket.active`, `connecting` (reintenta Socket.io). Si no (lo rechazó el
    middleware): `data.code === 'UNAUTHENTICATED'` → `onSessionExpired()` (`handleSessionExpired`,
    una vez por documento); otro → `offline` y `socket.connect()` tras `nextReconnectDelay(intento)`
    = 1, 2, 4, 8, 16 y 30 s (RF-15, 16).
  - `disconnect('io server disconnect')` → `connecting`, `checkSession()` = `get('/api/auth/me')`:
    `401` → `fetch-wrapper` ya lleva al login; `200` → `socket.connect()` una vez; error de red →
    `offline` y el reintento con espera. `io client disconnect` (desmontaje) → nada. El resto lo
    reconecta Socket.io (`connecting`).
- **`src/lib/realtime/vm-status-event.ts`:** `readVmStatusChangedEvent(payload: unknown)`, guarda de
  tipos escrita a mano, como `isAuthUser` (`shared-types.md`: las respuestas no se validan con Zod):
  `item` con `id`, `name` y fechas ISO string; `cores`, `ram` y `disk` enteros; `os` y `status` de
  los catálogos. Devuelve una `VirtualMachine` nueva con solo esos campos, o `null` (RF-12, V4).
- **`src/lib/vms/apply-vm-event.ts`:** `applyVmEvent(queryClient, vm)`: si la VM no está en la caché
  → `invalidateQueries(['vms'])`; si está, `upsertConfirmed`. Devuelve el estado visible antes y
  después (con `deriveVisibleVms` y las mutaciones pendientes del `MutationCache`) para decidir el
  resalte (D7). Una eliminación pendiente sigue ocultando la VM.
- **`src/components/realtime/realtime-provider.tsx`** (`'use client'`, en `(panel)/layout.tsx`):
  crea la conexión en un `useEffect` y la cierra al desmontar; una por pestaña mientras dure el
  layout del panel (navegar entre páginas del panel no reconecta). Expone el estado
  (`useRealtimeStatus`) y los resaltes por contexto. En desarrollo, el `StrictMode` monta dos veces:
  la primera conexión se cierra antes de la segunda.
- **Indicador** (`components/realtime/realtime-indicator.tsx`): ícono + texto, `role="status"`, en
  las acciones del encabezado del Panel (RF-16).

### D7. Resalte y anuncio (RF-realtime-vm-status-13)

- **Cuándo:** solo si `applyVmEvent` cambió el `status` visible. En la pestaña del Administrador que
  hizo el cambio, el estado visible ya era el nuevo (pendiente o confirmado): no hay resalte.
- **Cómo:** un mapa `vmId → número` en el proveedor; la tarjeta dibuja una capa con
  `key={número}` y `animate-vm-flash`, así cada evento reinicia la animación sin acumularse. Sin
  movimiento de contenido: es un `::after`/capa absoluta con opacidad.
- **CSS** (`globals.css`): `@keyframes vm-flash` (anillo y fondo de `--color-highlight`, de 0.35 a 0
  de opacidad en 2 s) y `--animate-vm-flash` en `@theme`. Token `highlight`: `secondary-500` en los
  dos temas. Con `prefers-reduced-motion`, la regla global ya lo acorta a 0.01 ms: no se ve, y queda
  el cambio del estado.
- **Anuncio:** un `<p role="status" class="sr-only">` en el proveedor con
  `web-01 ahora está Encendida`.

### D8. Panel de recursos (RF-resource-dashboard-01…09; DF3)

- **`src/lib/resource-dashboard/resource-summary.ts`** (puras): `summarizeResources(vms)` (RF-01) y
  `rankContributions(vms, resource)` (RF-02: mayor a menor, empate por nombre con
  `localeCompare('es', { sensitivity: 'base' })`, más de 6 → 5 + `Otras (n)`).
- **`features/resource-dashboard/components/`:**
  - `resource-panel.tsx` (`'use client'`): calcula con `useMemo` sobre `useVisibleVms()`; dibuja los
    indicadores en HTML (se ven sin esperar a Recharts) y los gráficos con
    `dynamic(() => import('./resource-charts'), { ssr: false, loading: ChartSkeleton })`. Según
    `lazy-loading.md`, `ssr: false` solo funciona desde un Client Component.
  - `resource-charts.tsx`: `BarChart` horizontal apilado al 100 % (`stackOffset="expand"`) y tres
    `BarChart` chicos de aporte. Recharts 3: `responsive` + alto fijo (sin `ResponsiveContainer`),
    `accessibilityLayer` por defecto, `title` y `desc`. Animación desactivada si
    `prefers-reduced-motion` (Recharts anima con JS, la regla CSS global no lo alcanza).
  - `chart-data-table.tsx`: la tabla `sr-only` con los mismos datos (RF-09).
  - Formato con `Intl.NumberFormat('es')`. Nota: `es` no agrupa números de 4 cifras (`2048`, regla
    de la RAE y CLDR); desde 5 cifras sí (`65.536`). Porcentajes con `style: 'percent'`; `< 1 %`
    cuando un valor no es cero y redondea a 0.
- **Colores** (forma de énfasis: un acento y gris para el resto), como tokens semánticos nuevos en
  `globals.css` que solo apuntan a colores de la paleta:

  | Token            | Claro                     | Oscuro                      |
  | ---------------- | ------------------------- | --------------------------- |
  | `chart-active`   | `primary-500` (`#003cde`) | `secondary-500` (`#00e0ff`) |
  | `chart-inactive` | `surface-500` (`#666666`) | `navy-400` (`#5f6aab`)      |

  Validado con el validador de la skill de dataviz: separación para daltonismo y visión normal OK
  (ΔE ≥ 28), contraste ≥ 3:1 contra la tarjeta en los dos temas. Los "fallos" de croma del gris y de
  la banda de luminosidad del cian son propios de la forma de énfasis (el validador es para paletas
  categóricas). El cian no se usa en claro: contra el blanco da 1.6:1. Identidad nunca solo por
  color: leyenda, etiquetas y tooltip.

### D9. Composición del Panel y roles (RF-virtual-machines-13, 14; RF-app-shell-11)

- `page.tsx` → `VmWorkspace` (cliente: store de diálogos) → `VmDashboard` (cliente: encabezado con
  `PanelActions`, `ResourcePanel` y `VmGrid`) y `VmDialogs`.
- **Controles por rol:** todo control de escritura vive en Client Components dentro de `AdminOnly`
  (`PanelActions`, `VmCardActions`, `VmPowerSwitch`, `VmDialogs`), nunca en un Server Component
  con `AdminOnly` (`component-imports.md`). El estado vacío elige su texto y su acción con
  `AdminOnly` y su contrario (`selectRole`).
- **Tarjeta:** nombre, `StatusBadge` (tono `success` para `Encendida`, `neutral` para `Apagada`, con
  ícono y texto), sistema operativo, y cores, RAM y disco. Para el Administrador: el interruptor
  (`ui/switch.tsx`, `aria-label` "Encender web-01" / "Apagar web-01") y un menú "Acciones de
  web-01" (`DropdownMenu`) con "Editar" y "Eliminar". Pendiente: opacidad, "Guardando…" con
  `Loader2` y `aria-busy`.

### D10. Primitivos e íconos

- `components/ui/`: `dialog.tsx`, `alert-dialog.tsx` y `switch.tsx` copiados del registro
  `new-york-v4` y traducidos a los tokens (`component-imports.md`, prioridad 3); `status-badge.tsx`
  (CVA, tonos `success`, `warning`, `error`, `info`, `neutral`, como prevé la regla);
  `native-select.tsx`.
- Íconos de Tabler 3.49.0: `plus`, `pencil`, `trash`, `dots-vertical`, `cpu`, `database`,
  `server-2`, `refresh`, `wifi`, `wifi-off`, `alert-circle`.

### D11. Dependencias

Exactas, con al menos dos semanas publicadas y peer deps compatibles con React 19:

| Paquete                 | Versión | Publicada  | Peer deps relevantes                      |
| ----------------------- | ------- | ---------- | ----------------------------------------- |
| `@tanstack/react-query` | 5.104.0 | 2026-09-26 | `react ^18 \|\| ^19`                      |
| `recharts`              | 3.10.1  | 2026-07-25 | `react`, `react-dom` y `react-is` `^19`   |
| `react-is`              | 19.3.0  | 2026-09-09 | La pide Recharts; misma versión que React |
| `socket.io-client`      | 4.8.3   | 2025-12-23 | — (la misma que usa el e2e del backend)   |

**Instalación:** edito `apps/frontend/package.json` y verifico en el scratchpad (`pnpm install`,
`pnpm audit`, typecheck, lint, build). Tú corres `pnpm install` desde Windows, que actualiza
`pnpm-lock.yaml`.

### D12. Tipos de respuesta

`src/types/api.ts`: `VmListResponse = { items: VirtualMachine[] }` y
`VmItemResponse = { item: VirtualMachine }`. Las respuestas REST no se validan en tiempo de
ejecución (decisión de la spec, "Descartado"); los eventos sí (D6).

## Cambios por paquete

| Paquete            | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vm/shared-types` | Ninguno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `@vm/backend`      | Ninguno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `@vm/frontend`     | Dependencias de D11. Nuevos: `src/lib/query/query-client.ts`; `src/lib/vms/` (`vm-versions`, `pending-changes`, `vms-query`, `apply-vm-event`); `src/lib/realtime/` (`realtime-connection`, `vm-status-event`, `reconnect-delay`); `src/lib/resource-dashboard/resource-summary.ts`; `src/schemas/vm-form.ts`; `src/config/vms.ts` (textos); `src/types/api.ts`; `src/components/providers/query-provider.tsx`; `src/components/realtime/` (proveedor, indicador, `use-realtime-status`); `src/features/vms/` (`hooks/`, `store/`, `components/`: `vm-workspace`, `vms-prefetch`, `vm-dashboard`, `panel-actions`, `vm-grid`, `vm-card`, `vm-card-actions`, `vm-power-switch`, `vm-status-badge`, `vms-error-state`, `vm-form`, `vm-form-dialog`, `delete-vm-dialog`, `vm-dialogs`); `src/features/resource-dashboard/components/` (`resource-panel`, `resource-indicators`, `resource-charts`, `chart-data-table`); `components/ui/` (`dialog`, `alert-dialog`, `switch`, `status-badge`, `native-select`); once íconos. Cambian: `(panel)/layout.tsx` (proveedores), `(panel)/page.tsx`, `globals.css` (tokens `chart-*`, `highlight`, animación) |
| Docs               | `README.md` (decisiones de arquitectura del frontend, tiempo real del lado del cliente, estructura); `CLAUDE.md` raíz y `apps/frontend/CLAUDE.md` (stack, estructura, datos); reglas: `forms-conventions.md`, `shadcn-ux-guide.md`, `component-imports.md`, `component-conventions.md`, `nextjs-patterns.md`, `.claude/rules/shared-types.md`; `docs/specs/README.md` y el campo `Código` de las tres specs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Compatibilidad entre apps (`docs/sdd/README.md`)

No cambia ningún contrato: el frontend consume los cuatro endpoints de VMs, `GET /api/auth/me` y el
socket tal como están, y `@vm/shared-types` no cambia. Si en el futuro el backend cambia la forma de
`VirtualMachine` en el evento sin actualizar el frontend, la guarda de D6 ignora el evento (V4) y la
resincronización por REST mantiene la pantalla correcta. Tráfico nuevo a la API: un `GET /api/vms`
por conexión del socket, por vuelta a la pestaña y tras cada mutación; no tiene límite de tasa.

## Seguridad y permisos (C8)

- **A01, control de acceso:** los controles de escritura no existen en el DOM para un Cliente
  (`AdminOnly`, test de RF-virtual-machines-14); la API decide siempre (RF-virtual-machines-02). Sin
  rutas solo de Administrador (DF2).
- **A03, dependencias:** versiones exactas y `pnpm audit` (D11).
- **A05, inyección (XSS):** nombres de VM y mensajes de la API solo como texto de React (tarjetas,
  tooltips de Recharts, toasts, anuncios); ningún `dangerouslySetInnerHTML` nuevo (V7).
- **A06, diseño:** edición con solo los campos cambiados (V1); versiones por `updatedAt` y nada que
  revertir en la caché (V2).
- **A07, sesión:** el socket usa solo la cookie (RF-rt-11); rechazo `UNAUTHENTICATED` o cierre del
  servidor terminan en `/login` sin bucles (V5); la pestaña se recarga entera al cambiar de sesión,
  así que la caché de VMs nunca pasa de una cuenta a otra.
- **A08, integridad:** cada evento pasa por la guarda antes de tocar el estado (V4).
- **A09, logs:** el frontend no registra nada nuevo; un evento inválido se ignora en silencio (es el
  comportamiento de la spec).
- **A10, condiciones excepcionales:** errores con `toUserMessage` y fallbacks escritos como texto
  final; la API caída da el estado de error con "Reintentar"; el tiempo real caído no bloquea el
  panel.

## Pruebas por requisito (`docs/testing.md`)

Bordes mockeados como hoy: `fetch` con `vi.stubGlobal`, `window.location` con `vi.stubGlobal`,
`sonner` con `vi.mock` (los toasts son un borde de UI), el socket con un emisor falso inyectado y el
tiempo con `vi.useFakeTimers()`. Los hooks se prueban con un `QueryClient` real y `renderHook`.

| RF                       | Criticidad     | Test (nivel)                                                       | Qué verifica                                                                                                                                                                                                                                               | Archivo                                                                          |
| ------------------------ | -------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| RF-virtual-machines-14   | Crítico K1     | RTL de componente + `renderToString`                               | Con un Cliente (y con un rol desconocido), `VmCard`, `PanelActions` y el estado vacío no tienen interruptor, "Editar", "Eliminar" ni "Crear máquina virtual", tampoco en el HTML del servidor; con un Administrador, sí                                    | `src/features/vms/components/vm-card.test.tsx`                                   |
| RF-virtual-machines-17   | Crítico K4     | Unitario                                                           | `""` → `Ingresa los cores`; `2.5`, `2,5`, `abc`, `0`, `-1`, `129` → el mensaje del DTO; `4` → `4` (número); lo mismo para RAM y disco con sus límites                                                                                                      | `src/schemas/vm-form.test.ts`                                                    |
| RF-virtual-machines-18   | Crítico K4     | Unitario                                                           | `web-01` frente a `WEB-01` y `web-01` está tomado; la propia VM puede quedarse con su nombre o cambiarle las mayúsculas                                                                                                                                    | `src/schemas/vm-form.test.ts`                                                    |
| RF-virtual-machines-20   | Crítico K2, K4 | Unitario                                                           | `buildUpdatePayload` devuelve solo los campos cambiados (con números), `null` sin cambios, y no cuenta un cambio solo de espacios en el nombre                                                                                                             | `src/schemas/vm-form.test.ts`                                                    |
| RF-virtual-machines-21   | Crítico K2     | Hook (`renderHook`; bordes: `fetch`, `sonner`)                     | Mientras el `POST` está en curso, la VM se ve primera y pendiente; con `201`, con el `id` del servidor; con `409`, desaparece, hay toast de error y el store de diálogos reabre crear con el borrador y el error en el nombre                              | `src/features/vms/hooks/use-create-vm.test.tsx`                                  |
| RF-virtual-machines-21   | Crítico K2     | Unitario                                                           | `createFailed` / `dialogClosed`: abre si no hay modal; espera si hay otro; no pisa un formulario de crear abierto                                                                                                                                          | `src/features/vms/store/vm-dialogs-store.test.ts`                                |
| RF-virtual-machines-22   | Crítico K2     | Hook (bordes: `fetch`, `sonner`)                                   | El cambio se ve al instante y pendiente; con `200`, la versión del servidor; con `500`, vuelve a la versión confirmada más reciente (también una que llegó por evento mientras tanto) con toast; con `404`, la VM desaparece con el mensaje de la API      | `src/features/vms/hooks/use-update-vm.test.tsx`                                  |
| RF-virtual-machines-23   | Crítico K2     | Hook (bordes: `fetch`, `sonner`)                                   | La VM se oculta al instante; `204` → sigue fuera y toast de éxito; `404` → sigue fuera y advertencia; `500` → reaparece en la misma posición y toast de error                                                                                              | `src/features/vms/hooks/use-delete-vm.test.tsx`                                  |
| RF-virtual-machines-24   | Crítico K2, K4 | Unitario                                                           | `mergeFetchedList`, `upsertConfirmed` y `deriveVisibleVms`: una versión más vieja se descarta; la lista nueva manda en qué VMs hay; una creación pendiente sigue arriba y una eliminación pendiente sigue oculta tras una carga                            | `src/lib/vms/vm-versions.test.ts`, `pending-changes.test.ts`                     |
| RF-virtual-machines-24   | Crítico K2, K4 | Hook (borde: `fetch` con promesas controladas)                     | Una carga del listado que empezó antes de que el `POST` respondiera y termina después no hace desaparecer la VM creada                                                                                                                                     | `src/features/vms/hooks/use-create-vm.test.tsx`                                  |
| RF-resource-dashboard-01 | Crítico K4     | Unitario                                                           | Totales de las encendidas y de todas; cantidades; sin VMs o sin encendidas, ceros                                                                                                                                                                          | `src/lib/resource-dashboard/resource-summary.test.ts`                            |
| RF-resource-dashboard-02 | Crítico K4     | Unitario                                                           | Orden de mayor a menor, empate por nombre sin distinguir mayúsculas, 6 sin `Otras`, 8 → 5 + `Otras (3)`, y la suma de las filas igual al total                                                                                                             | `src/lib/resource-dashboard/resource-summary.test.ts`                            |
| RF-realtime-vm-status-11 | Crítico K1, K3 | Unitario (socket falso)                                            | El socket se crea para el mismo origen con `REALTIME_CLIENT_OPTIONS`, sin `auth`, `query` ni `extraHeaders`, y la conexión nunca emite                                                                                                                     | `src/lib/realtime/realtime-connection.test.ts`                                   |
| RF-realtime-vm-status-11 | Crítico K1, K3 | Manual (spec, "Verificación manual")                               | Una conexión por pestaña en el navegador, con la cookie y sin token en la URL; el Cliente ve el cambio del Administrador                                                                                                                                   | —                                                                                |
| RF-realtime-vm-status-12 | Crítico K3, K4 | Unitario + hook                                                    | La guarda rechaza `item` ausente, `status: "encendida"`, `os` fuera del catálogo, números no enteros y fechas que no son texto; `applyVmEvent` actualiza solo si es más nueva, recarga si la VM no está y no hace reaparecer una con eliminación pendiente | `src/lib/realtime/vm-status-event.test.ts`, `src/lib/vms/apply-vm-event.test.ts` |
| RF-realtime-vm-status-14 | Crítico K5     | Unitario (socket falso)                                            | `connect` llama a la resincronización la primera vez y en cada reconexión                                                                                                                                                                                  | `src/lib/realtime/realtime-connection.test.ts`                                   |
| RF-realtime-vm-status-15 | Crítico K1     | Unitario (socket falso; bordes: `fetch`, `location`, temporizador) | Rechazo `UNAUTHENTICATED` → `/login?aviso=sesion-expirada` una sola vez; `io server disconnect` → `/me`: `401` → login, `200` → reconecta una vez; `INTERNAL_ERROR` → no va al login y reintenta con espera creciente hasta 30 s                           | `src/lib/realtime/realtime-connection.test.ts`                                   |
| RF-realtime-vm-status-15 | Crítico K1     | Manual (spec, "Verificación manual")                               | Usuario desactivado con el Panel abierto → `/login` con el aviso en ≤ 60 s                                                                                                                                                                                 | —                                                                                |

Los RF Estándar (virtual-machines-13, 15, 16, 19, 25, 26, 27; resource-dashboard-03…09;
realtime-vm-status-13, 16) se comprueban en G4 con una línea cada uno y capturas en claro, oscuro,
escritorio y 320 px. `palette.test.ts` y `session-guard.test.ts` cubren los archivos nuevos sin
cambios. Los tests se corren con el Node de Windows (`apps/frontend/CLAUDE.md`, "Testing").

### Tests que se retiran o reescriben

Ninguno. Ningún test existente cambia: `(panel)/page.tsx` sigue empezando con `requireUser()`.

## Revisión de arquitectura

| Hallazgo                                                                                           | Evidencia (archivo:línea o doc oficial)                                                                                      | Cambio                                                            |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| La reversión documentada restaura una copia de toda la lista (V2)                                  | TanStack Query, "Optimistic Updates" (`onMutate` → `previousTodos`; `onError` → `setQueryData(previous)`)                    | Optimistic por la interfaz + versiones (D2)                       |
| v5 dibuja lo pendiente desde las variables de la mutación, sin tocar la caché                      | TanStack Query, "Migrating to v5" → "Simplified optimistic updates"; `useMutationState`                                      | `useVisibleVms` (D2)                                              |
| `invalidateQueries` cancela la recarga en curso y empieza otra                                     | TanStack Query, "Migrating to v4" → `cancelRefetch` (por defecto `true`); `query-core/src/queryClient.ts` (`refetchQueries`) | Invalidar tras cada mutación (D2)                                 |
| `structuralSharing` acepta una función `(oldData, newData)`                                        | Referencia de `useQuery` v5 (`structuralSharing`)                                                                            | `mergeFetchedList` (D2)                                           |
| La recarga al volver a la pestaña escucha `visibilitychange`                                       | `query-core/src/focusManager.ts`                                                                                             | RF-virtual-machines-26 sin código propio (D1)                     |
| `QueryClient` nuevo por pedido en el servidor y uno solo en el navegador                           | TanStack Query, "Advanced Server Rendering" (`getQueryClient`, `HydrationBoundary`, `dehydrate`)                             | D1, D3                                                            |
| El cliente de Socket.io no reintenta tras un rechazo del middleware ni tras `io server disconnect` | Socket.io v4, "Client socket instance" → `connect_error` y `disconnect` (`socket.active`)                                    | Reconexión manual y verificación de sesión (D6)                   |
| Las respuestas no se validan con Zod; la sesión usa una guarda propia                              | `.claude/rules/shared-types.md` ("What does NOT belong here"); `apps/frontend/src/lib/auth/auth-user.ts`                     | Guarda escrita a mano para el evento (D6)                         |
| `fetch-wrapper` hace un cast de `data`                                                             | `apps/frontend/src/lib/api/fetch-wrapper.ts:82`                                                                              | Solo los eventos se validan (spec, "Descartado")                  |
| Con transformaciones, `useForm` necesita los tres genéricos                                        | `@hookform/resolvers`, "Zod with Transform"                                                                                  | D4                                                                |
| `setError` fuerza `isValid` a `false` hasta la próxima validación                                  | React Hook Form, `useFormState` → `isValid`                                                                                  | El `409` deja el envío deshabilitado hasta cambiar el nombre (D5) |
| `<input type="number">` entrega `""` ante `2,5`                                                    | HTML, `input type=number` (`validity.badInput`); MDN                                                                         | Texto con `inputMode="numeric"` (D4)                              |
| `ssr: false` de `next/dynamic` solo funciona en Client Components                                  | `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md:66,94`                                                         | `ResourcePanel` cliente (D8)                                      |
| Recharts 3 trae accesibilidad por defecto y `responsive` desde 3.3                                 | Recharts, "Recharts and accessibility"; guía "Chart sizing"                                                                  | D8                                                                |
| `AdminOnly` en un Server Component filtraría sus `children` al payload RSC                         | `apps/frontend/.claude/rules/component-imports.md` ("Controles según el rol")                                                | Controles en Client Components (D9)                               |
| La regla global de movimiento reducido acorta las animaciones CSS, no las de JS                    | `apps/frontend/src/app/globals.css:83-96`; Recharts anima con JS                                                             | Resalte CSS; Recharts sin animación si se pide (D7, D8)           |

## Riesgos y decisiones (incluidas las que trascienden el cambio)

- **TanStack Query entra al proyecto** (decisión abierta "Estado de servidor" de `docs/product.md`,
  que se marca resuelta en T10): queda como la forma de leer y mutar datos de la API desde el
  cliente. Zustand sigue para estado propio de la interfaz (sesión, diálogos).
- **Más pedidos de lectura:** un `GET /api/vms` tras cada mutación, por cada conexión y al volver a
  la pestaña. Es lo que compensa que el tiempo real solo difunda cambios de estado. Si el listado
  creciera mucho, la alternativa es difundir altas, bajas y ediciones desde el backend (cambio de la
  spec `realtime-vm-status`).
- **Peso de Recharts** (Redux Toolkit, immer, d3): se carga diferido y solo en el Panel; los
  indicadores no lo esperan.
- **Sin paginación ni virtualización:** el listado completo se dibuja (spec `virtual-machines`).
- **Interruptor sin confirmación:** encender o apagar es un cambio de registro reversible con otro
  clic; eliminar sí confirma.
- **Formato de 4 cifras:** `es` muestra `2048 GB`, no `2.048 GB` (CLDR/RAE). Se acepta.
- **Verificación manual en el navegador** (RF-rt-11 y 15) y visual, como en `app-shell` y `auth`:
  `puppeteer-core` contra el Chrome de Windows en modo headless, con perfiles temporales, el
  frontend y la API en los puertos 3100 y 3101 (nunca 3000/3001 desde WSL) y los usuarios de
  `db:seed`.
- **G3 propuesto:** ⏸ tras T6 (Panel con tarjetas, formularios y diálogos), para que revises el
  diseño en claro, oscuro y móvil antes del panel de recursos y el tiempo real.

## Desvíos durante la implementación

| Desvío                                                         | Motivo                                                                                                                                                                                                                                                                                                                                                           | Dónde                                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `queryClient.query(...).catch(...)` en vez de `prefetchQuery`  | `prefetchQuery` está deprecado en 5.104 (lo marca `@typescript-eslint/no-deprecated`); la doc indica `query()` y tragar el error a propósito                                                                                                                                                                                                                     | `features/vms/components/vms-prefetch.tsx`                                             |
| Los modales leen el listado solo cuando están abiertos         | Bug hallado en la verificación del navegador: `VmDialogs`, fuera del `Suspense` de la precarga, leía el listado en el servidor y creaba la query vacía antes de que `HydrationBoundary` la hidratara. El HTML salía sin las VMs y había un error de hidratación                                                                                                  | `features/vms/components/vm-dialogs.tsx`, `vm-form-dialog.tsx`, `delete-vm-dialog.tsx` |
| Foco devuelto a mano al cerrar un modal                        | Editar y Eliminar se abren desde un menú que ya se cerró: Radix no sabe a qué control volver (RF-virtual-machines-27)                                                                                                                                                                                                                                            | `features/vms/components/dialog-focus.ts`                                              |
| Ícono `power` (doce en vez de once)                            | La insignia de estado lleva ícono y texto; ninguno de los existentes representaba el encendido                                                                                                                                                                                                                                                                   | `components/svg/power.tsx`                                                             |
| Archivos de apoyo no listados en el plan                       | Separar responsabilidades (C9): `lib/vms/vms-api.ts` (pedidos), `vm-cache.ts` (escrituras en la caché), `vms-server.ts` (pedido del servidor), `lib/format.ts`, `config/panel.ts`, `isApiErrorStatus` en `api-error.ts`, `features/vms/store/vm-dialogs-provider.tsx` y, para los tests, `src/test/vm-fixtures.ts`, `api-test-utils.ts` y `query-test-utils.tsx` | —                                                                                      |
| `origin: 'form' \| 'switch'` en el cambio pendiente de edición | RF-virtual-machines-25: el formulario confirma con toast y el interruptor no; además elige el fallback del error                                                                                                                                                                                                                                                 | `lib/vms/pending-changes.ts`                                                           |

**T7–T9:**

| Desvío                                                                               | Motivo                                                                                                                                                                                                                                                                                                                                            | Dónde                                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| La query `['vms']` vuelve a pedir al montar (D1 decía `refetchOnMount: false`)       | Si el socket conecta antes de que el `Suspense` hidrate el listado, su resincronización no encuentra la query y los eventos entre la precarga y la conexión se perderían sin aviso (RF-realtime-vm-status-14). Al montar se cubre ese orden; cuesta un `GET` más por carga. Los tests de hooks arrancan sin esa recarga (`createTestQueryClient`) | `lib/vms/vms-query.ts`, `src/test/query-test-utils.tsx`          |
| Barras de aporte con `shape` en vez de `Cell`, y etiqueta de valor propia            | `Cell` está deprecado en Recharts 3.10 (lo marca el lint); el `LabelList` partía "16 cores" en dos renglones                                                                                                                                                                                                                                      | `features/resource-dashboard/components/contribution-charts.tsx` |
| La tabla para lectores de pantalla va dentro de un `div.sr-only`                     | En una `<table>`, `sr-only` no limita el ancho: desbordaba la página en 320 px (hallado en la verificación del navegador)                                                                                                                                                                                                                         | `features/resource-dashboard/components/chart-data-table.tsx`    |
| `min-w-0` en cada ítem de la grilla de tarjetas                                      | Un nombre de VM largo ensanchaba la tarjeta y desbordaba en 320 px (bug de T5 que apareció con datos reales en T7)                                                                                                                                                                                                                                | `features/vms/components/vm-grid.tsx`                            |
| Un título común para los tres gráficos de aporte                                     | La descripción repetida en tres tarjetas angostas dejaba poco ancho a las barras                                                                                                                                                                                                                                                                  | `contribution-charts.tsx`, `resource-labels.ts`                  |
| Hooks del tiempo real en `realtime-context.ts` (el plan decía `use-realtime-status`) | El contexto y sus dos hooks (`useRealtimeStatus`, `useVmHighlight`) van juntos                                                                                                                                                                                                                                                                    | `components/realtime/realtime-context.ts`                        |
| En desarrollo se abren dos sockets por carga y uno se cierra al instante             | Es el doble montaje de efectos del `StrictMode` (previsto en D6); en producción, uno. La verificación del navegador cuenta las conexiones abiertas                                                                                                                                                                                                | —                                                                |

**Tras la revisión local** (`code-reviewer`, `frontend-reviewer`, `security-auditor`, 2026-10-11;
ningún hallazgo alto):

| Hallazgo                                                                                                                          | Resolución                                                                                                                                                                                                      | Dónde                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Medio: un control con un cambio pendiente quedaba `disabled` y perdía el foco del teclado (RF-virtual-machines-27)                | `aria-disabled` y la acción bloqueada en el handler; el menú no se abre mientras hay un cambio pendiente; el foco al cerrar un modal cae al título si el disparador no es enfocable. Verificado en el navegador | `vm-power-switch.tsx`, `vm-card-actions.tsx`, `switch.tsx`, `dialog-focus.ts` |
| Medio: `aria-busy` en la tarjeta podía tapar el anuncio de "Guardando…"                                                           | Se quitó `aria-busy`; queda la región `role="status"`                                                                                                                                                           | `vm-card.tsx`                                                                 |
| Medio: una VM creada podía verse dos veces (y sumar dos veces en el panel) si un `GET` la traía antes que la respuesta del `POST` | Una creación pendiente se oculta si ya hay una VM confirmada, que no se está eliminando, con ese nombre (los nombres son únicos). Dos casos nuevos en el test de RF-virtual-machines-24                         | `lib/vms/pending-changes.ts`                                                  |
| Bajo: cada modal abierto volvía a pedir el listado                                                                                | Los modales leen una foto de la caché sin suscribirse (`useVisibleVmsSnapshot`)                                                                                                                                 | `hooks/use-visible-vms.ts`, `lib/vms/vm-cache.ts`                             |
| Bajo: tras cierres repetidos del servidor con la sesión válida, reconexión sin espera                                             | La primera reconexión es inmediata; las siguientes esperan 1 s … 30 s. Caso nuevo en el test de RF-realtime-vm-status-15                                                                                        | `lib/realtime/realtime-connection.ts`                                         |
| Bajo: el test de RF-realtime-vm-status-15 no usaba el cableado real                                                               | Usa `handleSessionExpired` y `checkRealtimeSession` (extraído a `lib/realtime/realtime-session.ts`) con `fetch` y `location` como bordes, como dice su fila                                                     | `realtime-connection.test.ts`                                                 |
| Bajo: la guarda del evento aceptaba fechas no ISO, números fuera de rango y nombres que la API no acepta                          | Usa `VM_LIMITS`, `VM_NAME_PATTERN` y una expresión ISO 8601; casos nuevos en el test de RF-realtime-vm-status-12                                                                                                | `lib/realtime/vm-status-event.ts`                                             |
| Bajo: regla de empate de versiones distinta en `upsertConfirmed` y `mergeFetchedVms`                                              | Las dos usan `isNewerOrSame`; a igual contenido se conserva la referencia. Caso nuevo en el test de RF-virtual-machines-24                                                                                      | `lib/vms/vm-versions.ts`                                                      |
| Bajo: `isNameTaken` era código muerto                                                                                             | Se quitó; los tests de RF-virtual-machines-18 pasan por `otherVmNames` + el schema                                                                                                                              | `schemas/vm-form.ts` y su test                                                |
| Bajo: tests que sobraban                                                                                                          | Se quitaron "el formulario confirma con un toast" (RF-25, Estándar) y "al cerrar sin nada esperando" (trivial); los dos eran de este cambio                                                                     | `use-update-vm.test.tsx`, `vm-dialogs-store.test.ts`                          |
| Bajo: "Ninguna máquina virtual está encendida" salía dos veces                                                                    | El subtítulo dice siempre "En N de M…"; el texto queda en lugar de los gráficos de aporte                                                                                                                       | `resource-panel.tsx`                                                          |
| Bajo: el anuncio de tiempo real no se repetía si el texto era igual                                                               | Se vacía al terminar el resalte                                                                                                                                                                                 | `realtime-provider.tsx`                                                       |

**Aceptados** (sin cambio):

- `UNAUTHENTICATED` en el handshake se trata como sesión expirada sin consultar `/me` (seguridad, #1): es lo que pide RF-realtime-vm-status-15, y el handshake y `/me` usan la misma verificación de sesión.
- `crypto.randomUUID()` solo existe en contextos seguros: en producción la cookie es `Secure` (RF-auth-14), así que la aplicación ya exige HTTPS; en desarrollo, `localhost` es seguro.
- Los nombres de las demás VMs se toman al abrir el formulario (RF-virtual-machines-18): uno que llegue mientras está abierto lo rechaza la API con `409` y el formulario se reabre (RF-21).
- `aria-label` fijo "Encender web-01" (D9 decía "Encender" / "Apagar"): el estado lo anuncia `aria-checked`; cambiar el nombre según el estado confunde a los lectores de pantalla.
- `realtime-socket.test.ts` aparte de `realtime-connection.test.ts`: verifica las opciones del socket de RF-realtime-vm-status-11, como pide su fila del plan.
- Un Administrador degradado con la pestaña abierta sigue viendo los controles hasta recargar (seguridad, informativo): la API decide y responde `403`.

**Discrepancia reportada (C5):** `.claude/rules/shared-types.md` dice que los schemas de formulario
van en `@vm/shared-types` junto a su DTO, y `forms-conventions.md` dice que los que usa solo el
frontend van en `src/schemas/`. El plan siguió la segunda (D4); se unifican en T10.
