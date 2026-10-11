import { Suspense } from 'react';

import { PANEL_TEXT } from '@/config/panel';
import { PanelSkeleton } from '@/features/vms/components/panel-skeleton';
import { VmDashboard } from '@/features/vms/components/vm-dashboard';
import { VmWorkspace } from '@/features/vms/components/vm-workspace';
import { VmsPrefetch } from '@/features/vms/components/vms-prefetch';
import { requireUser } from '@/lib/auth/session';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: PANEL_TEXT.title,
};

/**
 * Panel (RF-app-shell-11): el listado de VMs en tarjetas con sus acciones según el rol
 * (spec `virtual-machines`). El listado se precarga en el servidor dentro de un `Suspense`: mientras
 * tanto, el encabezado y los skeletons (D3 del plan).
 */
export default async function PanelPage() {
  await requireUser();
  return (
    <VmWorkspace>
      <Suspense fallback={<PanelSkeleton />}>
        <VmsPrefetch>
          <VmDashboard />
        </VmsPrefetch>
      </Suspense>
    </VmWorkspace>
  );
}
