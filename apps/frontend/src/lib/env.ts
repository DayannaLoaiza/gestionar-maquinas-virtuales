import { z } from 'zod';

const ClientEnvSchema = z.object({
  /** URL base del backend, sin `/api`. La usa solo el código de servidor; el navegador va por el rewrite. */
  NEXT_PUBLIC_API_URL: z.url().default('http://localhost:3001'),
});

/**
 * Variables públicas validadas al cargar el módulo: una URL mal escrita rompe al arrancar en vez de
 * fallar en silencio en cada pedido. Next inlinea `process.env.NEXT_PUBLIC_*` en el build, por eso
 * cada variable se lee por su nombre literal.
 */
export const clientEnv = ClientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
