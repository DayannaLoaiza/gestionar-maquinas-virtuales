import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { ROLES } from '@vm/shared-types';

import {
  loginAs,
  postLogin,
  seedUser,
  sessionCookie,
  sessionSetCookie,
  sessionToken,
  SESSION_COOKIE_NAME,
  setCookieHeaders,
  setUserActive,
} from './support/auth-helpers';
import { createTestApp } from './support/test-app';
import { TEST_ALLOWED_ORIGIN, TEST_JWT_SECRET } from './support/test-constants';

import type { TestUser } from './support/auth-helpers';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

const ADMIN: TestUser = { email: 'admin@example.com', password: 'Admin-e2e-1', role: ROLES.ADMIN };
const CLIENT: TestUser = {
  email: 'cliente@example.com',
  password: 'Cliente-e2e-1',
  role: ROLES.CLIENT,
};

const SEVEN_DAYS_S = 7 * 24 * 60 * 60;

/** El sobre de 401 de una ruta protegida sin sesión válida. */
const UNAUTHENTICATED_BODY = {
  success: false,
  error: { message: expect.any(String) as unknown, code: 'UNAUTHENTICATED' },
};

let app: INestApplication<App>;

// Una app por test: la base y los contadores del rate limit empiezan vacíos en cada uno.
beforeEach(async () => {
  app = await createTestApp();
});

afterEach(async () => {
  await app.close();
});

function getMe(cookie?: string): request.Test {
  const call = request(app.getHttpServer()).get('/api/auth/me');
  return cookie === undefined ? call : call.set('Cookie', cookie);
}

function base64UrlJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Claims de un token real (sub, jti, iss, aud, exp), para fabricar variantes inválidas. */
function decodeClaims(token: string): Record<string, unknown> {
  const payload = token.split('.')[1] ?? '';
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}

describe('RF-auth-01 — login con cookie HttpOnly y cuerpo sin token', () => {
  it('responde 200, pone la cookie con sus atributos y devuelve solo el usuario', async () => {
    await seedUser(app, ADMIN);

    const response = await postLogin(app, ADMIN).expect(200);

    const cookieLine = sessionSetCookie(response) ?? '';
    expect(cookieLine).toMatch(/; HttpOnly/);
    expect(cookieLine).toMatch(/; Secure/);
    expect(cookieLine).toMatch(/; SameSite=Strict/);
    expect(cookieLine).toMatch(/; Path=\//);
    const maxAge = Number(/Max-Age=(\d+)/.exec(cookieLine)?.[1]);
    expect(maxAge).toBeGreaterThan(SEVEN_DAYS_S - 60);
    expect(maxAge).toBeLessThanOrEqual(SEVEN_DAYS_S);
    expect(response.body).toEqual({
      success: true,
      data: { user: { id: expect.any(String) as unknown, email: ADMIN.email, role: ROLES.ADMIN } },
    });
    expect(JSON.stringify(response.body)).not.toContain(sessionToken(response));
  });
});

describe('RF-auth-02 — sin enumeración de usuarios', () => {
  it('email inexistente, contraseña incorrecta y usuario inactivo: el mismo 401, sin cookie', async () => {
    await seedUser(app, CLIENT);
    await seedUser(app, ADMIN, { isActive: false });

    const responses = await Promise.all([
      postLogin(app, { email: 'nadie@example.com', password: 'Cualquiera-1' }),
      postLogin(app, { email: CLIENT.email, password: 'Incorrecta-1' }),
      postLogin(app, ADMIN),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(setCookieHeaders(response)).toEqual([]);
      expect(response.body).toEqual({
        success: false,
        error: { message: 'Correo o contraseña incorrectos', code: 'INVALID_CREDENTIALS' },
      });
    }
  });
});

describe('RF-auth-03 — el cuerpo del login se valida antes de mirar credenciales', () => {
  it.each([
    ['email con formato inválido', { email: 'no-es-un-email', password: 'Algo-1' }],
    ['contraseña vacía', { email: ADMIN.email, password: '' }],
    ['contraseña de 129 caracteres', { email: ADMIN.email, password: 'x'.repeat(129) }],
    ['campos faltantes', {}],
  ])('%s → 400 VALIDATION_ERROR', async (_case, body) => {
    const response = await postLogin(app, body as { email: string; password: string }).expect(400);

    expect(response.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
  });
});

describe('RF-auth-13 — el login normaliza el email', () => {
  it('encuentra al usuario con mayúsculas y espacios en los extremos', async () => {
    await seedUser(app, ADMIN);

    const response = await postLogin(app, {
      email: '  ADMIN@Example.COM ',
      password: ADMIN.password,
    }).expect(200);

    expect(response.body).toMatchObject({ data: { user: { email: ADMIN.email } } });
  });
});

describe('RF-auth-09 — GET /api/auth/me', () => {
  it('devuelve el usuario de la sesión', async () => {
    await seedUser(app, CLIENT);
    const cookie = await loginAs(app, CLIENT);

    const response = await getMe(cookie).expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        user: { id: expect.any(String) as unknown, email: CLIENT.email, role: ROLES.CLIENT },
      },
    });
  });
});

describe('RF-auth-06 — toda ruta exige sesión válida, leída solo de la cookie', () => {
  let token: string;

  beforeEach(async () => {
    await seedUser(app, ADMIN);
    token = sessionToken(await postLogin(app, ADMIN).expect(200));
  });

  it('sin cookie → 401', async () => {
    const response = await getMe().expect(401);

    expect(response.body).toEqual(UNAUTHENTICATED_BODY);
  });

  it('con el payload alterado (firma que ya no corresponde) → 401', async () => {
    const [header, , signature] = token.split('.');
    const tampered = { ...decodeClaims(token), sub: '00000000-0000-4000-8000-000000000000' };

    await getMe(
      `${SESSION_COOKIE_NAME}=${header ?? ''}.${base64UrlJson(tampered)}.${signature ?? ''}`,
    ).expect(401);
  });

  it('con alg "none" y sin firma → 401', async () => {
    const unsigned = `${base64UrlJson({ alg: 'none', typ: 'JWT' })}.${base64UrlJson(decodeClaims(token))}.`;

    await getMe(`${SESSION_COOKIE_NAME}=${unsigned}`).expect(401);
  });

  it('firmado con HS512 y el mismo secreto → 401 (algoritmo fijo)', async () => {
    const forged = new JwtService({ secret: TEST_JWT_SECRET }).sign(decodeClaims(token), {
      algorithm: 'HS512',
    });

    await getMe(`${SESSION_COOKIE_NAME}=${forged}`).expect(401);
  });

  it('con el token expirado → 401', async () => {
    const claims = { ...decodeClaims(token), exp: Math.floor(Date.now() / 1000) - 60 };
    const expired = new JwtService({ secret: TEST_JWT_SECRET }).sign(claims, {
      algorithm: 'HS256',
    });

    await getMe(`${SESSION_COOKIE_NAME}=${expired}`).expect(401);
  });

  it('con el usuario desactivado después del login → 401', async () => {
    await setUserActive(app, ADMIN.email, false);

    await getMe(`${SESSION_COOKIE_NAME}=${token}`).expect(401);
  });

  it('con el token solo en Authorization: Bearer → 401', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('GET /health sigue siendo público', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});

describe('RF-auth-05 — la sesión vence en el servidor', () => {
  it('tras 8 días sin uso → 401, aunque el JWT no haya expirado', async () => {
    await seedUser(app, ADMIN);
    const cookie = await loginAs(app, ADMIN);

    await app.get(DataSource).query(`UPDATE sessions SET last_used_at = now() - interval '8 days'`);

    await getMe(cookie).expect(401);
  });

  it('pasado el límite absoluto → 401, aunque se haya usado hace un momento', async () => {
    await seedUser(app, ADMIN);
    const cookie = await loginAs(app, ADMIN);

    await app
      .get(DataSource)
      .query(`UPDATE sessions SET absolute_expires_at = now() - interval '1 minute'`);

    await getMe(cookie).expect(401);
  });

  it('una petición tras más de 5 minutos renueva la cookie y el último uso', async () => {
    await seedUser(app, ADMIN);
    const cookie = await loginAs(app, ADMIN);
    const dataSource = app.get(DataSource);
    await dataSource.query(`UPDATE sessions SET last_used_at = now() - interval '10 minutes'`);

    const response = await getMe(cookie).expect(200);

    // Sin renovación, una petición autenticada no trae Set-Cookie. (El token puede salir idéntico:
    // `iat` y `exp` van en segundos y la prueba corre en el mismo segundo que el login.)
    const maxAge = Number(/Max-Age=(\d+)/.exec(sessionSetCookie(response) ?? '')?.[1]);
    expect(maxAge).toBeGreaterThan(SEVEN_DAYS_S - 60);
    const rows: unknown = await dataSource.query(
      `SELECT last_used_at > now() - interval '1 minute' AS "isRecent" FROM sessions`,
    );
    expect(rows).toEqual([{ isRecent: true }]);
  });
});

describe('RF-auth-08 — logout', () => {
  it('revoca la sesión y expira la cookie: el token anterior deja de servir', async () => {
    await seedUser(app, ADMIN);
    const cookie = await loginAs(app, ADMIN);

    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .expect(200);

    expect(sessionSetCookie(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
    await getMe(cookie).expect(401);
  });

  it('sin sesión también responde 200 y expira la cookie', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/logout').expect(200);

    expect(response.body).toEqual({ success: true, data: null });
    expect(sessionSetCookie(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

describe('RF-auth-11 — verificación de Origin en peticiones que cambian estado', () => {
  beforeEach(async () => {
    await seedUser(app, ADMIN);
  });

  it('con un Origin ajeno → 403 sin procesar el login', async () => {
    const response = await postLogin(app, ADMIN)
      .set('Origin', 'https://atacante.example')
      .expect(403);

    expect(response.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
    expect(sessionSetCookie(response)).toBeUndefined();
  });

  it('con el Origin permitido o sin Origin → se procesa', async () => {
    const withOrigin = await postLogin(app, ADMIN).set('Origin', TEST_ALLOWED_ORIGIN).expect(200);
    const withoutOrigin = await postLogin(app, ADMIN).expect(200);

    expect(sessionCookie(withOrigin)).not.toBe(sessionCookie(withoutOrigin));
  });
});
