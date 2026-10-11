'use client';

import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

/** Etiqueta de shadcn/ui (`new-york-v4`): Radix Label, que enfoca su campo al hacer clic. */
function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium text-foreground select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
