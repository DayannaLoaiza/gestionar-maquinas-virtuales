import { afterEach, describe, expect, it, vi } from 'vitest';

import { REALTIME_EVENTS, VM_STATUSES } from '@vm/shared-types';

import { apiFail, stubApi } from '@/test/api-test-utils';
import { FakeSocket } from '@/test/fake-socket';
import { makeVm } from '@/test/vm-fixtures';

import { createRealtimeConnection } from './realtime-connection';

import type { RealtimeConnectionDeps, RealtimeStatus } from './realtime-connection';

/** Una conexión con un socket falso y bordes registrados. */
function connect(overrides: Partial<RealtimeConnectionDeps> = {}) {
  const socket = new FakeSocket();
  const statuses: RealtimeStatus[] = [];
  const scheduled: { callback: () => void; delayMs: number }[] = [];
  const deps = {
    createSocket: () => socket.asSocket(),
    onVmChanged: vi.fn(),
    onResync: vi.fn(),
    onStatus: (status: RealtimeStatus) => {
      statuses.push(status);
    },
    checkSession: vi.fn(() => Promise.resolve()),
    onSessionExpired: vi.fn(),
    schedule: (callback: () => void, delayMs: number) => {
      scheduled.push({ callback, delayMs });
      return () => undefined;
    },
    ...overrides,
  };
  const connection = createRealtimeConnection(deps);
  return { socket, statuses, scheduled, deps, connection };
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('RF-realtime-vm-status-11 una conexión que solo escucha', () => {
  it('conecta una vez al crearse y nunca emite eventos', () => {
    const { socket, connection } = connect();
    socket.trigger('connect');
    socket.trigger(REALTIME_EVENTS.VM_STATUS_CHANGED, { item: makeVm() });
    connection.close();

    expect(socket.connectCalls).toBe(1);
    expect(socket.emitted).toEqual([]);
  });

  it('al cerrarla no reintenta ni cambia de estado', () => {
    const { socket, statuses, connection } = connect();

    connection.close();

    expect(socket.connectCalls).toBe(1);
    expect(statuses).toEqual(['connecting']);
  });
});

describe('RF-realtime-vm-status-12 solo entrega eventos válidos', () => {
  it('entrega la VM de un evento válido e ignora uno con otra forma', () => {
    const { socket, deps } = connect();

    socket.trigger(REALTIME_EVENTS.VM_STATUS_CHANGED, { item: makeVm({ status: VM_STATUSES.ON }) });
    socket.trigger(REALTIME_EVENTS.VM_STATUS_CHANGED, { item: { id: 'x', status: 'encendida' } });

    expect(deps.onVmChanged).toHaveBeenCalledTimes(1);
    expect(deps.onVmChanged).toHaveBeenCalledWith(makeVm({ status: VM_STATUSES.ON }));
  });
});

describe('RF-realtime-vm-status-14 resincroniza en cada conexión', () => {
  it('pide el listado la primera vez y en cada reconexión', () => {
    const { socket, deps, statuses } = connect();

    socket.trigger('connect');
    socket.active = true;
    socket.trigger('disconnect', 'transport close');
    socket.trigger('connect');

    expect(deps.onResync).toHaveBeenCalledTimes(2);
    expect(statuses).toEqual(['connecting', 'live', 'connecting', 'live']);
  });
});

/**
 * La conexión con el cableado real del fin de sesión (el del `RealtimeProvider`): la verificación
 * de `/api/auth/me` y la navegación a `/login`, con la red y `location` como bordes. Módulos nuevos
 * en cada test: la navegación a `/login` ocurre una sola vez por documento.
 */
async function connectWithRealSession() {
  vi.resetModules();
  const { createRealtimeConnection: create } = await import('./realtime-connection');
  const { handleSessionExpired } = await import('@/lib/auth/session-navigation');
  const { checkRealtimeSession } = await import('./realtime-session');
  const { get } = await import('@/lib/api/fetch-wrapper');
  const replace = vi.fn();
  vi.stubGlobal('location', { replace });
  const socket = new FakeSocket();
  const scheduled: number[] = [];
  create({
    createSocket: () => socket.asSocket(),
    onVmChanged: vi.fn(),
    onResync: vi.fn(),
    onStatus: vi.fn(),
    checkSession: checkRealtimeSession,
    onSessionExpired: handleSessionExpired,
    schedule: (_callback, delayMs) => {
      scheduled.push(delayMs);
      return () => undefined;
    },
  });
  return { socket, replace, scheduled, get };
}

const SESSION_EXPIRED_URL = '/login?aviso=sesion-expirada';
const UNAUTHENTICATED = apiFail(401, 'UNAUTHENTICATED', 'Tu sesión expiró');

describe('RF-realtime-vm-status-15 fin de la sesión', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('un rechazo UNAUTHENTICATED lleva a /login una sola vez, aunque coincida con un 401', async () => {
    stubApi({ 'GET /api/vms': [UNAUTHENTICATED] });
    const { socket, replace, scheduled, get } = await connectWithRealSession();

    socket.rejectHandshake({ code: 'UNAUTHENTICATED', message: 'Tu sesión expiró' });
    await get('/api/vms').catch(() => undefined);

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(SESSION_EXPIRED_URL);
    expect(scheduled).toEqual([]);
    expect(socket.connectCalls).toBe(1);
  });

  it('tras un cierre del servidor, /me con 401 lleva a /login y no reconecta ni reintenta', async () => {
    const fetchMock = stubApi({ 'GET /api/auth/me': [UNAUTHENTICATED] });
    const { socket, replace, scheduled } = await connectWithRealSession();
    socket.trigger('connect');

    socket.trigger('disconnect', 'io server disconnect');
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(SESSION_EXPIRED_URL);
    expect(socket.connectCalls).toBe(1);
    expect(scheduled).toEqual([]);
  });

  it('tras un cierre del servidor con la sesión válida, reconecta enseguida y después espera', async () => {
    const { socket, deps, scheduled } = connect();
    socket.trigger('connect');

    socket.trigger('disconnect', 'io server disconnect');
    await flushPromises();
    socket.trigger('connect');
    socket.trigger('disconnect', 'io server disconnect');
    await flushPromises();

    expect(deps.checkSession).toHaveBeenCalledTimes(2);
    expect(socket.connectCalls).toBe(2);
    expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([1000]);
  });

  it('un rechazo INTERNAL_ERROR no lleva a /login: reintenta con espera creciente hasta 30 s', () => {
    const { socket, deps, scheduled, statuses } = connect();

    for (let attempt = 0; attempt < 7; attempt += 1) {
      socket.rejectHandshake({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
      scheduled.at(-1)?.callback();
    }

    expect(deps.onSessionExpired).not.toHaveBeenCalled();
    expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([
      1000, 2000, 4000, 8000, 16_000, 30_000, 30_000,
    ]);
    expect(statuses).toContain('offline');
    expect(socket.connectCalls).toBe(8);
  });
});
