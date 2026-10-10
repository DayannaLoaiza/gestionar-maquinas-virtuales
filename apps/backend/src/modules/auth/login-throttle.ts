import { seconds } from '@nestjs/throttler';

import { NormalizedEmail } from '@vm/shared-types';

import type { ThrottlerOptions } from '@nestjs/throttler';

const LOGIN_ATTEMPTS_LIMIT = 5;
const LOGIN_WINDOW_MS = seconds(60);

/**
 * Cuenta por email normalizado: no depende de la IP, así que falsificar `X-Forwarded-For` no
 * esquiva el límite sobre una cuenta (RF-auth-04, hallazgo H4). Si el cuerpo no trae un email
 * válido, cae a la IP (ese intento igual termina en 400).
 */
export function trackLoginByEmail(request: Record<string, unknown>): string {
  const body = request.body;
  const rawEmail: unknown =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>).email : undefined;
  const email = NormalizedEmail.safeParse(rawEmail);
  return email.success ? `email:${email.data}` : `ip:${String(request.ip)}`;
}

/**
 * Los dos límites del login: 5 intentos cada 60 s por IP (la de la conexión, o la que informe un
 * proxy de confianza: `TRUST_PROXY`) y 5 cada 60 s por email.
 */
export const LOGIN_THROTTLERS: ThrottlerOptions[] = [
  { name: 'ip', limit: LOGIN_ATTEMPTS_LIMIT, ttl: LOGIN_WINDOW_MS },
  {
    name: 'email',
    limit: LOGIN_ATTEMPTS_LIMIT,
    ttl: LOGIN_WINDOW_MS,
    getTracker: trackLoginByEmail,
  },
];
