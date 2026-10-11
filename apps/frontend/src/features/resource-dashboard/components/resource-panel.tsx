'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { ChartSkeleton } from '@/components/feedback/chart-skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ChartBar } from '@/components/svg/chart-bar';
import { PANEL_TEXT } from '@/config/panel';
import { summarizeResources } from '@/lib/resource-dashboard/resource-summary';

import { ResourceIndicators } from './resource-indicators';
import { RESOURCE_TEXT } from '../resource-labels';

import type { VisibleVm } from '@/lib/vms/pending-changes';

/**
 * Recharts se carga diferido y solo en el navegador: `ssr: false` funciona desde un Client
 * Component (`lazy-loading.md` de Next). Mientras carga, el skeleton de gráfico.
 */
const ResourceCharts = dynamic(
  () => import('./resource-charts').then((module) => module.ResourceCharts),
  { ssr: false, loading: () => <ChartSkeleton label={PANEL_TEXT.loadingResources} /> },
);

const HEADING_ID = 'resources-heading';

/**
 * El panel de recursos (spec `resource-dashboard`), encima del listado (DF1). Se calcula sobre el
 * mismo listado que se ve, así refleja al instante los cambios optimistas, sus reversiones y los
 * eventos de tiempo real (RF-resource-dashboard-06).
 */
export function ResourcePanel({ vms }: Readonly<{ vms: VisibleVm[] }>) {
  const summary = useMemo(() => summarizeResources(vms), [vms]);

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={HEADING_ID} className="text-xl font-semibold font-stretch-semi-expanded">
          {RESOURCE_TEXT.heading}
        </h2>
        {summary.totalCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {`En ${String(summary.activeCount)} de ${String(summary.totalCount)} máquinas virtuales encendidas.`}
          </p>
        )}
      </div>
      {summary.totalCount === 0 ? (
        <EmptyState
          icon={ChartBar}
          titleAs="h3"
          title={RESOURCE_TEXT.emptyTitle}
          description={RESOURCE_TEXT.emptyDescription}
        />
      ) : (
        <>
          <ResourceIndicators summary={summary} />
          <ResourceCharts summary={summary} vms={vms} />
        </>
      )}
    </section>
  );
}
