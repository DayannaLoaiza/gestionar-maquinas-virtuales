import { vi } from 'vitest';

/** Respuesta de éxito de la API: `{ success: true, data }`. */
export function apiOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), { status });
}

/** Respuesta de error de la API: `{ success: false, error: { message, code } }`. */
export function apiFail(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, error: { message, code } }), { status });
}

/** `204` sin cuerpo. */
export function apiNoContent(): Response {
  return new Response(null, { status: 204 });
}

export interface Deferred {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
}

/**
 * Una respuesta que el test entrega cuando quiere: para ver la interfaz mientras el pedido sigue en
 * curso.
 */
export function deferredResponse(): Deferred {
  let resolve: (response: Response) => void = () => undefined;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

type Reply = Response | Deferred | (() => Response);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

/**
 * Reemplaza `fetch` (el borde de red): cada clave es `MÉTODO /ruta`, y su lista de respuestas se
 * consume en orden; la última se repite. Una ruta sin respuesta hace fallar el pedido.
 */
export function stubApi(routes: Record<string, Reply[]>): ReturnType<typeof vi.fn> {
  const queues = new Map(Object.entries(routes).map(([key, replies]) => [key, [...replies]]));
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${requestUrl(input)}`;
    const queue = queues.get(key);
    const reply = queue && queue.length > 1 ? queue.shift() : queue?.[0];
    if (reply === undefined) return Promise.reject(new Error(`Pedido inesperado: ${key}`));
    if (typeof reply === 'function') return Promise.resolve(reply());
    if (reply instanceof Response) return Promise.resolve(reply.clone());
    return reply.promise;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
