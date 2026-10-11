'use client';

import { useState } from 'react';

import { DotsVertical } from '@/components/svg/dots-vertical';
import { Pencil } from '@/components/svg/pencil';
import { Trash } from '@/components/svg/trash';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { VmPowerSwitch } from './vm-power-switch';
import { useVmDialogs } from '../store/vm-dialogs-provider';

import type { VisibleVm } from '@/lib/vms/pending-changes';

/**
 * Los controles de Administrador de una tarjeta: el interruptor y el menú con "Editar" y "Eliminar"
 * (RF-virtual-machines-14, 22, 23). Una VM cuya creación sigue pendiente todavía no existe en el
 * servidor: no tiene acciones. Con otro cambio pendiente, quedan deshabilitadas con `aria-disabled`
 * (siguen enfocables, así el foco no se pierde, RF-virtual-machines-27) y el menú no se abre.
 */
export function VmCardActions({ vm }: Readonly<{ vm: VisibleVm }>) {
  const open = useVmDialogs((state) => state.open);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  if (vm.pending === 'create') return null;
  const isPending = vm.pending !== null;

  return (
    <div className="flex items-center gap-2">
      <VmPowerSwitch vm={vm} />
      <DropdownMenu
        open={isMenuOpen && !isPending}
        onOpenChange={(isOpen) => {
          setIsMenuOpen(isOpen && !isPending);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-disabled={isPending}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            aria-label={`Acciones de ${vm.name}`}
            data-vm-actions={vm.id}
          >
            <DotsVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              open({ kind: 'edit', vmId: vm.id });
            }}
          >
            <Pencil />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              open({ kind: 'delete', vmId: vm.id });
            }}
          >
            <Trash />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
