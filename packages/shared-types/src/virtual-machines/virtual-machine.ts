import type { EntityId, Timestamps } from '../common/id';

/** Estados de una VM: los únicos valores válidos, en la API y en la base. */
export const VM_STATUSES = {
  ON: 'Encendida',
  OFF: 'Apagada',
} as const;

export type VmStatus = (typeof VM_STATUSES)[keyof typeof VM_STATUSES];

export const VM_STATUS_VALUES = Object.values(VM_STATUSES) as [VmStatus, ...VmStatus[]];

/** Catálogo cerrado de sistemas operativos. Agregar uno exige una migración (enum `vm_os`). */
export const VM_OPERATING_SYSTEMS = {
  UBUNTU: 'Ubuntu',
  DEBIAN: 'Debian',
  ROCKY_LINUX: 'Rocky Linux',
  RHEL: 'Red Hat Enterprise Linux',
  WINDOWS_SERVER: 'Windows Server',
} as const;

export type VmOperatingSystem = (typeof VM_OPERATING_SYSTEMS)[keyof typeof VM_OPERATING_SYSTEMS];

export const VM_OPERATING_SYSTEM_VALUES = Object.values(VM_OPERATING_SYSTEMS) as [
  VmOperatingSystem,
  ...VmOperatingSystem[],
];

/**
 * Límites de cada campo (`ram` y `disk` en GB). La base los repite en sus `CHECK`: cambiar uno
 * exige una migración.
 */
export const VM_LIMITS = {
  name: { maxLength: 63 },
  cores: { min: 1, max: 128 },
  ram: { min: 1, max: 1024 },
  disk: { min: 1, max: 65_536 },
} as const;

/** Letras sin tilde, dígitos, `-`, `_` y `.`; empieza y termina con letra o dígito. */
export const VM_NAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

/** Una VM tal como sale de la API: nunca lleva el creador ni columnas internas. */
export interface VirtualMachine extends Timestamps {
  id: EntityId;
  name: string;
  cores: number;
  /** En GB. */
  ram: number;
  /** En GB. */
  disk: number;
  os: VmOperatingSystem;
  status: VmStatus;
}
