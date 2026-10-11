import { VM_STATUSES } from '@vm/shared-types';

import type { VirtualMachine } from '@vm/shared-types';

/** Los recursos que se suman: cores, RAM (GB) y disco (GB). */
export const RESOURCES = ['cores', 'ram', 'disk'] as const;
export type Resource = (typeof RESOURCES)[number];

export type ResourceTotals = Record<Resource, number>;

export interface ResourceSummary {
  /** Lo asignado a las VMs encendidas. */
  active: ResourceTotals;
  /** Lo asignado a todas las VMs, encendidas o no: la referencia del gráfico al 100 %. */
  allocated: ResourceTotals;
  activeCount: number;
  totalCount: number;
}

type VmResources = Pick<VirtualMachine, 'name' | 'status' | 'cores' | 'ram' | 'disk'>;

const EMPTY_TOTALS: ResourceTotals = { cores: 0, ram: 0, disk: 0 };

function addResources(totals: ResourceTotals, vm: VmResources): ResourceTotals {
  return { cores: totals.cores + vm.cores, ram: totals.ram + vm.ram, disk: totals.disk + vm.disk };
}

function isActive(vm: VmResources): boolean {
  return vm.status === VM_STATUSES.ON;
}

/**
 * Los totales del panel (RF-resource-dashboard-01) sobre las VMs que se ven en el listado: los de
 * las encendidas, los de todas y cuántas hay de cada una. Sin VMs o sin encendidas, ceros.
 */
export function summarizeResources(vms: readonly VmResources[]): ResourceSummary {
  const active = vms.filter(isActive);
  return {
    active: active.reduce(addResources, EMPTY_TOTALS),
    allocated: vms.reduce(addResources, EMPTY_TOTALS),
    activeCount: active.length,
    totalCount: vms.length,
  };
}

/** Una barra del gráfico de aporte: una VM, o "Otras" con la suma del resto. */
export type ContributionRow =
  | { kind: 'vm'; key: string; name: string; value: number }
  | { kind: 'others'; key: 'others'; count: number; value: number };

/** Con más VMs encendidas que esto, se muestran las primeras `SHOWN_WITH_OTHERS` y "Otras". */
const MAX_ROWS_WITHOUT_OTHERS = 6;
const SHOWN_WITH_OTHERS = 5;

function byValueThenName(resource: Resource) {
  return (a: VmResources, b: VmResources): number =>
    b[resource] - a[resource] || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}

/**
 * El aporte de cada VM encendida a un recurso (RF-resource-dashboard-02): de mayor a menor; a igual
 * valor, por nombre sin distinguir mayúsculas. Con más de 6, las 5 primeras y "Otras (n)". La suma de
 * las filas es siempre el total de las encendidas.
 */
export function rankContributions(
  vms: readonly (VmResources & { id: string })[],
  resource: Resource,
): ContributionRow[] {
  const ranked = vms.filter(isActive).toSorted(byValueThenName(resource));
  const toRow = (vm: VmResources & { id: string }): ContributionRow => ({
    kind: 'vm',
    key: vm.id,
    name: vm.name,
    value: vm[resource],
  });
  if (ranked.length <= MAX_ROWS_WITHOUT_OTHERS) return ranked.map(toRow);

  const rest = ranked.slice(SHOWN_WITH_OTHERS);
  const others: ContributionRow = {
    kind: 'others',
    key: 'others',
    count: rest.length,
    value: rest.reduce((sum, vm) => sum + vm[resource], 0),
  };
  return [...ranked.slice(0, SHOWN_WITH_OTHERS).map(toRow), others];
}
