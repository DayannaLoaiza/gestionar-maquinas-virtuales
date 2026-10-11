import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { SkeletonRegion } from './skeleton-region';

export interface ChartSkeletonProps {
  label?: string | undefined;
  className?: string | undefined;
}

/** Alturas fijas de las barras: sugieren un gráfico sin cambiar en cada render. */
const BAR_HEIGHTS = ['h-2/5', 'h-3/5', 'h-1/3', 'h-4/5', 'h-1/2', 'h-full', 'h-2/3'] as const;

const LEGEND_ITEMS = ['cores', 'ram', 'disk'] as const;

/** Skeleton de un gráfico: título, área con barras y eje, y leyenda (RF-app-shell-08). */
export function ChartSkeleton({ label, className }: ChartSkeletonProps) {
  return (
    <SkeletonRegion
      label={label}
      className={cn('flex flex-col gap-6 rounded-lg border border-border bg-card p-6', className)}
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex h-48 items-end gap-3 border-b border-border">
        {BAR_HEIGHTS.map((height, position) => (
          <Skeleton key={position} className={cn('flex-1 rounded-b-none', height)} />
        ))}
      </div>
      <div className="flex flex-wrap gap-6">
        {LEGEND_ITEMS.map((item) => (
          <div key={item} className="flex items-center gap-2">
            <Skeleton className="size-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
