import { queryOptions } from '@tanstack/react-query';

import { mergeFetchedVms } from './vm-versions';
import { fetchVms } from './vms-api';

import type { VirtualMachine } from '@vm/shared-types';

/** Clave de la caché con las versiones confirmadas de las VMs. */
export const VMS_QUERY_KEY = ['vms'] as const;

/** Clave de las mutaciones de VMs: sus variables son los cambios pendientes que se dibujan encima. */
export const VMS_MUTATION_KEY = ['vms'] as const;

/** La caché solo guarda listas de VMs; esto evita castear el `unknown` de `structuralSharing`. */
function isVmList(value: unknown): value is VirtualMachine[] {
  return Array.isArray(value);
}

/**
 * La query del listado (D1 del plan):
 * - al montar se vuelve a pedir aunque haya datos del servidor: cubre los eventos emitidos entre
 *   la precarga y la conexión del socket cuando el socket conectó antes de hidratar el listado (si
 *   conecta después, lo cubre su propia resincronización, RF-realtime-vm-status-14);
 * - `structuralSharing`: cada dato nuevo (recarga o `setQueryData`) se une con el anterior por
 *   versión, así una respuesta atrasada nunca pisa una más nueva (RF-virtual-machines-24).
 */
export function vmsQueryOptions() {
  return queryOptions({
    queryKey: VMS_QUERY_KEY,
    queryFn: fetchVms,
    structuralSharing: (previous: unknown, next: unknown) => {
      if (!isVmList(next)) return next;
      return mergeFetchedVms(isVmList(previous) ? previous : undefined, next);
    },
  });
}
