import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { VmDialogsProvider } from '@/features/vms/store/vm-dialogs-provider';
import { VMS_QUERY_KEY } from '@/lib/vms/vms-query';

import type { VirtualMachine } from '@vm/shared-types';
import type { ReactNode } from 'react';

/**
 * Un `QueryClient` aislado por test, sin reintentos ni recolección de basura. Sin la recarga al
 * montar: cada test arranca con el listado ya cargado y decide qué pedidos ocurren.
 */
export function createTestQueryClient(vms?: VirtualMachine[]): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY, refetchOnMount: false },
      mutations: { retry: false },
    },
  });
  if (vms !== undefined) queryClient.setQueryData(VMS_QUERY_KEY, vms);
  return queryClient;
}

/** Los proveedores del Panel que usan los hooks de VMs: consultas y modales. */
export function VmTestProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <VmDialogsProvider>{children}</VmDialogsProvider>
    </QueryClientProvider>
  );
}

/** `VmTestProviders` como `wrapper` de `renderHook`. */
export function vmProviders(queryClient: QueryClient) {
  return function Providers({ children }: { children: ReactNode }) {
    return <VmTestProviders queryClient={queryClient}>{children}</VmTestProviders>;
  };
}
