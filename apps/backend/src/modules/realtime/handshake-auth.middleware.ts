import {
  UNAUTHENTICATED_ERROR,
  UnauthenticatedException,
} from '@/shared/exceptions/auth.exceptions';

import type { RealtimeSocket } from './realtime.types';
import type { AuthService } from '@/modules/auth/auth.service';
import type { SessionCookieService } from '@/modules/auth/session-cookie.service';
import type { Logger } from '@nestjs/common';
import type { RealtimeConnectionErrorData } from '@vm/shared-types';
import type { ExtendedError } from 'socket.io';

export interface HandshakeAuthDependencies {
  authService: AuthService;
  sessionCookie: SessionCookieService;
  logger: Logger;
}

type HandshakeMiddleware = (socket: RealtimeSocket, next: (error?: ExtendedError) => void) => void;

/** Un 5xx nunca muestra su causa: el error real va solo al log. */
const INTERNAL_ERROR: RealtimeConnectionErrorData = {
  message: 'Internal server error',
  code: 'INTERNAL_ERROR',
};

/**
 * Middleware del handshake (`server.use`): autentica cada conexión con la cookie de sesión, con
 * las reglas de RF-auth-06 y sin renovar la sesión (RF-realtime-vm-status-02, 03). Si la rechaza,
 * el cliente recibe `connect_error` con `data` `{ message, code }` y la conexión no entra a
 * ninguna sala.
 *
 * Una conexión WebSocket hace un solo handshake (RF-realtime-vm-status-09). Socket.io marca la
 * conexión como unida al namespace recién cuando termina este middleware asíncrono. Mientras tanto,
 * cada `CONNECT` repetido por la misma conexión lanzaría otro handshake, con su consulta a la base.
 * Por eso cada conexión se registra de forma síncrona, antes de consultar.
 */
export function createHandshakeAuth(dependencies: HandshakeAuthDependencies): HandshakeMiddleware {
  const connectionsWithHandshake = new WeakSet<RealtimeSocket['conn']>();
  return (socket, next) => {
    if (connectionsWithHandshake.has(socket.conn)) {
      rejectRepeatedConnect(socket, next, dependencies.logger);
      return;
    }
    connectionsWithHandshake.add(socket.conn);

    authenticateSocket(socket, dependencies).then(
      () => {
        next();
      },
      (error: unknown) => {
        next(toHandshakeError(error, socket, dependencies.logger));
      },
    );
  };
}

/**
 * Cierra la conexión sin consultar la sesión. Una ráfaga deja una sola línea de log: tras el
 * primer cierre, la conexión ya no está `open`.
 */
function rejectRepeatedConnect(
  socket: RealtimeSocket,
  next: (error?: ExtendedError) => void,
  logger: Logger,
): void {
  if (socket.conn.readyState === 'open') {
    logger.warn(`Socket cerrado: CONNECT repetido en la conexión (ip=${socket.handshake.address})`);
    socket.conn.close();
  }
  // Con la conexión cerrada, Socket.io solo descarta el socket: este error no llega al cliente.
  next(new Error('CONNECT repetido'));
}

/**
 * El token se lee **solo** de la cookie: el `auth` del handshake, la query y `Authorization` no se
 * miran (RF-realtime-vm-status-03).
 */
async function authenticateSocket(
  socket: RealtimeSocket,
  { authService, sessionCookie }: HandshakeAuthDependencies,
): Promise<void> {
  const token = sessionCookie.read(socket.request);
  if (!token) throw new UnauthenticatedException();

  const { user, sessionId } = await authService.verifySession(token);
  socket.data = { user, sessionId };
}

/**
 * Una sesión inválida sale como `UNAUTHENTICATED`, con el mismo mensaje que el `401`. Cualquier
 * otra falla (p. ej., la base caída) sale como `INTERNAL_ERROR`: nunca como `UNAUTHENTICATED`, que
 * haría al frontend mandar a iniciar sesión a alguien con una sesión válida.
 */
function toHandshakeError(error: unknown, socket: RealtimeSocket, logger: Logger): ExtendedError {
  const ip = socket.handshake.address;
  if (error instanceof UnauthenticatedException) {
    logger.warn(`Socket rechazado: sesión inválida (ip=${ip})`);
    return withData({ ...UNAUTHENTICATED_ERROR });
  }

  logger.error(
    `Socket rechazado por un error interno (ip=${ip})`,
    error instanceof Error ? error.stack : undefined,
  );
  return withData(INTERNAL_ERROR);
}

function withData(data: RealtimeConnectionErrorData): ExtendedError {
  return Object.assign(new Error(data.message), { data });
}
