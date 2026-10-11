import type { AuthUser, ClientToServerEvents, ServerToClientEvents } from '@vm/shared-types';
import type { Server, Socket } from 'socket.io';

/** Lo que el handshake deja en `socket.data`. Solo del servidor: nunca se envía al cliente. */
export interface SocketData {
  user: AuthUser;
  sessionId: string;
}

/** Sin eventos entre instancias: hay una sola (spec, "Fuera de alcance"). */
type InterServerEvents = Record<string, never>;

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
