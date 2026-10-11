import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

/**
 * Campo de texto de shadcn/ui (`new-york-v4`) con los tokens del proyecto: línea de 1 px en vez de
 * sombra, alto de 40 px (grilla de 8 px) y el contorno de foco global de `globals.css`. Con
 * `aria-invalid` el borde pasa al rojo de estado; el mensaje va aparte, asociado con
 * `aria-describedby`.
 */
function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 text-base text-foreground transition-colors duration-200 selection:bg-primary-500 selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'aria-invalid:border-error-600 dark:aria-invalid:border-error-500',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
