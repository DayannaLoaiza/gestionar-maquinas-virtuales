'use client';

import { VM_STATUSES } from '@vm/shared-types';

import { Switch } from '@/components/ui/switch';

import { useUpdateVm } from '../hooks/use-update-vm';

import type { VisibleVm } from '@/lib/vms/pending-changes';

/**
 * Enciende o apaga la VM al instante, sin confirmación (RF-virtual-machines-22): es un cambio de
 * registro que se deshace con otro clic. Deshabilitado mientras la VM tiene un cambio pendiente, así
 * un doble clic no manda dos pedidos. Se deshabilita con `aria-disabled` y no con `disabled`: un
 * control deshabilitado pierde el foco, y quien lo usaba con el teclado tendría que volver a
 * recorrer la página (RF-virtual-machines-27). El nombre accesible incluye la VM y el estado lo
 * anuncia `aria-checked`.
 */
export function VmPowerSwitch({ vm }: Readonly<{ vm: VisibleVm }>) {
  const { update } = useUpdateVm();
  const isOn = vm.status === VM_STATUSES.ON;
  const isPending = vm.pending !== null;

  return (
    <Switch
      checked={isOn}
      aria-disabled={isPending}
      aria-label={`Encender ${vm.name}`}
      onCheckedChange={(checked) => {
        if (isPending) return;
        update(vm.id, { status: checked ? VM_STATUSES.ON : VM_STATUSES.OFF }, 'switch');
      }}
    />
  );
}
