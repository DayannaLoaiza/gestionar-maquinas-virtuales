import { VM_STATUSES } from '@vm/shared-types';

import type {
  CreateVirtualMachineDTO,
  UpdateVirtualMachineDTO,
  VirtualMachine,
} from '@vm/shared-types';

/**
 * Un cambio optimista que todavía espera la respuesta de la API: las variables de una mutación en
 * curso (`mutationKey: ['vms']`). No se guarda en la caché: se dibuja encima de las versiones
 * confirmadas, así que si falla no hay nada que revertir (RF-virtual-machines-24, hallazgo V2).
 */
export type PendingVmChange =
  | {
      kind: 'create';
      /** Id provisional de la tarjeta hasta que la API devuelva el suyo. */
      tempId: string;
      dto: CreateVirtualMachineDTO;
      /** Instante del envío (ISO 8601): ordena las creaciones pendientes. */
      submittedAt: string;
    }
  | {
      kind: 'update';
      id: string;
      changes: UpdateVirtualMachineDTO;
      /** El formulario de edición o el interruptor de la tarjeta (este, sin toast de éxito). */
      origin: 'form' | 'switch';
    }
  | { kind: 'delete'; id: string };

export type PendingKind = PendingVmChange['kind'];

const PENDING_KINDS: readonly string[] = ['create', 'update', 'delete'] satisfies PendingKind[];

/**
 * Las variables de una mutación de `['vms']` son siempre un `PendingVmChange`; TanStack Query las
 * entrega como `unknown`.
 */
export function isPendingVmChange(value: unknown): value is PendingVmChange {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    typeof value.kind === 'string' &&
    PENDING_KINDS.includes(value.kind)
  );
}

/** Una VM tal como se ve: su versión confirmada con los cambios pendientes aplicados. */
export interface VisibleVm extends VirtualMachine {
  /** Qué cambio espera respuesta; `null` si ninguno. */
  pending: PendingKind | null;
}

function toPendingCreation(change: Extract<PendingVmChange, { kind: 'create' }>): VisibleVm {
  const { dto, tempId, submittedAt } = change;
  return {
    id: tempId,
    name: dto.name,
    cores: dto.cores,
    ram: dto.ram,
    disk: dto.disk,
    os: dto.os,
    status: dto.status ?? VM_STATUSES.OFF,
    createdAt: submittedAt,
    updatedAt: submittedAt,
    pending: 'create',
  };
}

function applyChanges(vm: VirtualMachine, changes: UpdateVirtualMachineDTO): VirtualMachine {
  return {
    ...vm,
    name: changes.name ?? vm.name,
    cores: changes.cores ?? vm.cores,
    ram: changes.ram ?? vm.ram,
    disk: changes.disk ?? vm.disk,
    os: changes.os ?? vm.os,
    status: changes.status ?? vm.status,
  };
}

/**
 * El listado que se ve (RF-virtual-machines-21…24): primero las creaciones pendientes, la más
 * reciente arriba; después las versiones confirmadas en su orden, con sus ediciones pendientes
 * aplicadas y sin las que tienen una eliminación pendiente.
 *
 * Una creación pendiente se oculta si ya hay una VM confirmada con ese nombre (los nombres son
 * únicos sin distinguir mayúsculas): es su propia respuesta, que llegó un instante antes de que la
 * mutación deje de estar pendiente, o una VM que otro creó y hará fallar este `POST` con `409`.
 * Así nunca se ve dos veces ni suma dos veces en el panel de recursos.
 */
export function deriveVisibleVms(
  confirmed: readonly VirtualMachine[],
  pending: readonly PendingVmChange[],
): VisibleVm[] {
  const deletedIds = new Set(
    pending.filter((change) => change.kind === 'delete').map((change) => change.id),
  );
  const remaining = confirmed.filter((vm) => !deletedIds.has(vm.id));
  const takenNames = new Set(remaining.map((vm) => vm.name.toLowerCase()));
  const creations = pending
    .filter((change) => change.kind === 'create')
    .filter((change) => !takenNames.has(change.dto.name.toLowerCase()))
    .toSorted((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
    .map(toPendingCreation);
  const updates = pending.filter((change) => change.kind === 'update');

  const existing = remaining.map((vm): VisibleVm => {
    const own = updates.filter((change) => change.id === vm.id);
    if (own.length === 0) return { ...vm, pending: null };
    const updated = own.reduce((current, change) => applyChanges(current, change.changes), vm);
    return { ...updated, pending: 'update' };
  });

  return [...creations, ...existing];
}
