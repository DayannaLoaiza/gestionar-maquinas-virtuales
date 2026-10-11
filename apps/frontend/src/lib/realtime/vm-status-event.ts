import {
  VM_LIMITS,
  VM_NAME_PATTERN,
  VM_OPERATING_SYSTEM_VALUES,
  VM_STATUS_VALUES,
} from '@vm/shared-types';

import type { VirtualMachine, VmOperatingSystem, VmStatus } from '@vm/shared-types';

/**
 * Guarda del payload de `vm:status-changed` (RF-realtime-vm-status-12, hallazgo V4). El tipo de
 * TypeScript no alcanza: el evento llega por otro canal y el backend se despliega aparte. Escrita a
 * mano, como `isAuthUser`: las respuestas no se validan con Zod (`shared-types.md`).
 */

type Fields = Record<string, unknown>;

function isRecord(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** El mismo nombre que acepta la API (RF-virtual-machines-05). */
function isVmName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= VM_LIMITS.name.maxLength &&
    VM_NAME_PATTERN.test(value)
  );
}

/** Fecha y hora ISO 8601 con zona (`2026-10-11T10:00:00.000Z`), como las devuelve la API. */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_TIME.test(value) && !Number.isNaN(Date.parse(value));
}

/** Un entero dentro de los límites de la API: un valor fuera de rango deformaría sumas y gráficos. */
function isWithin(value: unknown, limits: { min: number; max: number }): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= limits.min &&
    value <= limits.max
  );
}

function isOperatingSystem(value: unknown): value is VmOperatingSystem {
  return VM_OPERATING_SYSTEM_VALUES.some((os) => os === value);
}

function isStatus(value: unknown): value is VmStatus {
  return VM_STATUS_VALUES.some((status) => status === value);
}

function readVm(item: Fields): VirtualMachine | null {
  const { id, name, cores, ram, disk, os, status, createdAt, updatedAt } = item;
  if (!isNonEmptyText(id) || !isVmName(name)) return null;
  if (!isWithin(cores, VM_LIMITS.cores) || !isWithin(ram, VM_LIMITS.ram)) return null;
  if (!isWithin(disk, VM_LIMITS.disk)) return null;
  if (!isOperatingSystem(os) || !isStatus(status)) return null;
  if (!isIsoDate(createdAt) || !isIsoDate(updatedAt)) return null;
  return { id, name, cores, ram, disk, os, status, createdAt, updatedAt };
}

/**
 * La VM del evento si tiene la forma de `VmStatusChangedEvent`; si no, `null` y el evento se
 * ignora. Copia solo los campos del modelo: uno que el backend agregara no llega al estado.
 */
export function readVmStatusChangedEvent(payload: unknown): VirtualMachine | null {
  if (!isRecord(payload) || !isRecord(payload.item)) return null;
  return readVm(payload.item);
}
