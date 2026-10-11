import { REALTIME_PATH } from '@vm/shared-types';

import type { ServerOptions } from 'socket.io';

/**
 * Sala de todas las conexiones autenticadas: cada evento se emite una vez a la sala
 * (RNF-realtime-vm-status-01).
 */
export const VMS_ROOM = 'vms';

/** Sala de las conexiones de una sesión, para cerrarlas juntas (RF-realtime-vm-status-08). */
export function sessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}

/**
 * Cada cuánto se revalidan las sesiones con conexiones abiertas. La spec admite hasta 60 s
 * (RF-realtime-vm-status-08); con 30 s, el intervalo más la duración de una ronda queda por debajo.
 */
export const SESSION_REVALIDATION_INTERVAL_MS = 30_000;

/** Tamaño máximo de un mensaje entrante: el canal es de solo bajada (RF-realtime-vm-status-09). */
export const MAX_INCOMING_MESSAGE_BYTES = 1024;

/**
 * Opciones fijas del servidor (RF-realtime-vm-status-01, 09). Viven junto al gateway para que, aun
 * sin `RealtimeIoAdapter`, no haya polling ni un `/socket.io` público. Las que dependen de la
 * configuración (`cors`, `allowRequest`) las agrega el adapter.
 *
 * `addTrailingSlash: false`: Engine.IO compara la ruta por prefijo, así que acepta
 * `/api/socket.io?…`, que es lo que pide el cliente (`REALTIME_CLIENT_OPTIONS`) para pasar por el
 * rewrite de Next, y también `/api/socket.io/?…`. Tipado con `ServerOptions` de Socket.io porque
 * `GatewayMetadata` de Nest no declara esa opción.
 */
export const REALTIME_GATEWAY_OPTIONS = {
  path: REALTIME_PATH,
  transports: ['websocket'],
  serveClient: false,
  addTrailingSlash: false,
  maxHttpBufferSize: MAX_INCOMING_MESSAGE_BYTES,
} satisfies Partial<ServerOptions>;
