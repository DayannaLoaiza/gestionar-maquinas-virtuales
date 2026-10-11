import { environmentManager, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/api-error';

/** Una falla de red o un `5xx` puede ser pasajera; un `4xx` no cambia por reintentar. */
const MAX_QUERY_RETRIES = 2;
const FIRST_SERVER_ERROR_STATUS = 500;

/**
 * Reintenta una lectura solo ante red o `5xx`. Nunca ante un `4xx`: un `401` ya lleva al login
 * (RF-auth-26) y reintentarlo pediría la misma respuesta.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  if (error instanceof ApiError) return error.status >= FIRST_SERVER_ERROR_STATUS;
  return true;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // `staleTime: 0`: volver a la pestaña siempre recarga (RF-virtual-machines-26).
      queries: { staleTime: 0, retry: shouldRetryQuery },
      // Una escritura nunca se repite sola: podría crear dos VMs.
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * El `QueryClient` de la aplicación (guía "Advanced Server Rendering" de TanStack Query): en el
 * servidor, uno nuevo por llamada, para que dos pedidos nunca compartan datos; en el navegador, uno
 * por pestaña. Cerrar sesión o cambiar de cuenta recarga la pestaña entera (RF-auth-26, 29, 33), así
 * que la caché nunca pasa de una persona a otra.
 */
export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
