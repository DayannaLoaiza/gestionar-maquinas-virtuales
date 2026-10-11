'use client';

import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { returnFocusAfter } from './dialog-focus';
import { useDeleteVm } from '../hooks/use-delete-vm';
import { useVisibleVmsSnapshot } from '../hooks/use-visible-vms';

import type { VmDialog } from '../store/vm-dialogs-store';

type DeleteDialog = Extract<VmDialog, { kind: 'delete' }>;

/**
 * Confirmar la eliminación (RF-virtual-machines-23): nombra la VM y dice que no se puede deshacer.
 * Al confirmar, la tarjeta desaparece al instante mientras se resuelve el `DELETE`.
 */
export function DeleteVmDialog({
  dialog,
  onClose,
}: Readonly<{ dialog: DeleteDialog; onClose: () => void }>) {
  const { remove } = useDeleteVm();
  const vms = useVisibleVmsSnapshot();
  const [vm] = useState(() => vms.find((item) => item.id === dialog.vmId));
  if (vm === undefined) return null;

  return (
    <AlertDialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusAfter(dialog);
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{`¿Eliminar ${vm.name}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            La máquina virtual se elimina de forma definitiva. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              remove(vm.id);
            }}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
