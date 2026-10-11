import { afterEach, describe, expect, it, vi } from 'vitest';

import { requireAdmin, requireUser } from './session';

vi.mock('server-only', () => ({}));

/** Bordes de Next: `redirect` y `notFound` lanzan para cortar el render, como en Next. */
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('next/navigation', () => navigation);
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers({ cookie: 'vm_session=token' })),
}));

const ADMIN = { id: 'u-1', email: 'admin@ejemplo.com', role: 'Administrador' };
const CLIENT = { id: 'u-2', email: 'cliente@ejemplo.com', role: 'Cliente' };

/** Respuesta de `GET /api/auth/me` (borde: la red). */
function apiResponds(status: number, body?: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body ?? {}), { status }))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  navigation.redirect.mockClear();
  navigation.notFound.mockClear();
});

describe('requireUser', () => {
  it('RF-auth-24 devuelve el usuario de una sesión válida', async () => {
    apiResponds(200, { success: true, data: { user: CLIENT } });

    await expect(requireUser()).resolves.toEqual(CLIENT);
  });

  it.each([
    ['la API responde 503', false],
    ['falla la red', true],
  ])('RF-auth-24 si %s, lanza un error que no es una redirección', async (_case, isNetworkDown) => {
    if (isNetworkDown) {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))),
      );
    } else {
      apiResponds(503, { success: false });
    }

    await expect(requireUser()).rejects.toThrow('No se pudo verificar la sesión');
    expect(navigation.redirect).not.toHaveBeenCalled();
  });

  it.each([
    ['la API responde 401', 401, { success: false, error: { code: 'UNAUTHENTICATED' } }],
    [
      'el usuario tiene un rol desconocido',
      200,
      { success: true, data: { user: { ...ADMIN, role: 'Root' } } },
    ],
    ['la respuesta no trae usuario', 200, { success: true, data: {} }],
  ])('RF-auth-25 si %s, redirige a /login', async (_case, status, body) => {
    apiResponds(status, body);

    await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT /login');
  });
});

describe('requireAdmin', () => {
  it('RF-auth-31 responde la 404 a un Cliente', async () => {
    apiResponds(200, { success: true, data: { user: CLIENT } });

    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('RF-auth-31 devuelve el usuario a un Administrador', async () => {
    apiResponds(200, { success: true, data: { user: ADMIN } });

    await expect(requireAdmin()).resolves.toEqual(ADMIN);
  });
});
