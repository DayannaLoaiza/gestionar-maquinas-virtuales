import { handleSessionExpired } from '@/lib/auth/session-navigation';

import { ApiError } from './api-error';

import type { ApiErrorBody, ApiSuccess } from '@vm/shared-types';

type ApiPath = `/api/${string}`;
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const NO_CONTENT = 204;
const UNAUTHORIZED = 401;

function isApiSuccess(payload: unknown): payload is ApiSuccess<unknown> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    payload.success === true
  );
}

function isApiErrorBody(payload: unknown): payload is ApiErrorBody {
  if (typeof payload !== 'object' || payload === null || !('error' in payload)) return false;
  const { error } = payload;
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

export interface RequestOptions {
  /**
   * Qué hacer ante un `401`. `'redirect'` (por defecto) lleva a `/login` con el aviso de sesión
   * expirada (RF-auth-26). `'ignore'` solo lanza: para la verificación de `/login`, donde un `401`
   * significa que no hay sesión (RF-auth-21).
   */
  onUnauthorized?: 'redirect' | 'ignore';
}

/** El `401` del login son credenciales incorrectas, no una sesión expirada (RF-auth-20). */
const LOGIN_PATH: ApiPath = '/api/auth/login';

function isSessionExpired(status: number, path: ApiPath, options: RequestOptions): boolean {
  return status === UNAUTHORIZED && path !== LOGIN_PATH && options.onUnauthorized !== 'ignore';
}

/**
 * Pedido de cliente al backend vía el rewrite `/api/*`.
 *
 * Desenvuelve `data` del sobre `{ success, data }`. Ante un status de error con el sobre de error
 * lanza `ApiError` (con `status` y `code`, lo que necesita `toUserMessage`); ante cualquier otra
 * respuesta inesperada lanza un `Error` común, que `toUserMessage` trata como no mostrable. Un `401`
 * de sesión expirada además lleva a `/login`, y sigue lanzando para que quien llamó no continúe.
 */
async function request<T>(
  method: Method,
  path: ApiPath,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const init: RequestInit = { method, credentials: 'include' };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  const response = await fetch(path, init);
  if (response.status === NO_CONTENT) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isSessionExpired(response.status, path, options)) handleSessionExpired();
    if (isApiErrorBody(payload)) {
      throw new ApiError(payload.error.message, response.status, payload.error.code);
    }
    throw new Error(`Respuesta de error inesperada (${String(response.status)}) en ${path}`);
  }
  if (!isApiSuccess(payload)) throw new Error(`Respuesta inesperada en ${path}`);
  return payload.data as T;
}

export const get = <T>(path: ApiPath, options?: RequestOptions): Promise<T> =>
  request<T>('GET', path, undefined, options);
export const post = <T>(path: ApiPath, body?: unknown, options?: RequestOptions): Promise<T> =>
  request<T>('POST', path, body, options);
export const put = <T>(path: ApiPath, body?: unknown, options?: RequestOptions): Promise<T> =>
  request<T>('PUT', path, body, options);
export const patch = <T>(path: ApiPath, body?: unknown, options?: RequestOptions): Promise<T> =>
  request<T>('PATCH', path, body, options);
export const del = <T = void>(path: ApiPath, options?: RequestOptions): Promise<T> =>
  request<T>('DELETE', path, undefined, options);
