import { formatGb, formatInteger } from '@/lib/format';

import type { Resource } from '@/lib/resource-dashboard/resource-summary';

const coresUnit = (value: number): string => (value === 1 ? 'core' : 'cores');
const gbUnit = (): string => 'GB';

/** Nombre, unidad y formato de cada recurso del panel (RF-resource-dashboard-03, 08). */
export const RESOURCE_LABELS = {
  cores: {
    label: 'Cores',
    unit: coresUnit,
    format: (value: number) => `${formatInteger(value)} ${coresUnit(value)}`,
  },
  ram: { label: 'RAM', unit: gbUnit, format: formatGb },
  disk: { label: 'Disco', unit: gbUnit, format: formatGb },
} as const satisfies Record<
  Resource,
  { label: string; unit: (value: number) => string; format: (value: number) => string }
>;

/** Textos del panel de recursos. */
export const RESOURCE_TEXT = {
  heading: 'Recursos asignados',
  noneActive: 'Ninguna máquina virtual está encendida.',
  emptyTitle: 'Todavía no hay recursos para resumir',
  emptyDescription: 'El resumen de cores, RAM y disco aparece cuando haya máquinas virtuales.',
  shareTitle: 'Qué parte de lo asignado está encendida',
  shareDescription:
    'Porcentaje de cada recurso asignado a máquinas virtuales encendidas y apagadas.',
  active: 'Encendidas',
  inactive: 'Apagadas',
  contributionHeading: 'Aporte de cada máquina virtual encendida',
  contributionDescription:
    'De mayor a menor; con más de seis, las cinco primeras y el resto juntas.',
  contributionTitle: (label: string) => `${label} por máquina virtual encendida`,
  others: (count: number) => `Otras (${String(count)})`,
} as const;
