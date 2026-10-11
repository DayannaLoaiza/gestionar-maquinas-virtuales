'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { notify } from '@/components/ui/toast';
import { VM_TOASTS } from '@/config/vms';
import { isApiErrorStatus } from '@/lib/api/api-error';
import { applyConfirmedVm, removeVmFromCache, resyncVms } from '@/lib/vms/vm-cache';
import { updateVm } from '@/lib/vms/vms-api';
import { VMS_MUTATION_KEY } from '@/lib/vms/vms-query';

import type { PendingVmChange } from '@/lib/vms/pending-changes';
import type { UpdateVirtualMachineDTO } from '@vm/shared-types';

type UpdateChange = Extract<PendingVmChange, { kind: 'update' }>;

const NOT_FOUND = 404;

/**
 * Edición y encendido optimistas (RF-virtual-machines-22): el cambio se ve al instante y la tarjeta
 * queda "Guardando…" hasta que `PUT /api/vms/:id` responde.
 * - Con `200`, la versión del servidor entra a la caché; el formulario confirma con un toast, el
 *   interruptor no (RF-virtual-machines-25).
 * - Con `404`, la VM sale del listado (otro Administrador la eliminó) y el toast lleva el mensaje
 *   de la API.
 * - Con otro error, el cambio deja de estar pendiente y se ve la versión confirmada más reciente,
 *   también una que haya llegado por un evento mientras tanto (RF-virtual-machines-24).
 */
export function useUpdateVm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: VMS_MUTATION_KEY,
    mutationFn: (change: UpdateChange) => updateVm(change.id, change.changes),
    onSuccess: (vm, change) => {
      applyConfirmedVm(queryClient, vm);
      if (change.origin === 'form') notify.success(VM_TOASTS.updated);
    },
    onError: (error, change) => {
      if (isApiErrorStatus(error, NOT_FOUND)) removeVmFromCache(queryClient, change.id);
      const fallback = change.origin === 'form' ? VM_TOASTS.updateFailed : VM_TOASTS.statusFailed;
      notify.apiError(error, fallback);
    },
    onSettled: () => {
      resyncVms(queryClient);
    },
  });

  const update = (
    id: string,
    changes: UpdateVirtualMachineDTO,
    origin: UpdateChange['origin'],
  ): void => {
    mutation.mutate({ kind: 'update', id, changes, origin });
  };

  return { update };
}
