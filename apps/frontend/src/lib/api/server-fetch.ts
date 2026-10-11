import 'server-only';

import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { clientEnv } from '@/lib/env';

export type ServerFetchResult<T> = { ok: true; data: T } | { ok: false; status: number };

/** Status sintético para una falla sin respuesta HTTP (red, tiempo agotado, JSON inválido). */
const NETWORK_ERROR_STATUS = 0;

/**
 * Una API que acepta la conexión y no responde no puede colgar el render: pasado este tiempo, la
 * página cae en `error.tsx` con "Reintentar" (RF-auth-24).
 */
const SERVER_FETCH_TIMEOUT_MS = 10_000;

/**
 * Las cookies que el navegador mandó en el pedido de la página, tal cual (la cabecera `cookie`
 * cruda, sin volver a codificar los valores): las mismas que mandaría por el rewrite `/api/*`.
 */
async function forwardedCookies(): Promise<Record<string, string>> {
  const cookie = (await headers()).get('cookie');
  return cookie ? { cookie } : {};
}

/**
 * Como `serverFetch`, pero conserva el status del error para que la página pueda distinguir "no
 * existe o no hay acceso" (`notFound()`) de "el API falló" (`error.tsx`).
 *
 * Es el único camino servidor → API que reenvía la sesión (RF-app-shell-15): las cookies del pedido
 * de la página, solo a `NEXT_PUBLIC_API_URL`. `no-store` siempre, porque toda respuesta depende de
 * la sesión (RF-auth-06) y la Data Cache de Next podría servírsela a otra persona.
 */
export async function serverFetchResult<T>(path: `/api/${string}`): Promise<ServerFetchResult<T>> {
  // Fuera del try: en el prerender, `headers()` lanza a propósito para volver dinámica la ruta.
  const cookieHeaders = await forwardedCookies();
  try {
    const response = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}${path}`, {
      cache: 'no-store',
      headers: cookieHeaders,
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, status: response.status };

    const json = (await response.json()) as { data?: T };
    return { ok: true, data: json.data as T };
  } catch {
    return { ok: false, status: NETWORK_ERROR_STATUS };
  }
}

/**
 * 400 (id mal formado en la URL), 403 y 404 se muestran igual a propósito: "no existe o no tienes
 * acceso". Distinguirlos le diría a quien prueba URLs qué recursos existen.
 */
const NOT_FOUND_STATUSES = [400, 403, 404];

/**
 * Los datos, o `notFound()` si el recurso no existe o no hay acceso. Cualquier otra falla (API
 * caído) se lanza para que la atrape el `error.tsx` de la ruta, con su botón de reintentar.
 */
export function dataOrNotFound<T>(result: ServerFetchResult<T>, failureMessage: string): T {
  if (result.ok) return result.data;
  if (NOT_FOUND_STATUSES.includes(result.status)) notFound();
  throw new Error(`${failureMessage} (${String(result.status)})`);
}

/**
 * Fetch de servidor para Server Components: arma la URL, reenvía la sesión, desenvuelve `data` y
 * devuelve `null` ante cualquier error. Datos siempre frescos (`no-store`).
 *
 * @example
 * const result = await serverFetch<{ things: Thing[] }>('/api/things?pageSize=100');
 */
export async function serverFetch<T>(path: `/api/${string}`): Promise<T | null> {
  const result = await serverFetchResult<T>(path);
  return result.ok ? result.data : null;
}
