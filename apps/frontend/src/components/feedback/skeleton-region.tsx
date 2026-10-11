import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export const DEFAULT_LOADING_LABEL = 'Cargando…';

export interface SkeletonRegionProps {
  /** Lo que anuncian los lectores de pantalla, una sola vez por skeleton. */
  label?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * Envoltorio común de los skeletons (RF-app-shell-08): una región `status` con el texto solo para
 * lectores de pantalla. Los bloques de adentro son decorativos (`Skeleton` lleva `aria-hidden`).
 */
export function SkeletonRegion({
  label = DEFAULT_LOADING_LABEL,
  className,
  children,
}: SkeletonRegionProps) {
  return (
    <div role="status" className={cn('w-full', className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
