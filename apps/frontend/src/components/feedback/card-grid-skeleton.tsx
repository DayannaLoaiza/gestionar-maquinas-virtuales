import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { SkeletonRegion } from './skeleton-region';

export interface CardGridSkeletonProps {
  /** Cuántas tarjetas dibujar mientras carga. */
  count?: number;
  label?: string | undefined;
  className?: string | undefined;
}

/** Una tarjeta: nombre y estado, una línea de detalle y tres métricas (p. ej. cores, RAM, disco). */
function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
        {['cores', 'ram', 'disk'].map((metric) => (
          <div key={metric} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton de una grilla de tarjetas (RF-app-shell-08). */
export function CardGridSkeleton({ count = 6, label, className }: CardGridSkeletonProps) {
  return (
    <SkeletonRegion
      label={label}
      className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}
    >
      {Array.from({ length: count }, (_, position) => (
        <CardSkeleton key={position} />
      ))}
    </SkeletonRegion>
  );
}
