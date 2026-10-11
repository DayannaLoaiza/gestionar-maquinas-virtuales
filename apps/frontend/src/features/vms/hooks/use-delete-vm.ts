'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { notify } from '@/components/ui/toast';
import { VM_TOASTS } from '@/config/vms';
import { isApiErrorStatus } from '@/lib/api/api-error';
import { removeVmFromCache, resyncVms } from '@/lib/vms/vm-cache';
import { deleteVm } from '@/lib/vms/vms-api';
import { VMS_MUTATION_KEY } from '@/lib/vms/vms-query';

import type { PendingVmChange } from '@/lib/vms/pending-changes';

type DeleteChange = Extract<PendingVmChange, { kind: 'delete' }>;

const NOT_FOUND = 404;

/**
 * Eliminación optimista (RF-virtual-machines-23), después de confirmar en el diálogo: la tarjeta
 * desaparece al instante mientras se resuelve `DELETE /api/vms/:id`.
 * - Con `204`, sale de la caché y hay toast de éxito.
 * - Con `404`, también sale (ya no existe) y hay una advertencia.
 * - Con otro error, deja de estar pendiente: reaparece en su posición, con su versión confirmada más
 *   reciente, y hay toast de error.
 */
export function useDeleteVm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: VMS_MUTATION_KEY,
    mutationFn: (change: DeleteChange) => deleteVm(change.id),
    onSuccess: (_result, change) => {
      removeVmFromCache(queryClient, change.id);
      notify.success(VM_TOASTS.deleted);
    },
    onError: (error, change) => {
      if (!isApiErrorStatus(error, NOT_FOUND)) {
        notify.apiError(error, VM_TOASTS.deleteFailed);
        return;
      }
      removeVmFromCache(queryClient, change.id);
      notify.warning(VM_TOASTS.alreadyDeleted);
    },
    onSettled: () => {
      resyncVms(queryClient);
    },
  });

  const remove = (id: string): void => {
    mutation.mutate({ kind: 'delete', id });
  };

  return { remove };
}
