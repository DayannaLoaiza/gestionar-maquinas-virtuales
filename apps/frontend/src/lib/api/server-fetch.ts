import 'server-only';

import { notFound } from 'next/navigation';

import { clientEnv } from '@/lib/env';

export type ServerFetchResult<T> = { ok: true; data: T } | { ok: false; status: number };

/** Status sintético para una falla sin respuesta HTTP (red, JSON inválido). */
const NETWORK_ERROR_STATUS = 0;

/**
 * Como `serverFetch`, pero conserva el status del error para que la página pueda distinguir "no
 * existe o no hay acceso" (`notFound()`) de "el API falló" (`error.tsx`).
 *
 * Cuando exista autenticación, este es el único lugar que reenvía las cookies de sesión al backend.
 */
export async function serverFetchResult<T>(
  path: `/api/${string}`,
  revalidate = 0,
): Promise<ServerFetchResult<T>> {
  try {
    const response = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}${path}`, {
      next: { revalidate },
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
 * Fetch de servidor para Server Components: arma la URL, desenvuelve `data` y devuelve `null` ante
 * cualquier error. `revalidate = 0` por defecto: datos siempre frescos.
 *
 * @example
 * const result = await serverFetch<{ things: Thing[] }>('/api/things?pageSize=100');
 */
export async function serverFetch<T>(path: `/api/${string}`, revalidate = 0): Promise<T | null> {
  const result = await serverFetchResult<T>(path, revalidate);
  return result.ok ? result.data : null;
}
