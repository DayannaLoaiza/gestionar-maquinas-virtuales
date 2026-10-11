import { describe, expect, it } from 'vitest';

import { VM_STATUSES } from '@vm/shared-types';

import { makeVm, vmId } from '@/test/vm-fixtures';

import { rankContributions, summarizeResources } from './resource-summary';

const ON = VM_STATUSES.ON;
const OFF = VM_STATUSES.OFF;

describe('RF-resource-dashboard-01 totales de las VMs encendidas', () => {
  it('suma cores, RAM y disco de las encendidas, y de todas como referencia', () => {
    const vms = [
      makeVm({ id: vmId(1), status: ON, cores: 4, ram: 16, disk: 100 }),
      makeVm({ id: vmId(2), status: OFF, cores: 8, ram: 32, disk: 500 }),
      makeVm({ id: vmId(3), status: ON, cores: 2, ram: 8, disk: 50 }),
    ];

    expect(summarizeResources(vms)).toEqual({
      active: { cores: 6, ram: 24, disk: 150 },
      allocated: { cores: 14, ram: 56, disk: 650 },
      activeCount: 2,
      totalCount: 3,
    });
  });

  it('sin VMs o sin ninguna encendida, los totales de las encendidas son cero', () => {
    const zero = { cores: 0, ram: 0, disk: 0 };

    expect(summarizeResources([])).toEqual({
      active: zero,
      allocated: zero,
      activeCount: 0,
      totalCount: 0,
    });
    expect(summarizeResources([makeVm({ status: OFF, cores: 4 })])).toMatchObject({
      active: zero,
      allocated: { cores: 4 },
      activeCount: 0,
      totalCount: 1,
    });
  });
});

describe('RF-resource-dashboard-02 aporte de cada VM encendida', () => {
  const activeVms = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      makeVm({
        id: vmId(index + 1),
        name: `vm-${String(index + 1)}`,
        status: ON,
        cores: index + 1,
      }),
    );

  it('ordena de mayor a menor; a igual valor, por nombre sin distinguir mayúsculas', () => {
    const vms = [
      makeVm({ id: vmId(1), name: 'web-02', status: ON, cores: 8 }),
      makeVm({ id: vmId(2), name: 'API-01', status: ON, cores: 8 }),
      makeVm({ id: vmId(3), name: 'db-01', status: ON, cores: 16 }),
      makeVm({ id: vmId(4), name: 'apagada', status: OFF, cores: 64 }),
    ];

    const rows = rankContributions(vms, 'cores');

    expect(rows.map((row) => (row.kind === 'vm' ? row.name : 'Otras'))).toEqual([
      'db-01',
      'API-01',
      'web-02',
    ]);
  });

  it('con 6 encendidas muestra todas, sin "Otras"', () => {
    const rows = rankContributions(activeVms(6), 'cores');

    expect(rows).toHaveLength(6);
    expect(rows.some((row) => row.kind === 'others')).toBe(false);
  });

  it('con 8 encendidas muestra 5 y "Otras (3)", y la suma de las filas es el total', () => {
    const vms = activeVms(8);

    const rows = rankContributions(vms, 'cores');

    expect(rows).toHaveLength(6);
    expect(rows[5]).toEqual({ kind: 'others', key: 'others', count: 3, value: 1 + 2 + 3 });
    const sum = rows.reduce((total, row) => total + row.value, 0);
    expect(sum).toBe(summarizeResources(vms).active.cores);
  });
});
