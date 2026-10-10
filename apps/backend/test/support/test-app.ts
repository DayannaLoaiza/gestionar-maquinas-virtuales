import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { AppModule } from '@/app.module';
import { configureHttpApp, HTTP_APP_OPTIONS } from '@/app.setup';
import { validateEnv } from '@/config/env.validation';

import type { INestApplication, Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { App } from 'supertest/types';

export interface TestAppOptions {
  /** Variables que cambian solo para esta app (p. ej. `NODE_ENV: 'production'`). */
  env?: Record<string, string>;
  /** Módulos que existen solo en el test (p. ej. un controller con `@Roles`). */
  imports?: Type[];
}

/**
 * Levanta `AppModule` con `configureHttpApp` (lo mismo que `main.ts`) contra la base de test, con
 * las migraciones aplicadas y las tablas vacías.
 */
export async function createTestApp(options: TestAppOptions = {}): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({ imports: [AppModule, ...(options.imports ?? [])] });
  if (options.env) {
    const config = validateEnv({ ...process.env, ...options.env });
    builder.overrideProvider(ConfigService).useValue(new ConfigService(config));
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>(HTTP_APP_OPTIONS);
  configureHttpApp(app);
  await app.init();
  await resetDatabase(app);
  return app;
}

/** Aplica las migraciones pendientes y vacía las tablas de la capacidad `auth`. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();
  await dataSource.query('TRUNCATE TABLE "sessions", "users" CASCADE');
}
