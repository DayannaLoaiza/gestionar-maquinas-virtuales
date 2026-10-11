'use client';

import { ContributionCharts } from './contribution-charts';
import { ShareChart } from './share-chart';

import type { ResourceSummary } from '@/lib/resource-dashboard/resource-summary';
import type { VirtualMachine } from '@vm/shared-types';

/**
 * Los gráficos del panel de recursos (DF3). Este módulo trae Recharts: `ResourcePanel` lo carga
 * diferido y solo en el navegador (RNF-resource-dashboard-02).
 */
export function ResourceCharts({
  summary,
  vms,
}: Readonly<{ summary: ResourceSummary; vms: readonly VirtualMachine[] }>) {
  return (
    <div className="flex flex-col gap-4">
      <ShareChart summary={summary} />
      <ContributionCharts vms={vms} />
    </div>
  );
}
