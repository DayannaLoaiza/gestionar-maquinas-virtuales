import { DataSource } from 'typeorm';
import { z } from 'zod';

import { DatabaseUrl } from '@/config/env.validation';

import { buildDataSourceOptions } from './database.options';

/**
 * DataSource del CLI de TypeORM (`db:migrate`, `db:migration:generate`), que corre sobre `dist/`.
 * Es un script de arranque, como `main.ts`: por eso lee `process.env`, validado con el mismo
 * schema que la app.
 */
const { DATABASE_URL } = z.object({ DATABASE_URL: DatabaseUrl }).parse(process.env);

export const AppDataSource = new DataSource(buildDataSourceOptions(DATABASE_URL));
