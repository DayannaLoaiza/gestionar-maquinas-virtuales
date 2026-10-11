import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api-error';
import { del, get, post } from './fetch-wrapper';

import type * as FetchWrapper from './fetch-wrapper';

function respond(status: number, body?: unknown): void {
  const response =
    body === undefined
      ? new Response(null, { status })
      : new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetch-wrapper (RF-app-shell-14)', () => {
  it('desenvuelve data del sobre de éxito', async () => {
    respond(200, { success: true, data: { things: [1, 2] } });

    await expect(get('/api/things')).resolves.toEqual({ things: [1, 2] });
  });

  it('envía el body como JSON', async () => {
    respond(201, { success: true, data: { id: 'x' } });

    await post('/api/things', { name: 'a' });

    expect(fetch).toHaveBeenCalledWith('/api/things', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'a' }),
    });
  });

  it('lanza ApiError con status y code ante el sobre de error', async () => {
    respond(409, { success: false, error: { message: 'Ya existe', code: 'CONFLICT' } });

    const error: unknown = await get('/api/things').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'Ya existe', status: 409, code: 'CONFLICT' });
  });

  it('lanza un Error común (no ApiError) si el error no trae el sobre', async () => {
    respond(502, '<html>Bad Gateway</html>');

    const error: unknown = await get('/api/things').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ApiError);
  });

  it('resuelve sin datos ante un 204', async () => {
    respond(204);

    await expect(del('/api/things/1')).resolves.toBeUndefined();
  });
});

describe('fetch-wrapper ante un 401 (RF-auth-26)', () => {
  const UNAUTHENTICATED = {
    success: false,
    error: {
      message: 'Tu sesión no es válida o expiró. Inicia sesión de nuevo',
      code: 'UNAUTHENTICATED',
    },
  };

  /** Bordes: la red responde siempre 401 y la navegación del navegador es un espía. */
  function sessionExpires(): ReturnType<typeof vi.fn> {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(UNAUTHENTICATED), { status: 401 }))),
    );
    const replace = vi.fn();
    vi.stubGlobal('location', { replace });
    return replace;
  }

  /** Módulos nuevos en cada test: la redirección es una por documento. */
  async function freshFetchWrapper(): Promise<typeof FetchWrapper> {
    vi.resetModules();
    return import('./fetch-wrapper');
  }

  it('RF-auth-26 lleva a /login con el aviso de sesión expirada y lanza ApiError', async () => {
    const replace = sessionExpires();
    const api = await freshFetchWrapper();

    const error: unknown = await api.get('/api/vms').catch((caught: unknown) => caught);

    expect(error).toMatchObject({ name: 'ApiError', status: 401, code: 'UNAUTHENTICATED' });
    expect(replace).toHaveBeenCalledWith('/login?aviso=sesion-expirada');
  });

  it('RF-auth-26 varios 401 simultáneos producen una sola redirección', async () => {
    const replace = sessionExpires();
    const api = await freshFetchWrapper();

    await Promise.allSettled([api.get('/api/vms'), api.get('/api/vms'), api.del('/api/vms/1')]);

    expect(replace).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['el login (credenciales incorrectas)', '/api/auth/login', {}],
    ['la verificación de /login', '/api/auth/me', { onUnauthorized: 'ignore' }],
  ] as const)('RF-auth-26 el 401 de %s no redirige', async (_case, path, options) => {
    const replace = sessionExpires();
    const api = await freshFetchWrapper();

    await expect(api.post(path, undefined, options)).rejects.toMatchObject({ status: 401 });
    expect(replace).not.toHaveBeenCalled();
  });
});
