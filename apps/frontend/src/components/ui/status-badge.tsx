import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

/**
 * Tonos de estado (`component-conventions.md`): texto 700/800 sobre el 50 en claro, y 500 sobre
 * un fondo translúcido en oscuro, para llegar a 4.5:1. `info` usa `primary`; `neutral`, los tokens
 * `muted`.
 */
const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      tone: {
        success:
          'border-success-200 bg-success-50 text-success-800 dark:border-success-500/40 dark:bg-success-500/15 dark:text-success-500',
        warning:
          'border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-500/40 dark:bg-warning-500/15 dark:text-warning-500',
        error:
          'border-error-200 bg-error-50 text-error-800 dark:border-error-500/40 dark:bg-error-500/15 dark:text-error-500',
        info: 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-400/40 dark:bg-primary-400/15 dark:text-primary-300',
        neutral: 'border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type StatusTone = NonNullable<VariantProps<typeof statusBadgeVariants>['tone']>;

type StatusBadgeProps = ComponentProps<'span'> & VariantProps<typeof statusBadgeVariants>;

/**
 * Insignia de estado única para toda la aplicación (`component-imports.md`). Lleva siempre el
 * nombre del estado como texto, y un ícono si lo hay: el color nunca va solo. Cada feature mapea sus
 * estados a tonos en un solo archivo.
 */
function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ tone, className }))}
      {...props}
    />
  );
}

export { StatusBadge, statusBadgeVariants };
