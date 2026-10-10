import { DataSource } from 'typeorm';

import { ROLES } from '@vm/shared-types';

import { UsersService } from '@/modules/users/users.service';

import { createTestApp } from './support/test-app';

import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

/** Slice: `UsersService` real contra la base de test (constraints e índice único incluidos). */
describe('RF-auth-13 — email único sin distinguir mayúsculas ni espacios', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await createTestApp();
    usersService = app.get(UsersService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('no crea un segundo usuario con el mismo email en otra capitalización', async () => {
    const isFirstCreated = await usersService.ensureUser({
      email: 'Admin@Example.com',
      password: 'Primera-clave-1',
      role: ROLES.ADMIN,
    });
    const isSecondCreated = await usersService.ensureUser({
      email: '  admin@EXAMPLE.com ',
      password: 'Segunda-clave-2',
      role: ROLES.CLIENT,
    });

    const rows: unknown = await app
      .get(DataSource)
      .query('SELECT email, role FROM users ORDER BY created_at');
    expect(isFirstCreated).toBe(true);
    expect(isSecondCreated).toBe(false);
    expect(rows).toEqual([{ email: 'admin@example.com', role: ROLES.ADMIN }]);
  });
});
