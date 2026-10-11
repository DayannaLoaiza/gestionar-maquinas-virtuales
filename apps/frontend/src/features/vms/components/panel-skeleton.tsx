import { CardGridSkeleton } from '@/components/feedback/card-grid-skeleton';
import { ChartSkeleton } from '@/components/feedback/chart-skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { PANEL_TEXT } from '@/config/panel';

/** El contenido del Panel mientras carga: los skeletons del panel de recursos y de las tarjetas. */
export function PanelContentSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <ChartSkeleton label={PANEL_TEXT.loadingResources} />
      <CardGridSkeleton count={3} label={PANEL_TEXT.loadingVms} />
    </div>
  );
}

/** El Panel mientras el servidor pide el listado: encabezado sin acciones y skeletons (D3). */
export function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={PANEL_TEXT.title} description={PANEL_TEXT.description} />
      <PanelContentSkeleton />
    </div>
  );
}
