import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { buildDataSourceOptions } from './database.options';

import type { Env } from '@/config/env.validation';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

/** Si la base no responde al arrancar, se reintenta pocas veces: mejor fallar rápido y a la vista. */
const DATABASE_RETRY_ATTEMPTS = 3;

/** Conexión a PostgreSQL. La usan la API (`AppModule`) y el seed. */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TypeOrmModuleOptions => ({
        ...buildDataSourceOptions(config.get('DATABASE_URL', { infer: true })),
        retryAttempts: DATABASE_RETRY_ATTEMPTS,
      }),
    }),
  ],
})
export class DatabaseModule {}
