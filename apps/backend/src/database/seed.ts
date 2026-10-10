import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { z } from 'zod';

import { NormalizedEmail, PASSWORD_MAX_LENGTH, ROLES } from '@vm/shared-types';

import { validateEnv } from '@/config/env.validation';
import { UsersModule } from '@/modules/users/users.module';
import { UsersService } from '@/modules/users/users.service';

import { DatabaseModule } from './database.module';

import type { Role } from '@vm/shared-types';

/**
 * Usuarios de prueba (RF-auth-15): `pnpm --filter @vm/backend db:seed`, después de `db:migrate`.
 * Idempotente: un email que ya existe no se toca. Es un script de arranque, como `main.ts`: por eso
 * lee `process.env`, validado con Zod.
 */
const SeedPassword = z.string().min(1).max(PASSWORD_MAX_LENGTH);

const SeedEnv = z.object({
  // Las credenciales de prueba están publicadas en el README: nunca en producción (RF-auth-15).
  NODE_ENV: z
    .string()
    .optional()
    .refine((value) => value !== 'production', { error: 'el seed no corre en producción' }),
  SEED_ADMIN_EMAIL: NormalizedEmail,
  SEED_ADMIN_PASSWORD: SeedPassword,
  SEED_CLIENT_EMAIL: NormalizedEmail,
  SEED_CLIENT_PASSWORD: SeedPassword,
});

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    DatabaseModule,
    UsersModule,
  ],
})
class SeedModule {}

const logger = new Logger('Seed');

async function seedUser(
  usersService: UsersService,
  user: { email: string; password: string; role: Role },
): Promise<void> {
  const isCreated = await usersService.ensureUser(user);
  logger.log(`${user.role} ${user.email}: ${isCreated ? 'creado' : 'ya existía, sin cambios'}`);
}

async function main(): Promise<void> {
  const env = SeedEnv.safeParse(process.env);
  if (!env.success) {
    throw new Error(`Seed cancelado:\n${z.prettifyError(env.error)}`);
  }

  // Sin el log del arranque de Nest; después, el resultado de cada usuario.
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  app.useLogger(['log', 'error', 'warn']);
  try {
    const usersService = app.get(UsersService);
    await seedUser(usersService, {
      email: env.data.SEED_ADMIN_EMAIL,
      password: env.data.SEED_ADMIN_PASSWORD,
      role: ROLES.ADMIN,
    });
    await seedUser(usersService, {
      email: env.data.SEED_CLIENT_EMAIL,
      password: env.data.SEED_CLIENT_PASSWORD,
      role: ROLES.CLIENT,
    });
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : 'Error desconocido en el seed');
  process.exitCode = 1;
});
