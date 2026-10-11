import { applyConfirmedVm, cachedVms, resyncVms, visibleVmsSnapshot } from './vm-cache';

import type { QueryClient } from '@tanstack/react-query';
import type { VirtualMachine, VmStatus } from '@vm/shared-types';

/** El estado que se ve de la VM `id` (versión confirmada más cambios pendientes), si se ve. */
function visibleStatus(queryClient: QueryClient, id: string): VmStatus | undefined {
  return visibleVmsSnapshot(queryClient).find((vm) => vm.id === id)?.status;
}

/**
 * Aplica un `vm:status-changed` válido sobre el listado (RF-realtime-vm-status-12):
 * - si la VM no está en el listado (p. ej., otro Administrador la creó después de la última carga),
 *   vuelve a pedir el listado;
 * - si está, guarda la versión solo si es más nueva (RF-virtual-machines-24); una eliminación
 *   pendiente la sigue ocultando.
 *
 * Devuelve si cambió el estado que se ve, para resaltar la tarjeta (RF-realtime-vm-status-13): en la
 * pestaña que hizo el cambio, el estado visible ya era el nuevo.
 */
export function applyVmEvent(queryClient: QueryClient, vm: VirtualMachine): boolean {
  const confirmed = cachedVms(queryClient);
  if (confirmed === undefined) return false;
  if (!confirmed.some((item) => item.id === vm.id)) {
    resyncVms(queryClient);
    return false;
  }

  const before = visibleStatus(queryClient, vm.id);
  applyConfirmedVm(queryClient, vm);
  const after = visibleStatus(queryClient, vm.id);
  return before !== undefined && after !== undefined && before !== after;
}
