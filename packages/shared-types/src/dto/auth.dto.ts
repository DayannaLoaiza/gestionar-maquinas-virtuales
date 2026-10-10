import { z } from 'zod';

/** Largo máximo de un email (RFC 5321). */
export const EMAIL_MAX_LENGTH = 254;

/** Corta antes de calcular el hash: una contraseña enorme no puede usarse para agotar la CPU. */
export const PASSWORD_MAX_LENGTH = 128;

/** Email recortado y en minúsculas: así se guarda y así se busca (RF-auth-13). */
export const NormalizedEmail = z
  .string({ error: 'Ingresa tu correo' })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email({ error: 'Ingresa un correo válido' })
      .max(EMAIL_MAX_LENGTH, { error: 'El correo es demasiado largo' }),
  );

export const LoginDTO = z.object({
  email: NormalizedEmail,
  password: z
    .string({ error: 'Ingresa tu contraseña' })
    .min(1, { error: 'Ingresa tu contraseña' })
    .max(PASSWORD_MAX_LENGTH, { error: 'La contraseña es demasiado larga' }),
});
export type LoginDTO = z.infer<typeof LoginDTO>;
