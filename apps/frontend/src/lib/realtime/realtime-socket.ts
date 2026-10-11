import { io } from 'socket.io-client';

import { REALTIME_CLIENT_OPTIONS } from '@vm/shared-types';

import type { ClientToServerEvents, ServerToClientEvents } from '@vm/shared-types';
import type { ManagerOptions, Socket, SocketOptions } from 'socket.io-client';

export type RealtimeClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Opciones del socket (RF-realtime-vm-status-11): las del contrato (`/api/socket.io` sin barra
 * final, solo WebSocket) y `autoConnect: false`, para conectar cuando los listeners ya están
 * puestos. Sin `auth`, `query` ni `extraHeaders`: la sesión viaja solo en la cookie que pone el
 * navegador.
 */
export function realtimeSocketOptions(): Partial<ManagerOptions & SocketOptions> {
  return {
    path: REALTIME_CLIENT_OPTIONS.path,
    transports: [...REALTIME_CLIENT_OPTIONS.transports],
    addTrailingSlash: REALTIME_CLIENT_OPTIONS.addTrailingSlash,
    autoConnect: false,
  };
}

/** El socket del panel, al mismo origen: sin URL, `io` usa la de la página (RF-app-shell-14). */
export function createRealtimeSocket(): RealtimeClientSocket {
  return io(realtimeSocketOptions());
}
