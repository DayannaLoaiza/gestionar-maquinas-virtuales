'use client';

import { AdminOnly } from '@/components/auth/admin-only';

import { DeleteVmDialog } from './delete-vm-dialog';
import { CreateVmDialog, EditVmDialog } from './vm-form-dialog';
import { useVmDialogs } from '../store/vm-dialogs-provider';

/**
 * El modal abierto del Panel. Se monta al abrirse, así nace con los datos de ese momento. Sin modal
 * abierto no lee el listado: este componente está fuera del `Suspense` de la precarga, y leerlo en
 * el servidor crearía la query vacía antes de hidratarla (el HTML saldría sin las VMs).
 */
function OpenDialog() {
  const current = useVmDialogs((state) => state.current);
  const close = useVmDialogs((state) => state.close);
  if (current === null) return null;

  if (current.kind === 'create') return <CreateVmDialog dialog={current} onClose={close} />;
  if (current.kind === 'edit') {
    return <EditVmDialog key={current.vmId} dialog={current} onClose={close} />;
  }
  return <DeleteVmDialog key={current.vmId} dialog={current} onClose={close} />;
}

/** Los modales de escritura existen solo para el Administrador (RF-virtual-machines-14). */
export function VmDialogs() {
  return (
    <AdminOnly>
      <OpenDialog />
    </AdminOnly>
  );
}
