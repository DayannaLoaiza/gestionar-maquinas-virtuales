import { afterEach, describe, expect, it, vi } from 'vitest';

import { dataOrNotFound, serverFetch, serverFetchResult } from './server-fetch';

vi.mock('server-only', () => ({}));

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({ notFound }));

/** La cabecera `cookie` del pedido de la página que está renderizando Next (borde: `next/headers`). */
const incomingRequest = vi.hoisted((): { cookie: string | null } => ({ cookie: null }));
vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve(
      new Headers(incomingRequest.cookie === null ? {} : { cookie: incomingRequest.cookie }),
    ),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  notFound.mockClear();
  incomingRequest.cookie = null;
});

describe('serverFetchResult', () => {
  it('RF-app-shell-15 reenvía las cookies del pedido al backend, sin caché, y desenvuelve data', async () => {
    incomingRequest.cookie = '__Host-vm_session=eyJhbGciOiJIUzI1NiJ9.e30.firma; otra=1';
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ success: true, data: { status: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(serverFetchResult('/api/health')).resolves.toEqual({
      ok: true,
      data: { status: 'ok' },
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3001/api/health');
    // Solo estas opciones: ni caché ni `revalidate`. El `signal` es el tiempo máximo (RF-auth-24).
    expect(Object.keys(init).sort()).toEqual(['cache', 'headers', 'signal']);
    expect(init.cache).toBe('no-store');
    expect(init.headers).toEqual({
      cookie: '__Host-vm_session=eyJhbGciOiJIUzI1NiJ9.e30.firma; otra=1',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('conserva el status de un error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(serverFetchResult('/api/things')).resolves.toEqual({ ok: false, status: 503 });
  });

  it('devuelve status 0 ante una falla de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    await expect(serverFetchResult('/api/things')).resolves.toEqual({ ok: false, status: 0 });
  });
});

describe('serverFetch', () => {
  it('devuelve null ante cualquier error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(serverFetch('/api/things')).resolves.toBeNull();
  });
});

describe('dataOrNotFound', () => {
  it('devuelve los datos si salió bien', () => {
    expect(dataOrNotFound({ ok: true, data: 42 }, 'falló')).toBe(42);
  });

  it.each([400, 403, 404])('responde notFound() ante un %i', (status) => {
    expect(() => dataOrNotFound({ ok: false, status }, 'falló')).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('lanza para error.tsx ante cualquier otro status', () => {
    expect(() => dataOrNotFound({ ok: false, status: 500 }, 'No se pudo cargar')).toThrow(
      'No se pudo cargar (500)',
    );
    expect(notFound).not.toHaveBeenCalled();
  });
});
