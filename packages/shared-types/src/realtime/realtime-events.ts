import type { ApiErrorBody } from '../common/api-response';
import type { VirtualMachine } from '../virtual-machines/virtual-machine';

/**
 * Ruta de Socket.io. Vive bajo `/api` para pasar por el rewrite de Next, que también reenvía el
 * upgrade de WebSocket: el navegador se conecta a su mismo origen y la cookie de sesión viaja sola.
 * El cliente la usa a través de `REALTIME_CLIENT_OPTIONS`.
 */
export const REALTIME_PATH = '/api/socket.io';

/**
 * Opciones del cliente de Socket.io (frontend y e2e). `addTrailingSlash: false`: el cliente pide
 * `/api/socket.io?EIO=4…` sin barra final, porque Next redirige con `308` las URLs con barra final
 * y un upgrade redirigido se corta, así que el socket no pasaría por el rewrite.
 */
export const REALTIME_CLIENT_OPTIONS = {
  path: REALTIME_PATH,
  transports: ['websocket'],
  addTrailingSlash: false,
} as const;

/** Eventos que el servidor emite. El cliente no emite ninguno. */
export const REALTIME_EVENTS = {
  VM_STATUS_CHANGED: 'vm:status-changed',
} as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

/** Un `PUT /api/vms/:id` cambió el estado de la VM: `item` es la misma VM que devolvió el `PUT`. */
export interface VmStatusChangedEvent {
  item: VirtualMachine;
}

/** Eventos servidor → cliente, para tipar el `Server` del backend y el `Socket` del frontend. */
export interface ServerToClientEvents {
  [REALTIME_EVENTS.VM_STATUS_CHANGED]: (event: VmStatusChangedEvent) => void;
}

/** Canal de solo bajada: el servidor no atiende ningún evento del cliente. */
export type ClientToServerEvents = Record<string, never>;

/**
 * `data` del `connect_error` cuando el handshake se rechaza por la sesión: la misma forma que el
 * error REST (`UNAUTHENTICATED` con el mensaje de `auth`, o `INTERNAL_ERROR`).
 */
export type RealtimeConnectionErrorData = ApiErrorBody['error'];
