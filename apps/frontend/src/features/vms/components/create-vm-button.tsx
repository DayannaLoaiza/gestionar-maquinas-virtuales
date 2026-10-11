'use client';

import { Plus } from '@/components/svg/plus';
import { Button } from '@/components/ui/button';
import { PANEL_TEXT } from '@/config/panel';

import { useVmDialogs } from '../store/vm-dialogs-provider';

/**
 * Abre el formulario de creación (RF-virtual-machines-16). Es un control de Administrador: quien
 * lo usa lo pone dentro de `AdminOnly` (RF-virtual-machines-14).
 */
export function CreateVmButton() {
  const open = useVmDialogs((state) => state.open);
  return (
    <Button
      data-vm-create=""
      onClick={() => {
        open({ kind: 'create' });
      }}
    >
      <Plus />
      {PANEL_TEXT.create}
    </Button>
  );
}
