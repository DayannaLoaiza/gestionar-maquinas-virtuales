import { Logger } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { REALTIME_PATH, ROLES, VM_STATUSES } from '@vm/shared-types';

import { AuthService } from '@/modules/auth/auth.service';
import { SessionRepository } from '@/modules/auth/session.repository';
import { UnauthenticatedException } from '@/shared/exceptions/auth.exceptions';

import { seedUser, SESSION_COOKIE_NAME, setUserActive } from './support/auth-helpers';
import {
  closeAllSockets,
  connectSocket,
  listenOnEphemeralPort,
  openSocket,
  rawUpgrade,
  recordStatusEvents,
  sessionCookieFor,
  waitForConnectError,
  waitForConnectionClose,
  waitForDisconnect,
} from './support/socket-helpers';
import { createTestApp } from './support/test-app';
import { TEST_ALLOWED_ORIGIN } from './support/test-constants';
import { clearVms, createVm, listVms } from './support/vm-helpers';

import type { TestUser } from './support/auth-helpers';
import type { OpenSocketOptions } from './support/socket-helpers';
import type { INestApplication } from '@nestjs/common';
import type { Socket } from 'socket.io-client';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

const ADMIN: TestUser = { email: 'admin@example.com', password: 'Admin-e2e-1', role: ROLES.ADMIN };
const CLIENT: TestUser = {
  email: 'cliente@example.com',
  password: 'Cliente-e2e-1',
  role: ROLES.CLIENT,
};
/** Solo para el caso de usuario inactivo: se desactiva y se reactiva dentro del test. */
const INACTIVE: TestUser = {
  email: 'inactivo@example.com',
  password: 'Inactivo-e2e-1',
  role: ROLES.CLIENT,
};

const UNAUTHENTICATED_DATA = {
  message: 'Tu sesión no es válida o expiró. Inicia sesión de nuevo',
  code: 'UNAUTHENTICATED',
};
const INTERNAL_ERROR_DATA = { message: 'Internal server error', code: 'INTERNAL_ERROR' };

const POLLING_HANDSHAKE = `${REALTIME_PATH}?EIO=4&transport=polling`;

let app: INestApplication<App>;
let baseUrl: string;
let adminCookie: string;
let clientCookie: string;

beforeAll(async () => {
  app = await createTestApp();
  baseUrl = await listenOnEphemeralPort(app);
  await seedUser(app, ADMIN);
  await seedUser(app, CLIENT);
  await seedUser(app, INACTIVE);
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

function tokenOf(cookie: string): string {
  return cookie.slice(SESSION_COOKIE_NAME.length + 1);
}

/** Cambia el payload del JWT sin volver a firmarlo: la firma deja de corresponder. */
function tamperedCookie(cookie: string): string {
  const [header, payload, signature] = tokenOf(cookie).split('.');
  const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()) as object;
  const forged = Buffer.from(
    JSON.stringify({ ...claims, sub: '00000000-0000-4000-8000-000000000000' }),
  ).toString('base64url');
  return `${SESSION_COOKIE_NAME}=${header ?? ''}.${forged}.${signature ?? ''}`;
}

async function expectRejected(options: OpenSocketOptions, data: object): Promise<void> {
  const error = await waitForConnectError(openSocket(baseUrl, options));
  expect(error.data).toEqual(data);
}

function expectSecurityHeaders(headers: Record<string, unknown>): void {
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy']).toBeDefined();
  expect(headers['x-frame-options']).toBeDefined();
  expect(headers['x-powered-by']).toBeUndefined();
}

describe('RF-realtime-vm-status-01 — servidor Socket.io en /api/socket.io, solo WebSocket', () => {
  it('acepta una conexión por WebSocket en la ruta y el puerto de la API', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);

    const socket = await connectSocket(baseUrl, { cookie: adminCookie });

    expect(socket.connected).toBe(true);
    expect(socket.io.engine.transport.name).toBe('websocket');
  });

  it('un handshake por long-polling recibe 400', async () => {
    await request(app.getHttpServer()).get(POLLING_HANDSHAKE).expect(400);
  });
});

describe('RF-realtime-vm-status-02 — el handshake con sesión válida conecta sin renovarla', () => {
  it('conecta a un Administrador y a un Cliente', async () => {
    const admin = await connectSocket(baseUrl, { cookie: adminCookie });
    const client = await connectSocket(baseUrl, { cookie: clientCookie });

    expect(admin.connected).toBe(true);
    expect(client.connected).toBe(true);
  });

  it('conectarse no cambia el último uso de la sesión ni emite una cookie', async () => {
    const cookie = await sessionCookieFor(app, CLIENT);
    const dataSource = app.get(DataSource);
    await dataSource.query(
      `UPDATE sessions SET last_used_at = now() - interval '10 minutes'
       WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
      [CLIENT.email],
    );

    await connectSocket(baseUrl, { cookie });
    const upgrade = await rawUpgrade(baseUrl, { cookie, origin: TEST_ALLOWED_ORIGIN });

    const rows: { isUntouched: boolean }[] = await dataSource.query(
      `SELECT bool_and(last_used_at < now() - interval '9 minutes') AS "isUntouched"
       FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
      [CLIENT.email],
    );
    expect(rows[0]?.isUntouched).toBe(true);
    expect(upgrade.statusCode).toBe(101);
    expect(upgrade.headers['set-cookie']).toBeUndefined();
  });
});

describe('RF-realtime-vm-status-03 — handshake sin sesión válida → UNAUTHENTICATED', () => {
  it('sin cookie', async () => {
    await expectRejected({}, UNAUTHENTICATED_DATA);
  });

  it('con el token alterado', async () => {
    await expectRejected({ cookie: tamperedCookie(adminCookie) }, UNAUTHENTICATED_DATA);
  });

  it('con una sesión revocada por logout', async () => {
    const cookie = await sessionCookieFor(app, CLIENT);
    await request(app.getHttpServer()).post('/api/auth/logout').set('Cookie', cookie).expect(200);

    await expectRejected({ cookie }, UNAUTHENTICATED_DATA);
  });

  it('con una sesión vencida por inactividad', async () => {
    const cookie = await sessionCookieFor(app, INACTIVE);
    await app.get(DataSource).query(
      `UPDATE sessions SET last_used_at = now() - interval '8 days'
       WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
      [INACTIVE.email],
    );

    await expectRejected({ cookie }, UNAUTHENTICATED_DATA);
  });

  it('con un usuario inactivo', async () => {
    const cookie = await sessionCookieFor(app, INACTIVE);
    await setUserActive(app, INACTIVE.email, false);
    try {
      await expectRejected({ cookie }, UNAUTHENTICATED_DATA);
    } finally {
      await setUserActive(app, INACTIVE.email, true);
    }
  });

  it.each([
    ['en el auth del handshake', (token: string) => ({ auth: { token } })],
    ['en la query', (token: string) => ({ query: { token } })],
    ['en Authorization', (token: string) => ({ headers: { authorization: `Bearer ${token}` } })],
  ])('con un token válido solo %s, sin cookie', async (_where, optionsFor) => {
    await expectRejected(optionsFor(tokenOf(adminCookie)), UNAUTHENTICATED_DATA);
  });

  it('si la consulta de la sesión falla, INTERNAL_ERROR y no UNAUTHENTICATED', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest
      .spyOn(SessionRepository.prototype, 'findWithUser')
      .mockRejectedValueOnce(new Error('base de datos caída'));

    await expectRejected({ cookie: adminCookie }, INTERNAL_ERROR_DATA);
  });
});

describe('RF-realtime-vm-status-04 — Origin fuera de CORS_ORIGIN → rechazo aunque la cookie sea válida', () => {
  it.each(['http://evil.test', 'http://localhost:3000.evil.com'])(
    'rechaza %s sin data de sesión',
    async (origin) => {
      const error = await waitForConnectError(openSocket(baseUrl, { cookie: adminCookie, origin }));

      expect(error.data).toBeUndefined();
    },
  );

  it('sin Origin y con el origen permitido, conecta', async () => {
    const withoutOrigin = await connectSocket(baseUrl, { cookie: adminCookie, origin: null });
    const allowed = await connectSocket(baseUrl, { cookie: adminCookie });

    expect(withoutOrigin.connected).toBe(true);
    expect(allowed.connected).toBe(true);
  });

  it('CORS del endpoint: el origen permitido, sin credentials', async () => {
    const response = await request(app.getHttpServer())
      .get(POLLING_HANDSHAKE)
      .set('Origin', TEST_ALLOWED_ORIGIN);

    expect(response.headers['access-control-allow-origin']).toBe(TEST_ALLOWED_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });
});

describe('RF-realtime-vm-status-09 — canal de solo bajada', () => {
  it('un evento del cliente se ignora: la VM no cambia y la conexión sigue recibiendo', async () => {
    const vm = await createVm(app, adminCookie);
    const sentinel = await createVm(app, adminCookie, { name: 'centinela' });
    const socket = await connectSocket(baseUrl, { cookie: adminCookie });
    const recorder = recordStatusEvents(socket);

    // Un cliente hostil no respeta `ClientToServerEvents`: se emite sin tipos.
    (socket as unknown as Socket).emit('vm:update', { id: vm.id, status: VM_STATUSES.ON });
    await request(app.getHttpServer())
      .put(`/api/vms/${sentinel.id}`)
      .set('Cookie', adminCookie)
      .send({ status: VM_STATUSES.ON })
      .expect(200);
    await recorder.waitForCount(1);

    expect(recorder.events.map((event) => event.item.id)).toEqual([sentinel.id]);
    const stored = (await listVms(app, adminCookie)).find((item) => item.id === vm.id);
    expect(stored?.status).toBe(VM_STATUSES.OFF);
  });

  it('un mensaje de más de 1 KB cierra la conexión', async () => {
    const socket = await connectSocket(baseUrl, { cookie: adminCookie });
    const disconnected = waitForDisconnect(socket);

    (socket as unknown as Socket).emit('mensaje-grande', 'x'.repeat(2048));

    expect(await disconnected).toMatch(/transport (close|error)/);
  });

  it('otro CONNECT por la misma conexión la cierra sin volver a consultar la sesión', async () => {
    // El primer handshake queda retenido en `verifySession` hasta el final del test.
    let releaseHandshake: () => void = () => undefined;
    let markCalled: () => void = () => undefined;
    const firstCallStarted = new Promise<void>((resolve) => {
      markCalled = resolve;
    });
    const verifySession = jest
      .spyOn(AuthService.prototype, 'verifySession')
      .mockImplementationOnce(() => {
        markCalled();
        return new Promise((_resolve, reject) => {
          releaseHandshake = () => {
            reject(new UnauthenticatedException());
          };
        });
      });
    const socket = openSocket(baseUrl, { cookie: adminCookie });
    await firstCallStarted;
    const closed = waitForConnectionClose(socket);

    // '0' es un paquete CONNECT de Socket.io al namespace '/' (en el cable, `40`).
    for (let attempt = 0; attempt < 3; attempt += 1) socket.io.engine.send('0');

    await closed;
    expect(verifySession).toHaveBeenCalledTimes(1);
    releaseHandshake();
  });
});

describe('RF-realtime-vm-status-10 — cabeceras de seguridad en el endpoint de Socket.io', () => {
  it('en el 400 al handshake por long-polling', async () => {
    const response: Response = await request(app.getHttpServer())
      .get(POLLING_HANDSHAKE)
      .expect(400);

    expectSecurityHeaders(response.headers);
  });

  it('en el 101 que acepta el WebSocket', async () => {
    const upgrade = await rawUpgrade(baseUrl, { origin: TEST_ALLOWED_ORIGIN });

    expect(upgrade.statusCode).toBe(101);
    expectSecurityHeaders(upgrade.headers);
  });
});
