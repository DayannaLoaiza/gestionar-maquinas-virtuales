import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

import { VMS_QUERY_KEY } from '@/lib/vms/vms-query';
import { fetchVmsOnServer } from '@/lib/vms/vms-server';

import type { ReactNode } from 'react';

/**
 * Precarga el listado en el servidor y se lo pasa a la caché del navegador (guía "Advanced Server
 * Rendering" de TanStack Query): el Panel llega con las VMs en el HTML, sin un viaje más después de
 * hidratar. Un `QueryClient` nuevo por pedido. Si la API falla, no se deshidrata nada y el navegador
 * vuelve a pedir, con skeleton, y si sigue fallando muestra el error con "Reintentar" (D3).
 */
export async function VmsPrefetch({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = new QueryClient();
  // Una falla no se propaga a propósito: el navegador vuelve a pedir y, si sigue fallando, muestra
  // el estado de error con "Reintentar". Una query con error no se deshidrata.
  await queryClient
    .query({ queryKey: VMS_QUERY_KEY, queryFn: fetchVmsOnServer })
    .catch(() => undefined);
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
