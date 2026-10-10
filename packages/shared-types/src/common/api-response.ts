import type { IsoDateString } from './id';

/** Respuesta exitosa: `ResponseInterceptor` envuelve lo que devuelve cada handler. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/**
 * Respuesta de error, armada por `AllExceptionsFilter`.
 *
 * En un 4xx, `message` está escrito para el usuario final y el frontend lo muestra tal cual. En un
 * 5xx o en un error de validación es genérico y el frontend muestra su propio texto.
 */
export interface ApiErrorBody {
  success: false;
  error: { message: string; code: string };
}

/** Códigos de error cuyo `message` no sirve para el usuario: el frontend usa su fallback. */
export const GENERIC_ERROR_CODES = ['VALIDATION_ERROR', 'INTERNAL_ERROR'] as const;
export type GenericErrorCode = (typeof GENERIC_ERROR_CODES)[number];

export interface HealthStatus {
  status: 'ok';
  uptime: number;
  timestamp: IsoDateString;
}
