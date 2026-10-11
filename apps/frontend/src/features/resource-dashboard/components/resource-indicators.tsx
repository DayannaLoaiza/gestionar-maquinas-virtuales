import { Cpu } from '@/components/svg/cpu';
import { Database } from '@/components/svg/database';
import { Server2 } from '@/components/svg/server-2';
import { formatInteger } from '@/lib/format';
import { RESOURCES } from '@/lib/resource-dashboard/resource-summary';

import { RESOURCE_LABELS } from '../resource-labels';

import type { Resource, ResourceSummary } from '@/lib/resource-dashboard/resource-summary';
import type { ComponentType, SVGProps } from 'react';

const RESOURCE_ICONS: Record<Resource, ComponentType<SVGProps<SVGSVGElement>>> = {
  cores: Cpu,
  ram: Server2,
  disk: Database,
};

function Indicator({
  resource,
  summary,
}: Readonly<{ resource: Resource; summary: ResourceSummary }>) {
  const { label, unit } = RESOURCE_LABELS[resource];
  const Icon = RESOURCE_ICONS[resource];
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6 text-card-foreground">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </dt>
      <dd className="flex flex-col gap-1">
        <span className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold font-stretch-semi-expanded tabular-nums">
            {formatInteger(summary.active[resource])}
          </span>
          <span className="text-sm text-muted-foreground">{unit(summary.active[resource])}</span>
        </span>
        <span className="text-sm text-muted-foreground">
          de {formatInteger(summary.allocated[resource])} asignados
        </span>
      </dd>
    </div>
  );
}

/**
 * Los tres totales de las VMs encendidas, en texto (RF-resource-dashboard-03, 09): se ven sin
 * esperar a que cargue el gráfico.
 */
export function ResourceIndicators({ summary }: Readonly<{ summary: ResourceSummary }>) {
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {RESOURCES.map((resource) => (
        <Indicator key={resource} resource={resource} summary={summary} />
      ))}
    </dl>
  );
}
