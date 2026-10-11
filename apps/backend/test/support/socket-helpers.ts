import { randomBytes } from 'node:crypto';
import { request as httpRequest, Server as HttpServer } from 'node:http';

import { io } from 'socket.io-client';

import { REALTIME_CLIENT_OPTIONS, REALTIME_EVENTS, REALTIME_PATH } from '@vm/shared-types';

import { AuthService } from '@/modules/auth/auth.service';

import { SESSION_COOKIE_NAME } from './auth-helpers';
import { TEST_ALLOWED_ORIGIN } from './test-constants';

import type { TestUser } from './auth-helpers';
import type { INestApplication } from '@nestjs/common';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  VmStatusChangedEvent,
} from '@vm/shared-types';
import type { IncomingHttpHeaders } from 'node:http';
import type { Socket } from 'socket.io-client';
import type { App } from 'supertest/types';

export type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Lo que espera un helper antes de fallar: mucho menos que el timeout de Jest (30 s). */
const WAIT_TIMEOUT_MS = 5000;

const openSockets = new Set<Socket>();

/** `socket.io-client` necesita una URL real: la app escucha en un puerto efímero del loopback. */
export async function listenOnEphemeralPort(app: INestApplication<App>): Promise<string> {
  await app.listen(0, '127.0.0.1');
  const server: unknown = app.getHttpServer();
  if (!(server instanceof HttpServer)) throw new Error('La app no expone un servidor HTTP');
  const address = server.address();
  if (typeof address !== 'object' || address === null) throw new Error('Sin dirección de escucha');
  return `http://127.0.0.1:${String(address.port)}`;
}

/**
 * Cookie de una sesión nueva, creada con el service y no por `POST /api/auth/login`: el rate limit
 * del login (5 por minuto) no deja crear las sesiones que necesita un archivo de tests.
 */
export async function sessionCookieFor(
  app: INestApplication<App>,
  user: TestUser,
): Promise<string> {
  const { issuedToken } = await app.get(AuthService).login(user, '127.0.0.1');
  return `${SESSION_COOKIE_NAME}=${issuedToken.token}`;
}

export interface OpenSocketOptions {
  cookie?: string;
  /** `null`: sin cabecera `Origin`. Por defecto, el origen permitido. */
  origin?: string | null;
  auth?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * Abre una conexión como lo hará el frontend, con `REALTIME_CLIENT_OPTIONS`: solo WebSocket y la
 * ruta sin barra final, la única que pasa por el rewrite de Next.
 */
export function openSocket(baseUrl: string, options: OpenSocketOptions = {}): TestSocket {
  const headers: Record<string, string> = { ...options.headers };
  if (options.cookie !== undefined) headers.cookie = options.cookie;
  const origin = options.origin === undefined ? TEST_ALLOWED_ORIGIN : options.origin;
  if (origin !== null) headers.origin = origin;

  const socket: TestSocket = io(baseUrl, {
    ...REALTIME_CLIENT_OPTIONS,
    transports: [...REALTIME_CLIENT_OPTIONS.transports],
    reconnection: false,
    forceNew: true,
    extraHeaders: headers,
    auth: options.auth ?? {},
    query: options.query ?? {},
  });
  openSockets.add(socket);
  return socket;
}

/** Abre una conexión y espera a que el servidor la acepte. */
export async function connectSocket(
  baseUrl: string,
  options: OpenSocketOptions = {},
): Promise<TestSocket> {
  const socket = openSocket(baseUrl, options);
  await waitForConnect(socket);
  return socket;
}

/** Para `afterEach`: cierra todas las conexiones que abrieron los tests. */
export function closeAllSockets(): void {
  for (const socket of openSockets) socket.disconnect();
  openSockets.clear();
}

export function waitForConnect(socket: Socket): Promise<void> {
  return withTimeout('connect', (resolve, reject) => {
    socket.once('connect', () => {
      resolve();
    });
    socket.once('connect_error', (error) => {
      reject(error);
    });
  });
}

/** El `connect_error` de un handshake rechazado, con su `data` si la trae. */
export function waitForConnectError(socket: Socket): Promise<Error & { data?: unknown }> {
  return withTimeout('connect_error', (resolve, reject) => {
    socket.once('connect', () => {
      reject(new Error('El servidor aceptó una conexión que debía rechazar'));
    });
    socket.once('connect_error', resolve);
  });
}

/** El motivo de la desconexión (p. ej. `io server disconnect`). */
export function waitForDisconnect(socket: Socket): Promise<string> {
  return withTimeout('disconnect', (resolve) => {
    socket.once('disconnect', (reason) => {
      resolve(reason);
    });
  });
}

/** El cierre de la conexión Engine.IO de un socket que todavía no terminó su handshake. */
export function waitForConnectionClose(socket: Socket): Promise<string> {
  return withTimeout('el cierre de la conexión', (resolve) => {
    socket.io.engine.once('close', (reason) => {
      resolve(reason);
    });
  });
}

/** Registra cada `vm:status-changed` que recibe una conexión, en orden de llegada. */
export interface EventRecorder {
  readonly events: VmStatusChangedEvent[];
  /** Espera hasta haber recibido `count` eventos en total. */
  waitForCount(count: number): Promise<void>;
}

export function recordStatusEvents(socket: TestSocket): EventRecorder {
  const events: VmStatusChangedEvent[] = [];
  const waiters: (() => void)[] = [];
  socket.on(REALTIME_EVENTS.VM_STATUS_CHANGED, (event) => {
    events.push(event);
    for (const wake of waiters.splice(0)) wake();
  });

  const waitForCount = (count: number): Promise<void> =>
    withTimeout(`${String(count)} eventos`, (resolve) => {
      const check = (): void => {
        if (events.length >= count) resolve();
        else waiters.push(check);
      };
      check();
    });
  return { events, waitForCount };
}

export interface RawUpgradeResponse {
  statusCode: number;
  headers: IncomingHttpHeaders;
}

/**
 * Upgrade a WebSocket hecho a mano, para leer las cabeceras de la respuesta (el `101` o el
 * rechazo), que `socket.io-client` no expone.
 */
export function rawUpgrade(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<RawUpgradeResponse> {
  return withTimeout('upgrade', (resolve, reject) => {
    const request = httpRequest(`${baseUrl}${REALTIME_PATH}?EIO=4&transport=websocket`, {
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
        ...headers,
      },
    });
    request.on('upgrade', (response, socket) => {
      socket.destroy();
      resolve({ statusCode: response.statusCode ?? 0, headers: response.headers });
    });
    request.on('response', (response) => {
      response.resume();
      resolve({ statusCode: response.statusCode ?? 0, headers: response.headers });
    });
    request.on('error', reject);
    request.end();
  });
}

function withTimeout<T>(
  label: string,
  executor: (resolve: (value: T) => void, reject: (error: unknown) => void) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout esperando ${label}`));
    }, WAIT_TIMEOUT_MS);
    executor(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
