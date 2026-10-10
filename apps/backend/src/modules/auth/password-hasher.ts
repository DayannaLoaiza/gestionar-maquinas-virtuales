import { argon2id, hash, verify } from 'argon2';

/**
 * Argon2id por encima del mínimo de OWASP (19 MiB, t=2, p=1) (C8, RF-auth-12). La sal es aleatoria
 * en cada hash y viaja dentro del resultado (formato PHC), junto con estos parámetros: subirlos
 * más adelante no invalida los hashes existentes.
 */
export const ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 4,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/** Compara en tiempo constante (implementación de referencia de Argon2). */
export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}
