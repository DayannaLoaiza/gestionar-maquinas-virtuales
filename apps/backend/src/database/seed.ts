import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { z } from 'zod';

import {
  CreateVirtualMachineDTO,
  NormalizedEmail,
  PASSWORD_MAX_LENGTH,
  ROLES,
} from '@vm/shared-types';

import { validateEnv } from '@/config/env.validation';
import { UsersModule } from '@/modules/users/users.module';
import { UsersService } from '@/modules/users/users.service';
import { VirtualMachinesModule } from '@/modules/virtual-machines/virtual-machines.module';
import { VirtualMachinesService } from '@/modules/virtual-machines/virtual-machines.service';

import { DatabaseModule } from './database.module';
import { SAMPLE_VIRTUAL_MACHINES } from './sample-virtual-machines';

import type { INestApplicationContext } from '@nestjs/common';
import type { Role } from '@vm/shared-types';

/**
 * Usuarios de prueba (RF-auth-15) y VMs de ejemplo (RF-virtual-machines-28):
 * `pnpm --filter @vm/backend db:seed`, después de `db:migrate`. Idempotente: un email que ya existe
 * no se toca, y las VMs se crean solo si no hay ninguna. Es un script de arranque, como `main.ts`:
 * por eso lee `process.env`, validado con Zod.
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
type SeedEnv = z.infer<typeof SeedEnv>;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    // `VirtualMachinesService` inyecta `EventEmitter2`; crear una VM no emite nada.
    EventEmitterModule.forRoot(),
    DatabaseModule,
    UsersModule,
    VirtualMachinesModule,
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

async function seedUsers(app: INestApplicationContext, env: SeedEnv): Promise<void> {
  const usersService = app.get(UsersService);
  await seedUser(usersService, {
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
    role: ROLES.ADMIN,
  });
  await seedUser(usersService, {
    email: env.SEED_CLIENT_EMAIL,
    password: env.SEED_CLIENT_PASSWORD,
    role: ROLES.CLIENT,
  });
}

/**
 * Solo sobre una tabla vacía: con al menos una VM no agrega ni repone nada (RF-virtual-machines-28).
 * Sin transacción: si falla a mitad, quedan las creadas hasta ahí y la próxima corrida las omite.
 */
async function seedVirtualMachines(
  app: INestApplicationContext,
  adminEmail: string,
): Promise<void> {
  const vmsService = app.get(VirtualMachinesService);
  const existing = await vmsService.count();
  if (existing > 0) {
    logger.log(
      `VMs de ejemplo: omitidas, ya hay ${String(existing)} ${existing === 1 ? 'VM' : 'VMs'}`,
    );
    return;
  }

  const usersService = app.get(UsersService);
  const admin = await usersService.findByEmail(adminEmail);
  if (!admin) {
    throw new Error('No se encontró el Administrador de prueba, autor de las VMs de ejemplo');
  }
  const author = usersService.toAuthUser(admin);
  const samples = CreateVirtualMachineDTO.array().parse(SAMPLE_VIRTUAL_MACHINES);
  // En orden inverso: el Panel muestra primero la más nueva, así se ve en el orden de la tabla.
  for (const sample of samples.toReversed()) {
    await vmsService.create(sample, author);
  }
  logger.log(`VMs de ejemplo: ${String(samples.length)} creadas`);
}

async function main(): Promise<void> {
  const env = SeedEnv.safeParse(process.env);
  if (!env.success) {
    throw new Error(`Seed cancelado:\n${z.prettifyError(env.error)}`);
  }

  // Sin el log del arranque de Nest; después, el resultado de cada usuario y de las VMs.
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  app.useLogger(['log', 'error', 'warn']);
  try {
    await seedUsers(app, env.data);
    await seedVirtualMachines(app, env.data.SEED_ADMIN_EMAIL);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : 'Error desconocido en el seed');
  process.exitCode = 1;
});
