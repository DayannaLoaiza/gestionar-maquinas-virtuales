/**
 * Textos de los toasts de las operaciones con VMs (RF-virtual-machines-25). Los fallbacks son el
 * texto final que se ve ante un `5xx`, un `VALIDATION_ERROR` o una falla de red: `toUserMessage`
 * muestra el mensaje de la API solo cuando está escrito para el usuario.
 */
export const VM_TOASTS = {
  created: 'Máquina virtual creada',
  createFailed: 'No se pudo crear la máquina virtual',
  updated: 'Cambios guardados',
  updateFailed: 'No se pudieron guardar los cambios',
  statusFailed: 'No se pudo cambiar el estado de la máquina virtual',
  deleted: 'Máquina virtual eliminada',
  deleteFailed: 'No se pudo eliminar la máquina virtual',
  alreadyDeleted: 'La máquina virtual ya había sido eliminada',
} as const;
