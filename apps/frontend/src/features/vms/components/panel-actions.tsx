'use client';

import { AdminOnly } from '@/components/auth/admin-only';
import { RealtimeIndicator } from '@/components/realtime/realtime-indicator';

import { CreateVmButton } from './create-vm-button';

/**
 * Acciones del encabezado del Panel: el estado del tiempo real (RF-realtime-vm-status-16) y "Crear
 * máquina virtual", que existe solo para el Administrador (RF-virtual-machines-14) y solo con el
 * listado cargado: sobre un listado que no cargó no se ofrece crear (RF-virtual-machines-15).
 */
export function PanelActions({ canCreate }: Readonly<{ canCreate: boolean }>) {
  return (
    <>
      <RealtimeIndicator />
      <AdminOnly>{canCreate && <CreateVmButton />}</AdminOnly>
    </>
  );
}
