import { Controller, Get, Module } from '@nestjs/common';
import request from 'supertest';

import { ROLES } from '@vm/shared-types';

import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { loginAs, seedUser } from './support/auth-helpers';
import { createTestApp } from './support/test-app';

import type { TestUser } from './support/auth-helpers';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

/** Ruta restringida que existe solo en este test: todavía no hay endpoints de negocio por rol. */
@Controller('api/test-admin-only')
class AdminOnlyController {
  @Roles(ROLES.ADMIN)
  @Get()
  check(): { isAllowed: true } {
    return { isAllowed: true };
  }
}

@Module({ controllers: [AdminOnlyController] })
class AdminOnlyTestModule {}

const ADMIN: TestUser = { email: 'admin@example.com', password: 'Admin-e2e-1', role: ROLES.ADMIN };
const CLIENT: TestUser = {
  email: 'cliente@example.com',
  password: 'Cliente-e2e-1',
  role: ROLES.CLIENT,
};

describe('RF-auth-07 — @Roles restringe por rol', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({ imports: [AdminOnlyTestModule] });
    await seedUser(app, ADMIN);
    await seedUser(app, CLIENT);
  });

  afterAll(async () => {
    await app.close();
  });

  it('un Cliente recibe 403 FORBIDDEN', async () => {
    const cookie = await loginAs(app, CLIENT);

    const response = await request(app.getHttpServer())
      .get('/api/test-admin-only')
      .set('Cookie', cookie)
      .expect(403);

    expect(response.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
  });

  it('un Administrador pasa', async () => {
    const cookie = await loginAs(app, ADMIN);

    await request(app.getHttpServer())
      .get('/api/test-admin-only')
      .set('Cookie', cookie)
      .expect(200);
  });
});
