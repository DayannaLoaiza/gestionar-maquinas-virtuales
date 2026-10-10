import { afterEach, describe, expect, it, vi } from 'vitest';

import { dataOrNotFound, serverFetch, serverFetchResult } from './server-fetch';

vi.mock('server-only', () => ({}));

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({ notFound }));

afterEach(() => {
  vi.unstubAllGlobals();
  notFound.mockClear();
});

describe('serverFetchResult', () => {
  it('desenvuelve data y arma la URL con la base del backend', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ success: true, data: { status: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(serverFetchResult('/api/health')).resolves.toEqual({
      ok: true,
      data: { status: 'ok' },
    });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/health', {
      next: { revalidate: 0 },
    });
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
