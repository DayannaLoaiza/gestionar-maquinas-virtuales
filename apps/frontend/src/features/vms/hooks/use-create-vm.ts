'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { notify } from '@/components/ui/toast';
import { VM_TOASTS } from '@/config/vms';
import { ApiError, isApiErrorStatus } from '@/lib/api/api-error';
import { applyConfirmedVm, resyncVms } from '@/lib/vms/vm-cache';
import { createVm } from '@/lib/vms/vms-api';
import { VMS_MUTATION_KEY } from '@/lib/vms/vms-query';
import { toVmFormValues, VM_NAME_TAKEN_MESSAGE } from '@/schemas/vm-form';

import { useVmDialogsStoreApi } from '../store/vm-dialogs-provider';

import type { PendingVmChange } from '@/lib/vms/pending-changes';
import type { CreateVirtualMachineDTO } from '@vm/shared-types';

type CreateChange = Extract<PendingVmChange, { kind: 'create' }>;

const UNAUTHORIZED = 401;

/** El error del campo nombre si la API respondió `VM_NAME_TAKEN` (`409`), o `null`. */
function nameErrorOf(error: unknown): string | null {
  return error instanceof ApiError && error.code === 'VM_NAME_TAKEN' ? VM_NAME_TAKEN_MESSAGE : null;
}

/**
 * Creación optimista (RF-virtual-machines-21): la VM se ve al instante, primera y "Guardando…",
 * mientras se resuelve `POST /api/vms`.
 * - Con `201`, la versión del servidor entra a la caché (su `id`, el nombre recortado).
 * - Si falla, deja de estar pendiente (desaparece), hay toast de error y el formulario se reabre
 *   solo con lo escrito (DF4); con `409`, con el error en el nombre. Con un `401` no: la sesión
 *   expiró y `fetch-wrapper` ya está llevando a `/login`.
 *
 * Los callbacks van en `useMutation` y no en `mutate`: el formulario se cierra al enviar, y los de
 * `mutate` no corren si el componente ya se desmontó.
 */
export function useCreateVm() {
  const queryClient = useQueryClient();
  const dialogs = useVmDialogsStoreApi();

  const mutation = useMutation({
    mutationKey: VMS_MUTATION_KEY,
    mutationFn: (change: CreateChange) => createVm(change.dto),
    onSuccess: (vm) => {
      applyConfirmedVm(queryClient, vm);
      notify.success(VM_TOASTS.created);
    },
    onError: (error, change) => {
      notify.apiError(error, VM_TOASTS.createFailed);
      if (isApiErrorStatus(error, UNAUTHORIZED)) return;
      dialogs.getState().createFailed({
        draft: toVmFormValues(change.dto),
        nameError: nameErrorOf(error),
      });
    },
    onSettled: () => {
      resyncVms(queryClient);
    },
  });

  const create = (dto: CreateVirtualMachineDTO): void => {
    mutation.mutate({
      kind: 'create',
      tempId: crypto.randomUUID(),
      dto,
      submittedAt: new Date().toISOString(),
    });
  };

  return { create };
}
