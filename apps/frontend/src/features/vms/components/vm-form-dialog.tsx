'use client';

import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PANEL_TEXT } from '@/config/panel';
import {
  buildUpdatePayload,
  EMPTY_VM_FORM,
  otherVmNames,
  toVmFormOutput,
  toVmFormValues,
} from '@/schemas/vm-form';

import { returnFocusAfter } from './dialog-focus';
import { VmForm } from './vm-form';
import { useCreateVm } from '../hooks/use-create-vm';
import { useUpdateVm } from '../hooks/use-update-vm';
import { useVisibleVmsSnapshot } from '../hooks/use-visible-vms';

import type { VmDialog } from '../store/vm-dialogs-store';
import type { ReactNode } from 'react';

const FORM_DESCRIPTION = 'Todos los campos son obligatorios. La RAM y el disco van en GB.';

interface FormDialogFrameProps {
  dialog: VmDialog;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * El modal de un formulario (DF2). Un clic fuera no lo cierra, para no perder lo escrito; sí
 * `Esc`, "Cancelar" y su botón de cerrar (RF-virtual-machines-16).
 */
function FormDialogFrame({ dialog, title, onClose, children }: Readonly<FormDialogFrameProps>) {
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusAfter(dialog);
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{FORM_DESCRIPTION}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

type CreateDialog = Extract<VmDialog, { kind: 'create' }>;

/**
 * Crear una VM (RF-virtual-machines-16, 21): vacío, o con el borrador y el error de una creación que
 * falló (DF4). Al enviar, la creación optimista empieza y el modal se cierra sin esperar.
 */
export function CreateVmDialog({
  dialog,
  onClose,
}: Readonly<{ dialog: CreateDialog; onClose: () => void }>) {
  const { create } = useCreateVm();
  const vms = useVisibleVmsSnapshot();
  const [otherNames] = useState(() => otherVmNames(vms));

  return (
    <FormDialogFrame dialog={dialog} title={PANEL_TEXT.create} onClose={onClose}>
      <VmForm
        defaultValues={dialog.draft ?? EMPTY_VM_FORM}
        otherNames={otherNames}
        nameError={dialog.nameError}
        submitLabel={PANEL_TEXT.create}
        onSubmit={(output) => {
          create(output);
          onClose();
        }}
      />
    </FormDialogFrame>
  );
}

type EditDialog = Extract<VmDialog, { kind: 'edit' }>;

/**
 * Editar una VM (RF-virtual-machines-19, 20, 22). Abre con los valores que se veían y los conserva
 * aunque la VM cambie mientras tanto: el `PUT` lleva solo lo que la persona cambió.
 */
export function EditVmDialog({
  dialog,
  onClose,
}: Readonly<{ dialog: EditDialog; onClose: () => void }>) {
  const { update } = useUpdateVm();
  const vms = useVisibleVmsSnapshot();
  const [vm] = useState(() => vms.find((item) => item.id === dialog.vmId));
  const [otherNames] = useState(() => otherVmNames(vms, dialog.vmId));
  if (vm === undefined) return null;
  const initialOutput = toVmFormOutput(vm);

  return (
    <FormDialogFrame dialog={dialog} title={`Editar ${vm.name}`} onClose={onClose}>
      <VmForm
        defaultValues={toVmFormValues(vm)}
        otherNames={otherNames}
        initialOutput={initialOutput}
        submitLabel="Guardar cambios"
        onSubmit={(output) => {
          const changes = buildUpdatePayload(initialOutput, output);
          if (changes !== null) update(vm.id, changes, 'form');
          onClose();
        }}
      />
    </FormDialogFrame>
  );
}
