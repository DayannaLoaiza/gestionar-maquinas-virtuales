import { GENERIC_ERROR_CODES } from '@vm/shared-types';

/**
 * Error construido a partir del `{ success: false, error: { message, code } }` del backend.
 *
 * Lleva `status` y `code` porque el mensaje solo no dice si fue escrito para el usuario:
 * `toUserMessage()` necesita esos dos para decidir. Cualquier otra cosa que caiga en un `catch` —una
 * falla de red, una página HTML de error del proxy, un bug de JS— nunca es mostrable.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const GENERIC_CODES = new Set<string>(GENERIC_ERROR_CODES);

/** Rate limiting: el texto del backend para un 429 no está escrito para el usuario. */
const TOO_MANY_REQUESTS = 429;

/**
 * El texto a mostrarle al usuario por un error atrapado.
 *
 * Devuelve el mensaje del backend solo si fue escrito para el usuario final; si no, el fallback de
 * la pantalla, nunca el detalle técnico. La decisión se toma con `status` y `code`, no con el
 * texto: así un modo de falla que todavía nadie escribió cae igual en el fallback. Por eso el
 * fallback de cada llamada no es decorativo: es el texto que se ve en esos casos.
 *
 * @example
 * try {
 *   await post('/api/things', data);
 * } catch (error: unknown) {
 *   setError('root', { message: toUserMessage(error, 'No se pudo guardar') });
 * }
 */
export function toUserMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status >= 500 || error.status === TOO_MANY_REQUESTS) return fallback;
  if (error.code !== undefined && GENERIC_CODES.has(error.code)) return fallback;
  return error.message;
}
