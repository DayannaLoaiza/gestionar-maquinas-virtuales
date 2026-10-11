import { VM_OPERATING_SYSTEMS, VM_STATUSES } from '@vm/shared-types';

import type { VirtualMachine } from '@vm/shared-types';

/** Una VM válida para los tests, con lo que cada uno necesite cambiar. */
export function makeVm(overrides: Partial<VirtualMachine> = {}): VirtualMachine {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'web-01',
    cores: 4,
    ram: 16,
    disk: 100,
    os: VM_OPERATING_SYSTEMS.UBUNTU,
    status: VM_STATUSES.OFF,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

/** Un id de VM con formato UUID, distinto por número. */
export function vmId(number: number): string {
  return `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
}
