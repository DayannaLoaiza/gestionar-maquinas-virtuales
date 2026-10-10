import { ROLES } from '@vm/shared-types';

import { postLogin, seedUser, sessionSetCookie } from './support/auth-helpers';
import { createTestApp } from './support/test-app';

import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

const LIMIT = 5;
const PASSWORD = 'Cualquiera-1';

function attempt(app: INestApplication<App>, email: string, forwardedFor: string) {
  return postLogin(app, { email, password: PASSWORD }).set('X-Forwarded-For', forwardedFor);
}

describe('RF-auth-04 — límite de intentos de login por IP y por email', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app.close();
  });

  it('sin proxy de confianza ignora X-Forwarded-For: el 6.º intento desde la misma IP → 429', async () => {
    app = await createTestApp({ env: { TRUST_PROXY: 'false' } });

    for (let index = 1; index <= LIMIT; index += 1) {
      await attempt(
        app,
        `persona${String(index)}@example.com`,
        `198.51.100.${String(index)}`,
      ).expect(401);
    }
    const blocked = await attempt(app, 'otra@example.com', '198.51.100.99').expect(429);

    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.body).toMatchObject({ success: false, error: { code: 'TOO_MANY_REQUESTS' } });
  });

  it('el límite por email no depende de la IP: 6.º intento a la misma cuenta desde otra IP → 429', async () => {
    app = await createTestApp({ env: { TRUST_PROXY: 'loopback' } });

    for (let index = 1; index <= LIMIT; index += 1) {
      await attempt(app, 'victima@example.com', `203.0.113.${String(index)}`).expect(401);
    }

    await attempt(app, 'VICTIMA@example.com', '203.0.113.99').expect(429);
  });

  it('el 6.º intento con la contraseña correcta → 429 sin abrir sesión (no evalúa credenciales)', async () => {
    app = await createTestApp();
    const user = { email: 'real@example.com', password: 'Correcta-e2e-1', role: ROLES.CLIENT };
    await seedUser(app, user);

    for (let index = 1; index <= LIMIT; index += 1) {
      await postLogin(app, { email: user.email, password: 'Incorrecta-1' }).expect(401);
    }
    const blocked = await postLogin(app, user).expect(429);

    expect(sessionSetCookie(blocked)).toBeUndefined();
  });

  it('con proxy de confianza, cada IP de cliente tiene su propio contador', async () => {
    app = await createTestApp({ env: { TRUST_PROXY: 'loopback' } });

    for (let index = 1; index <= LIMIT; index += 1) {
      await attempt(app, `persona${String(index)}@example.com`, '203.0.113.10').expect(401);
    }

    await attempt(app, 'otra@example.com', '203.0.113.10').expect(429);
    await attempt(app, 'otra-mas@example.com', '203.0.113.20').expect(401);
  });
});
