import type { VmDialog } from '../store/vm-dialogs-store';

/** Atributos que marcan los controles que abren un modal, para devolverles el foco al cerrar. */
export const CREATE_VM_ATTRIBUTE = 'data-vm-create';
export const VM_ACTIONS_ATTRIBUTE = 'data-vm-actions';
/** El título del listado (`tabIndex={-1}`): destino del foco si el control ya no existe. */
export const VMS_HEADING_ID = 'vms-heading';

function openerSelector(dialog: VmDialog): string {
  if (dialog.kind === 'create') return `[${CREATE_VM_ATTRIBUTE}]`;
  return `[${VM_ACTIONS_ATTRIBUTE}="${CSS.escape(dialog.vmId)}"]`;
}

/**
 * Al cerrar un modal, el foco vuelve al control que lo abrió (RF-virtual-machines-27). Los de
 * editar y eliminar se abren desde un menú que ya se cerró, así que Radix no sabe a dónde volver: se
 * busca el disparador de esa VM. Si ya no existe (la VM se eliminó), el foco va al título del
 * listado.
 */
export function returnFocusAfter(dialog: VmDialog): void {
  const opener = document.querySelector<HTMLElement>(openerSelector(dialog));
  const isFocusable = opener !== null && !opener.matches(':disabled');
  const target = isFocusable ? opener : document.getElementById(VMS_HEADING_ID);
  target?.focus();
}
