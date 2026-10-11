import { deriveVisibleVms, isPendingVmChange } from './pending-changes';
import { removeConfirmed, upsertConfirmed } from './vm-versions';
import { VMS_MUTATION_KEY, VMS_QUERY_KEY } from './vms-query';

import type { PendingVmChange, VisibleVm } from './pending-changes';
import type { QueryClient } from '@tanstack/react-query';
import type { VirtualMachine } from '@vm/shared-types';

/**
 * Escrituras en la caché de versiones confirmadas (`['vms']`). Solo entra lo que devolvió el
 * servidor; los cambios optimistas se dibujan encima (`pending-changes.ts`).
 */

/** Guarda `vm` si es más nueva que la que hay (RF-virtual-machines-24). */
export function applyConfirmedVm(queryClient: QueryClient, vm: VirtualMachine): void {
  queryClient.setQueryData<VirtualMachine[]>(VMS_QUERY_KEY, (list) =>
    upsertConfirmed(list ?? [], vm),
  );
}

/** Quita una VM que el servidor ya no tiene. */
export function removeVmFromCache(queryClient: QueryClient, id: string): void {
  queryClient.setQueryData<VirtualMachine[]>(VMS_QUERY_KEY, (list) =>
    list === undefined ? list : removeConfirmed(list, id),
  );
}

/**
 * Vuelve a pedir el listado. Cancela una recarga que esté en curso (`cancelRefetch`, por defecto en
 * `invalidateQueries`): así una respuesta que salió antes de terminar una mutación nunca la deshace.
 */
export function resyncVms(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: VMS_QUERY_KEY });
}

/** El listado confirmado que hay en la caché, o `undefined` si todavía no cargó. */
export function cachedVms(queryClient: QueryClient): VirtualMachine[] | undefined {
  return queryClient.getQueryData<VirtualMachine[]>(VMS_QUERY_KEY);
}

/** Los cambios optimistas en curso: las variables de las mutaciones pendientes de `['vms']`. */
export function pendingVmChanges(queryClient: QueryClient): PendingVmChange[] {
  return queryClient
    .getMutationCache()
    .findAll({ mutationKey: VMS_MUTATION_KEY, status: 'pending' })
    .map((mutation) => mutation.state.variables)
    .filter(isPendingVmChange);
}

/** El listado que se ve en este momento (confirmadas + pendientes), leído sin suscribirse. */
export function visibleVmsSnapshot(queryClient: QueryClient): VisibleVm[] {
  return deriveVisibleVms(cachedVms(queryClient) ?? [], pendingVmChanges(queryClient));
}
