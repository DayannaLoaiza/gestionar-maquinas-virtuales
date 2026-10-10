import { SessionEntity } from '@/modules/auth/session.entity';
import { UserEntity } from '@/modules/users/user.entity';

import { CreateUsersAndSessions1791660176637 } from './migrations/1791660176637-CreateUsersAndSessions';

import type { DataSourceOptions } from 'typeorm';

/**
 * Opciones de la conexión, compartidas por la app (`AppModule`), el CLI de migraciones
 * (`data-source.ts`) y los e2e. El esquema cambia solo por migraciones: `synchronize` nunca se
 * activa.
 */
export function buildDataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: [UserEntity, SessionEntity],
    migrations: [CreateUsersAndSessions1791660176637],
    migrationsTableName: 'migrations',
    synchronize: false,
    migrationsRun: false,
    // `gen_random_uuid()` es del núcleo de PostgreSQL desde la 13: no hace falta instalar
    // extensiones (que exigen permisos de superusuario en una base administrada).
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  };
}
