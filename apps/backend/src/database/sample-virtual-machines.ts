import { VM_OPERATING_SYSTEMS, VM_STATUSES } from '@vm/shared-types';

import type { CreateVirtualMachineDTO } from '@vm/shared-types';

const { UBUNTU, DEBIAN, ROCKY_LINUX, RHEL, WINDOWS_SERVER } = VM_OPERATING_SYSTEMS;
const { ON, OFF } = VM_STATUSES;

/**
 * VMs de ejemplo de `db:seed` (RF-virtual-machines-28, tabla "VMs de ejemplo" de la spec): los cinco
 * sistemas operativos, Encendidas y Apagadas. El seed las valida con `CreateVirtualMachineDTO`
 * antes de crearlas, como el `POST`.
 */
export const SAMPLE_VIRTUAL_MACHINES: readonly CreateVirtualMachineDTO[] = [
  { name: 'web-01', os: UBUNTU, cores: 2, ram: 4, disk: 50, status: ON },
  { name: 'api-01', os: DEBIAN, cores: 4, ram: 8, disk: 100, status: ON },
  { name: 'db-01', os: ROCKY_LINUX, cores: 8, ram: 32, disk: 500, status: ON },
  { name: 'ad-01', os: WINDOWS_SERVER, cores: 4, ram: 16, disk: 120, status: ON },
  { name: 'erp-01', os: RHEL, cores: 8, ram: 16, disk: 250, status: OFF },
  { name: 'backup-01', os: UBUNTU, cores: 2, ram: 8, disk: 2048, status: OFF },
];
