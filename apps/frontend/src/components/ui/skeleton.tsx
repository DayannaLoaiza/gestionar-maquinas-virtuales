import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

/**
 * Bloque de carga de shadcn/ui. Es decorativo (`aria-hidden`): el anuncio a los lectores de pantalla
 * lo hace `SkeletonRegion`. El pulso se detiene con movimiento reducido (regla global de
 * `globals.css`). No usa `muted`: sobre una tarjeta blanca casi no se ve, y en oscuro se confunde
 * con los encabezados (`muted` y `border` son `navy-800`). Por eso, en oscuro, un paso más claro.
 */
function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-border/70 dark:bg-navy-700/70', className)}
      {...props}
    />
  );
}

export { Skeleton };
