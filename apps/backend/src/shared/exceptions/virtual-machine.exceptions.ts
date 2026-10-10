import { ConflictException, NotFoundException } from '@nestjs/common';

/**
 * Excepciones de `virtual-machines`. Sus mensajes son para el usuario: el frontend muestra un 4xx
 * tal cual (`docs/specs/virtual-machines/spec.md` → "Contratos visibles").
 */

/** Otra VM ya usa ese nombre, sin distinguir mayúsculas (RF-virtual-machines-06). */
export class VmNameTakenException extends ConflictException {
  constructor() {
    super({ message: 'Ya existe una máquina virtual con ese nombre', code: 'VM_NAME_TAKEN' });
  }
}

/** El id no corresponde a ninguna VM: nunca existió o ya se eliminó (RF-virtual-machines-10). */
export class VmNotFoundException extends NotFoundException {
  constructor() {
    super({ message: 'La máquina virtual no existe o fue eliminada', code: 'VM_NOT_FOUND' });
  }
}
