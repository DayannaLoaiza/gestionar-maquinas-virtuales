import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { ROLES, VM_STATUSES } from '@vm/shared-types';

import { RealtimeSessionMonitor } from '@/modules/realtime/realtime-session-monitor';

import { seedUser, setUserActive } from './support/auth-helpers';
import {
  closeAllSockets,
  connectSocket,
  listenOnEphemeralPort,
  recordStatusEvents,
  sessionCookieFor,
  waitForDisconnect,
} from './support/socket-helpers';
import { createTestApp } from './support/test-app';
import { clearVms, createVm, itemOf, listVms, NONEXISTENT_VM_ID } from './support/vm-helpers';

import type { TestUser } from './support/auth-helpers';
import type { INestApplication } from '@nestjs/common';
import type { VirtualMachine } from '@vm/shared-types';
import type { App } from 'supertest/types';

const ADMIN: TestUser = { email: 'admin@example.com', password: 'Admin-e2e-1', role: ROLES.ADMIN };
const CLIENT: TestUser = {
  email: 'cliente@example.com',
  password: 'Cliente-e2e-1',
  role: ROLES.CLIENT,
};
/** Usuarios propios de RF-08: su sesión vence o se desactivan dentro del test. */
const EXPIRING: TestUser = {
  email: 'vence@example.com',
  password: 'Vence-e2e-1',
  role: ROLES.CLIENT,
};
const DEACTIVATED: TestUser = {
  email: 'desactivado@example.com',
  password: 'Desactivado-e2e-1',
  role: ROLES.CLIENT,
};

let app: INestApplication<App>;
let baseUrl: string;
let adminCookie: string;
let clientCookie: string;

beforeAll(async () => {
  app = await createTestApp();
  baseUrl = await listenOnEphemeralPort(app);
  for (const user of [ADMIN, CLIENT, EXPIRING, DEACTIVATED]) await seedUser(app, user);
  adminCookie = await sessionCookieFor(app, ADMIN);
  clientCookie = await sessionCookieFor(app, CLIENT);
});

beforeEach(async () => {
  await clearVms(app);
});

afterEach(() => {
  closeAllSockets();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await app.close();
});

function putVm(id: string, body: Record<string, unknown>, cookie = adminCookie): request.Test {
  return request(app.getHttpServer()).put(`/api/vms/${id}`).set('Cookie', cookie).send(body);
}

/**
 * Centinela: un cambio de estado que sí se difunde. Si una acción anterior hubiera emitido, ese
 * evento llegaría antes que el del centinela: así se afirma "ningún evento" sin esperar un tiempo
 * fijo.
 */
async function flipSentinel(sentinel: VirtualMachine): Promise<VirtualMachine> {
  const status = sentinel.status === VM_STATUSES.ON ? VM_STATUSES.OFF : VM_STATUSES.ON;
  return itemOf(await putVm(sentinel.id, { status }).expect(200));
}

async function expireSessionsOf(user: TestUser): Promise<void> {
  await app.get(DataSource).query(
    `UPDATE sessions SET last_used_at = now() - interval '8 days'
     WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
    [user.email],
  );
}

describe('RF-realtime-vm-status-05 — un cambio de estado llega a todas las conexiones', () => {
  it('una vez a cada conexión de los dos roles, con la VM que devolvió el PUT', async () => {
    const vm = await createVm(app, adminCookie);
    const sentinel = await createVm(app, adminCookie, { name: 'centinela' });
    const sockets = await Promise.all([
      connectSocket(baseUrl, { cookie: clientCookie }),
      connectSocket(baseUrl, { cookie: adminCookie }),
      connectSocket(baseUrl, { cookie: adminCookie }),
    ]);
    const recorders = sockets.map(recordStatusEvents);

    const updated = itemOf(await putVm(vm.id, { status: VM_STATUSES.ON }).expect(200));
    await flipSentinel(sentinel);
    await Promise.all(recorders.map((recorder) => recorder.waitForCount(2)));

    for (const recorder of recorders) {
      expect(recorder.events.map((event) => event.item.id)).toEqual([vm.id, sentinel.id]);
      expect(recorder.events[0]?.item).toEqual(updated);
    }
    const stored = (await listVms(app, clientCookie)).find((item) => item.id === vm.id);
    expect(stored).toEqual(updated);
  });

  it('si el mismo PUT cambia el estado y el nombre, el evento lleva el nombre nuevo', async () => {
    const vm = await createVm(app, adminCookie);
    const recorder = recordStatusEvents(await connectSocket(baseUrl, { cookie: clientCookie }));

    await putVm(vm.id, { status: VM_STATUSES.ON, name: 'web-renombrada' }).expect(200);
    await recorder.waitForCount(1);

    expect(recorder.events[0]?.item).toMatchObject({
      id: vm.id,
      name: 'web-renombrada',
      status: VM_STATUSES.ON,
    });
  });

  it('dos PUT simultáneos a Encendida producen un solo evento', async () => {
    const vm = await createVm(app, adminCookie);
    const sentinel = await createVm(app, adminCookie, { name: 'centinela' });
    const recorder = recordStatusEvents(await connectSocket(baseUrl, { cookie: clientCookie }));

    await Promise.all([
      putVm(vm.id, { status: VM_STATUSES.ON }).expect(200),
      putVm(vm.id, { status: VM_STATUSES.ON }).expect(200),
    ]);
    await flipSentinel(sentinel);
    await recorder.waitForCount(2);

    expect(recorder.events.map((event) => event.item.id)).toEqual([vm.id, sentinel.id]);
  });
});

describe('RF-realtime-vm-status-06 — sin cambio real de estado, ningún evento', () => {
  it.each<[string, (vm: VirtualMachine) => Promise<unknown>]>([
    ['un PUT sin status', (vm) => putVm(vm.id, { ram: 8 }).expect(200)],
    ['un PUT con el mismo status', (vm) => putVm(vm.id, { status: VM_STATUSES.OFF }).expect(200)],
    [
      'un PUT inválido (400)',
      (vm) => putVm(vm.id, { status: VM_STATUSES.ON, cores: 0 }).expect(400),
    ],
    [
      'un PUT del Cliente (403)',
      (vm) => putVm(vm.id, { status: VM_STATUSES.ON }, clientCookie).expect(403),
    ],
    [
      'un PUT a un id inexistente (404)',
      () => putVm(NONEXISTENT_VM_ID, { status: VM_STATUSES.ON }).expect(404),
    ],
    [
      'un PUT con un nombre tomado (409)',
      (vm) => putVm(vm.id, { status: VM_STATUSES.ON, name: 'centinela' }).expect(409),
    ],
    [
      'un POST de una VM Encendida',
      () => createVm(app, adminCookie, { name: 'nueva', status: VM_STATUSES.ON }),
    ],
    [
      'un DELETE de una VM encendida',
      async () => {
        const running = await createVm(app, adminCookie, { name: 'enc', status: VM_STATUSES.ON });
        await request(app.getHttpServer())
          .delete(`/api/vms/${running.id}`)
          .set('Cookie', adminCookie)
          .expect(204);
      },
    ],
  ])('%s', async (_case, action) => {
    const vm = await createVm(app, adminCookie);
    const sentinel = await createVm(app, adminCookie, { name: 'centinela' });
    const recorder = recordStatusEvents(await connectSocket(baseUrl, { cookie: clientCookie }));

    await action(vm);
    await flipSentinel(sentinel);
    await recorder.waitForCount(1);

    expect(recorder.events.map((event) => event.item.id)).toEqual([sentinel.id]);
  });
});

describe('RF-realtime-vm-status-07 — si la difusión falla, el PUT no cambia', () => {
  it('responde 200, guarda el cambio y deja el error en el log', async () => {
    const vm = await createVm(app, adminCookie);
    const recorder = recordStatusEvents(await connectSocket(baseUrl, { cookie: clientCookie }));
    jest.spyOn(Server.prototype, 'to').mockImplementation(() => {
      throw new Error('fallo de difusión');
    });
    const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const updated = itemOf(await putVm(vm.id, { status: VM_STATUSES.ON }).expect(200));
    const stored = (await listVms(app, adminCookie)).find((item) => item.id === vm.id);

    expect(updated.status).toBe(VM_STATUSES.ON);
    expect(stored?.status).toBe(VM_STATUSES.ON);
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining(vm.id), expect.any(String));

    jest.restoreAllMocks();
    await putVm(vm.id, { status: VM_STATUSES.OFF }).expect(200);
    await recorder.waitForCount(1);
    expect(recorder.events.map((event) => event.item.status)).toEqual([VM_STATUSES.OFF]);
  });
});

describe('RF-realtime-vm-status-08 — una sesión que termina cierra sus conexiones', () => {
  it('el logout cierra al instante las conexiones de esa sesión y no las de otra', async () => {
    const sentinel = await createVm(app, adminCookie, { name: 'centinela' });
    const session = await sessionCookieFor(app, ADMIN);
    const otherSession = await sessionCookieFor(app, ADMIN);
    const [tabA, tabB, otherBrowser] = await Promise.all([
      connectSocket(baseUrl, { cookie: session }),
      connectSocket(baseUrl, { cookie: session }),
      connectSocket(baseUrl, { cookie: otherSession }),
    ]);
    const closed = Promise.all([waitForDisconnect(tabA), waitForDisconnect(tabB)]);
    const recorder = recordStatusEvents(otherBrowser);

    await request(app.getHttpServer()).post('/api/auth/logout').set('Cookie', session).expect(200);

    expect(await closed).toEqual(['io server disconnect', 'io server disconnect']);
    await flipSentinel(sentinel);
    await recorder.waitForCount(1);
    expect(otherBrowser.connected).toBe(true);
  });

  it('una ronda del monitor cierra la conexión de una sesión vencida y deja la válida', async () => {
    const sentinel = await createVm(app, adminCookie, { name: 'centinela' });
    const expiring = await connectSocket(baseUrl, {
      cookie: await sessionCookieFor(app, EXPIRING),
    });
    const valid = await connectSocket(baseUrl, { cookie: clientCookie });
    const closed = waitForDisconnect(expiring);
    const recorder = recordStatusEvents(valid);

    await expireSessionsOf(EXPIRING);
    await app.get(RealtimeSessionMonitor).revalidateOpenSessions();

    expect(await closed).toBe('io server disconnect');
    await flipSentinel(sentinel);
    await recorder.waitForCount(1);
    expect(valid.connected).toBe(true);
  });

  it('una ronda del monitor cierra la conexión de un usuario desactivado', async () => {
    const socket = await connectSocket(baseUrl, {
      cookie: await sessionCookieFor(app, DEACTIVATED),
    });
    const closed = waitForDisconnect(socket);

    await setUserActive(app, DEACTIVATED.email, false);
    try {
      await app.get(RealtimeSessionMonitor).revalidateOpenSessions();
      expect(await closed).toBe('io server disconnect');
    } finally {
      await setUserActive(app, DEACTIVATED.email, true);
    }
  });
});
