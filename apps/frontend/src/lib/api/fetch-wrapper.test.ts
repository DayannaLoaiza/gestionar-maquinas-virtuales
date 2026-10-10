import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api-error';
import { del, get, post } from './fetch-wrapper';

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

describe('fetch-wrapper', () => {
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
