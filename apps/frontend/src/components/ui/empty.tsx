import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

/**
 * Partes del estado vacío de shadcn/ui (`new-york-v4`) con los tokens del proyecto. Para un listado
 * sin registros, usar `EmptyState` (`components/feedback/`), que las compone con props tipadas.
 */
function Empty({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-6 text-center text-balance md:p-12',
        className,
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-md flex-col items-center gap-2 text-center', className)}
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "size-12 rounded-lg border border-border bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function EmptyMedia({
  className,
  variant,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

type EmptyTitleProps = ComponentProps<'h2'> & {
  /**
   * Nivel del título según dónde esté el estado vacío: `h1` si es toda la página (p. ej. la 404),
   * `h2` dentro de una página y `h3` dentro de una sección.
   */
  as?: 'h1' | 'h2' | 'h3';
};

function EmptyTitle({ className, as: Heading = 'h2', ...props }: EmptyTitleProps) {
  return (
    <Heading
      data-slot="empty-title"
      className={cn('text-xl font-semibold tracking-tight font-stretch-semi-expanded', className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        'text-sm/relaxed text-muted-foreground [&>a]:text-link [&>a]:underline [&>a]:underline-offset-4',
        className,
      )}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
        className,
      )}
      {...props}
    />
  );
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia };
