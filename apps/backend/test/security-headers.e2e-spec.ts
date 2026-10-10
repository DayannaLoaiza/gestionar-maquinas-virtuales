import request from 'supertest';

import { createTestApp } from './support/test-app';

import type { INestApplication } from '@nestjs/common';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

function expectSecurityHeaders(response: Response): void {
  expect(response.headers['x-content-type-options']).toBe('nosniff');
  expect(response.headers['content-security-policy']).toBeDefined();
  expect(response.headers['x-frame-options']).toBeDefined();
  expect(response.headers['x-powered-by']).toBeUndefined();
}

describe('RF-auth-10 — cabeceras de seguridad en toda respuesta', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app.close();
  });

  it('en una respuesta 200 y en un 404', async () => {
    app = await createTestApp();

    expectSecurityHeaders(await request(app.getHttpServer()).get('/health').expect(200));
    expectSecurityHeaders(await request(app.getHttpServer()).get('/api/no-existe').expect(404));
  });

  it('RF-auth-16 — JSON malformado → 400 INVALID_BODY, sin repetir la entrada y con las cabeceras', async () => {
    app = await createTestApp();

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": entrada-maliciosa')
      .expect(400);

    expectSecurityHeaders(response);
    expect(response.body).toEqual({
      success: false,
      error: { message: 'El cuerpo de la petición no es válido', code: 'INVALID_BODY' },
    });
    expect(JSON.stringify(response.body)).not.toContain('entrada-maliciosa');
  });

  it('RF-auth-16 — cuerpo de más de 100 KB → 413 PAYLOAD_TOO_LARGE con las cabeceras', async () => {
    app = await createTestApp();

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'x'.repeat(200 * 1024) })
      .expect(413);

    expectSecurityHeaders(response);
    expect(response.body).toMatchObject({ success: false, error: { code: 'PAYLOAD_TOO_LARGE' } });
  });

  it('en producción agrega Strict-Transport-Security', async () => {
    app = await createTestApp({ env: { NODE_ENV: 'production' } });

    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expectSecurityHeaders(response);
    expect(response.headers['strict-transport-security']).toMatch(/max-age=\d+/);
  });
});
