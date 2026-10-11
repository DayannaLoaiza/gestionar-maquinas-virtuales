'use client';

import { useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { deriveVisibleVms, isPendingVmChange } from '@/lib/vms/pending-changes';
import { visibleVmsSnapshot } from '@/lib/vms/vm-cache';
import { VMS_MUTATION_KEY, vmsQueryOptions } from '@/lib/vms/vms-query';

import type { PendingVmChange, VisibleVm } from '@/lib/vms/pending-changes';

/** La query del listado: versiones confirmadas, estado de carga y error, y `refetch`. */
export function useVms() {
  return useQuery(vmsQueryOptions());
}

export type VmsQuery = ReturnType<typeof useVms>;

/** Los cambios optimistas que esperan respuesta: las variables de las mutaciones de `['vms']`. */
export function usePendingVmChanges(): PendingVmChange[] {
  const variables = useMutationState({
    filters: { mutationKey: VMS_MUTATION_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables,
  });
  return useMemo(() => variables.filter(isPendingVmChange), [variables]);
}

/**
 * El listado que se ve (RF-virtual-machines-24): las versiones confirmadas con los cambios
 * pendientes encima. Lo usan las tarjetas, el panel de recursos y los formularios (nombre único).
 */
export function useVisibleVms() {
  const query = useVms();
  const pending = usePendingVmChanges();
  const vms = useMemo<VisibleVm[]>(
    () => (query.data === undefined ? [] : deriveVisibleVms(query.data, pending)),
    [query.data, pending],
  );
  return { query, vms };
}

/**
 * Una foto del listado visible al montar, sin suscribirse: para los modales, que nacen con los datos
 * de ese momento. Con `useQuery`, abrir un modal volvería a pedir el listado.
 */
export function useVisibleVmsSnapshot(): VisibleVm[] {
  const queryClient = useQueryClient();
  const [vms] = useState(() => visibleVmsSnapshot(queryClient));
  return vms;
}
