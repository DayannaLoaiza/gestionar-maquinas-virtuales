import { REALTIME_EVENTS } from '@vm/shared-types';

import { isApiErrorStatus } from '@/lib/api/api-error';

import { nextReconnectDelay } from './reconnect-delay';
import { readVmStatusChangedEvent } from './vm-status-event';

import type { RealtimeClientSocket } from './realtime-socket';
import type { VirtualMachine } from '@vm/shared-types';

/** Lo que muestra el indicador del panel (RF-realtime-vm-status-16). */
export type RealtimeStatus = 'connecting' | 'live' | 'offline';

export interface RealtimeConnectionDeps {
  createSocket: () => RealtimeClientSocket;
  /** Un `vm:status-changed` válido (RF-realtime-vm-status-12). */
  onVmChanged: (vm: VirtualMachine) => void;
  /** La conexión se estableció: volver a pedir el listado (RF-realtime-vm-status-14). */
  onResync: () => void;
  onStatus: (status: RealtimeStatus) => void;
  /** `GET /api/auth/me`. Con `401`, `fetch-wrapper` ya lleva a `/login` y la promesa se rechaza. */
  checkSession: () => Promise<void>;
  /** La sesión expiró: carga completa de `/login` con el aviso (RF-auth-26). */
  onSessionExpired: () => void;
  /** Programa un reintento; devuelve cómo cancelarlo. */
  schedule: (callback: () => void, delayMs: number) => () => void;
}

const UNAUTHENTICATED_CODE = 'UNAUTHENTICATED';
const UNAUTHORIZED = 401;
/** El servidor cerró la conexión: Socket.io no reintenta solo (`socket.active` es `false`). */
const SERVER_DISCONNECT = 'io server disconnect';
const CLIENT_DISCONNECT = 'io client disconnect';

/** El `code` del `data` de un rechazo del handshake (RF-realtime-vm-status-03), si lo trae. */
function connectErrorCode(error: Error): string | undefined {
  if (!('data' in error) || typeof error.data !== 'object' || error.data === null) return undefined;
  return 'code' in error.data && typeof error.data.code === 'string' ? error.data.code : undefined;
}

interface ConnectionState {
  attempt: number;
  cancelRetry: (() => void) | null;
  isClosed: boolean;
  /** Cierres del servidor con la sesión válida en la vida de la conexión. */
  serverClosures: number;
}

/** Rechazo que no es de sesión (p. ej., `INTERNAL_ERROR`): reintentar con espera creciente. */
function retryLater(
  socket: RealtimeClientSocket,
  deps: RealtimeConnectionDeps,
  state: ConnectionState,
) {
  if (state.isClosed) return;
  deps.onStatus('offline');
  state.cancelRetry?.();
  state.cancelRetry = deps.schedule(() => {
    state.cancelRetry = null;
    deps.onStatus('connecting');
    socket.connect();
  }, nextReconnectDelay(state.attempt));
  state.attempt += 1;
}

/**
 * Con la sesión válida tras un cierre del servidor: la primera vez se reconecta enseguida; si el
 * servidor vuelve a cerrar, se espera cada vez más (1 s … 30 s), así un error del backend que cierre
 * cada conexión no se convierte en un bucle de pedidos.
 */
function reconnectAfterServerClosure(
  socket: RealtimeClientSocket,
  deps: RealtimeConnectionDeps,
  state: ConnectionState,
): void {
  const previousClosures = state.serverClosures;
  state.serverClosures += 1;
  if (previousClosures === 0) {
    socket.connect();
    return;
  }
  state.cancelRetry?.();
  state.cancelRetry = deps.schedule(
    () => {
      state.cancelRetry = null;
      socket.connect();
    },
    nextReconnectDelay(previousClosures - 1),
  );
}

/**
 * Tras un cierre del servidor (logout, sesión vencida, usuario desactivado): sin sesión,
 * `fetch-wrapper` ya lleva a `/login` y no se reintenta; con sesión, se reconecta.
 */
async function verifySessionAndReconnect(
  socket: RealtimeClientSocket,
  deps: RealtimeConnectionDeps,
  state: ConnectionState,
): Promise<void> {
  try {
    await deps.checkSession();
  } catch (error: unknown) {
    if (!isApiErrorStatus(error, UNAUTHORIZED)) retryLater(socket, deps, state);
    return;
  }
  if (!state.isClosed) reconnectAfterServerClosure(socket, deps, state);
}

function handleConnectError(
  error: Error,
  socket: RealtimeClientSocket,
  deps: RealtimeConnectionDeps,
  state: ConnectionState,
): void {
  if (socket.active) {
    deps.onStatus('connecting');
    return;
  }
  if (connectErrorCode(error) === UNAUTHENTICATED_CODE) {
    deps.onSessionExpired();
    return;
  }
  retryLater(socket, deps, state);
}

function listen(
  socket: RealtimeClientSocket,
  deps: RealtimeConnectionDeps,
  state: ConnectionState,
) {
  socket.on('connect', () => {
    state.attempt = 0;
    deps.onStatus('live');
    deps.onResync();
  });
  socket.on('connect_error', (error) => {
    handleConnectError(error, socket, deps, state);
  });
  socket.on('disconnect', (reason) => {
    if (state.isClosed || reason === CLIENT_DISCONNECT) return;
    deps.onStatus('connecting');
    if (reason === SERVER_DISCONNECT) void verifySessionAndReconnect(socket, deps, state);
  });
  socket.on(REALTIME_EVENTS.VM_STATUS_CHANGED, (payload: unknown) => {
    const vm = readVmStatusChangedEvent(payload);
    if (vm !== null) deps.onVmChanged(vm);
  });
}

/**
 * La conexión de tiempo real de una pestaña (RF-realtime-vm-status-11…16; hallazgo V5). El cliente
 * de Socket.io reconecta solo ante una caída de red o un reinicio del backend, pero no tras un
 * rechazo del middleware del handshake ni tras un cierre del servidor: esos casos se manejan acá.
 * El cliente nunca emite eventos (RF-realtime-vm-status-09).
 */
export function createRealtimeConnection(deps: RealtimeConnectionDeps): { close: () => void } {
  const socket = deps.createSocket();
  const state: ConnectionState = {
    attempt: 0,
    cancelRetry: null,
    isClosed: false,
    serverClosures: 0,
  };
  listen(socket, deps, state);
  deps.onStatus('connecting');
  socket.connect();

  return {
    close: () => {
      state.isClosed = true;
      state.cancelRetry?.();
      socket.disconnect();
    },
  };
}
