import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

import { TEST_ALLOWED_ORIGIN, TEST_JWT_SECRET } from './test-constants';

/**
 * `setupFiles` de los e2e: corre antes de importar `AppModule`, cuya configuración se valida al
 * cargarse. Toma `TEST_DATABASE_URL` del entorno o del `.env` de la app y fija el resto de las
 * variables, para que los tests no dependan de la configuración de desarrollo.
 *
 * Jest le da a cada archivo de test su propia copia de `process.env`: `process.loadEnvFile()`
 * escribiría en la del proceso, que los tests no ven. Por eso se parsea y se copia.
 */
const ENV_FILE = join(__dirname, '..', '..', '.env');
if (existsSync(ENV_FILE)) {
  const fileEnv = parseEnv(readFileSync(ENV_FILE, 'utf8')) as Record<string, string>;
  for (const [key, value] of Object.entries(fileEnv)) process.env[key] ??= value;
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('Los e2e necesitan TEST_DATABASE_URL (ver apps/backend/.env.example).');
}
if (testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL no puede ser la base de DATABASE_URL: los e2e la vacían.');
}

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl,
  JWT_SECRET: TEST_JWT_SECRET,
  CORS_ORIGIN: TEST_ALLOWED_ORIGIN,
  COOKIE_SECURE: 'true',
  TRUST_PROXY: 'false',
});
