'use client';

import { PageHeader } from '@/components/layout/page-header';
import { PANEL_TEXT } from '@/config/panel';
import { ResourcePanel } from '@/features/resource-dashboard/components/resource-panel';

import { PanelActions } from './panel-actions';
import { PanelContentSkeleton } from './panel-skeleton';
import { VmGrid } from './vm-grid';
import { VmsErrorState } from './vms-error-state';
import { useVisibleVms } from '../hooks/use-visible-vms';

import type { VmsQuery } from '../hooks/use-visible-vms';
import type { VisibleVm } from '@/lib/vms/pending-changes';

/**
 * Lo que va debajo del encabezado según el estado del listado (RF-virtual-machines-15). Si una
 * recarga falla con el listado ya en pantalla, el listado sigue: el error es solo para la carga.
 */
function PanelContent({ query, vms }: Readonly<{ query: VmsQuery; vms: VisibleVm[] }>) {
  if (query.data !== undefined) {
    return (
      <>
        <ResourcePanel vms={vms} />
        <VmGrid vms={vms} />
      </>
    );
  }
  if (!query.isError) return <PanelContentSkeleton />;
  return (
    <VmsErrorState
      onRetry={() => {
        void query.refetch();
      }}
      isRetrying={query.isFetching}
    />
  );
}

/**
 * El Panel (RF-app-shell-11): encabezado con sus acciones, el panel de recursos y, debajo, el
 * listado de VMs en tarjetas (DF1). Todo sale del mismo listado visible: versiones confirmadas más cambios
 * pendientes.
 */
export function VmDashboard() {
  const { query, vms } = useVisibleVms();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={PANEL_TEXT.title}
        description={PANEL_TEXT.description}
        actions={<PanelActions canCreate={query.data !== undefined} />}
      />
      <PanelContent query={query} vms={vms} />
    </div>
  );
}
