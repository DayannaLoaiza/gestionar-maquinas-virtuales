// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { proxy } from './proxy';

const RENEWED_COOKIE = 'vm_session=nuevo; Max-Age=604800; Path=/; HttpOnly; SameSite=Strict';

function pageRequest(pathname: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    headers: cookie === undefined ? {} : { cookie },
  });
}

/** `GET /api/auth/me` (borde: la red). */
function apiResponds(status: number, setCookie?: string): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response('{}', {
        status,
        headers: setCookie === undefined ? {} : { 'set-cookie': setCookie },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('proxy (RF-auth-27)', () => {
  it('RF-auth-27 reenvía al navegador la renovación de la cookie que emite la API', async () => {
    const fetchMock = apiResponds(200, RENEWED_COOKIE);

    const response = await proxy(pageRequest('/', 'vm_session=viejo'));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/auth/me',
      expect.objectContaining({ headers: { cookie: 'vm_session=viejo' }, cache: 'no-store' }),
    );
    expect(response.headers.getSetCookie()).toEqual([RENEWED_COOKIE]);
    expect(response.headers.get('location')).toBeNull();
  });

  it('RF-auth-27 sin cookie no llama a la API ni redirige', async () => {
    const fetchMock = apiResponds(200);

    const response = await proxy(pageRequest('/'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBeNull();
  });

  it('RF-auth-27 si la API no responde, sigue sin redirigir y sin cookies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))),
    );

    const response = await proxy(pageRequest('/', 'vm_session=viejo'));

    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});
