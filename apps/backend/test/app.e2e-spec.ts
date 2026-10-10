import request from 'supertest';

import { createTestApp } from './support/test-app';

import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

/**
 * Solo AppModule: el filtro y el interceptor llegan por DI, así que se prueba exactamente lo que
 * corre en producción (sin repetir la configuración de main.ts).
 */
describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health → 200 envuelto en { success, data }', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toMatchObject({ success: true, data: { status: 'ok' } });
  });

  it('una ruta inexistente → 404 con el sobre de error', async () => {
    const res = await request(app.getHttpServer()).get('/api/no-existe').expect(404);

    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });
});
