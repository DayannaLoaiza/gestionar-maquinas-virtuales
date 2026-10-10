import { hashPassword, verifyPassword } from './password-hasher';

/** Mínimos de OWASP para Argon2id (Password Storage Cheat Sheet). */
const OWASP_MIN = { memoryKiB: 19 * 1024, iterations: 2, parallelism: 1 };

const PHC_ARGON2ID = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$[^$]+\$[^$]+$/;

describe('RF-auth-12 — contraseñas con Argon2id', () => {
  it('produce un hash Argon2id con parámetros no menores al mínimo de OWASP', async () => {
    const passwordHash = await hashPassword('Contraseña-de-prueba-1');

    const match = PHC_ARGON2ID.exec(passwordHash);
    expect(match).not.toBeNull();
    const [, memory, iterations, parallelism] = (match ?? []).map(Number);
    expect(memory).toBeGreaterThanOrEqual(OWASP_MIN.memoryKiB);
    expect(iterations).toBeGreaterThanOrEqual(OWASP_MIN.iterations);
    expect(parallelism).toBeGreaterThanOrEqual(OWASP_MIN.parallelism);
  });

  it('usa una sal distinta en cada hash: la misma contraseña da hashes distintos', async () => {
    const [first, second] = await Promise.all([
      hashPassword('misma-contraseña'),
      hashPassword('misma-contraseña'),
    ]);

    expect(first).not.toBe(second);
  });

  it('verifica la contraseña correcta y rechaza otra', async () => {
    const passwordHash = await hashPassword('la-correcta');

    await expect(verifyPassword(passwordHash, 'la-correcta')).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, 'otra')).resolves.toBe(false);
  });
});
