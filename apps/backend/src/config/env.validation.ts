import { z } from 'zod';

/** HS256 firma con HMAC-SHA256: el secreto no debe ser más corto que su salida (OWASP JWT). */
const JWT_SECRET_MIN_BYTES = 32;

/**
 * `trust proxy` de Express. `false`: la IP del cliente es la de la conexión y `X-Forwarded-For` se
 * ignora. Un número son los saltos de proxy de confianza; cualquier otro texto, las subredes o
 * nombres que acepta Express (`loopback`, `10.0.0.0/8, …`). `true` (confiar en cualquiera) no se
 * acepta: permitiría falsificar la IP con el header.
 */
const TrustProxySchema = z
  .string()
  .trim()
  .default('false')
  .refine((value) => value !== 'true', { error: 'no puede ser true: indica saltos o subredes' })
  .transform((value): false | number | string => {
    if (value === 'false' || value === '') return false;
    if (/^\d+$/.test(value)) return Number(value);
    return value;
  });

/** URL de PostgreSQL; también la valida el CLI de migraciones (`database/data-source.ts`). */
export const DatabaseUrl = z.url({
  protocol: /^postgres(ql)?$/,
  error: 'debe ser una URL postgres:// válida',
});

/**
 * Variables de entorno, validadas al arrancar (`ConfigModule.forRoot({ validate })`). En
 * `process.env` todo es string: los números se convierten con `z.coerce`. Si algo no valida, el
 * proceso no arranca. Los mensajes nombran la variable, nunca su valor.
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    /** Orígenes permitidos por CORS, separados por comas. Se recortan los espacios de cada uno. */
    CORS_ORIGIN: z
      .string()
      .default('http://localhost:3000')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0),
      ),
    DATABASE_URL: DatabaseUrl,
    JWT_SECRET: z
      .string({ error: 'es obligatoria' })
      .refine((value) => Buffer.byteLength(value, 'utf8') >= JWT_SECRET_MIN_BYTES, {
        error: `debe tener al menos ${String(JWT_SECRET_MIN_BYTES)} bytes`,
      }),
    /** `false` solo fuera de producción, para probar con herramientas sobre http://localhost. */
    COOKIE_SECURE: z.stringbool({ error: 'debe ser true o false' }).default(true),
    TRUST_PROXY: TrustProxySchema,
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.COOKIE_SECURE, {
    path: ['COOKIE_SECURE'],
    error: 'no puede ser false con NODE_ENV=production',
  });

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Variables de entorno inválidas:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
