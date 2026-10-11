import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

/**
 * `<select>` nativo con los tokens de `Input` (`component-conventions.md`, "Select nativo"): entra
 * en un formulario con `{...register('campo')}`, no carga JavaScript y en móvil abre el selector del
 * sistema, que sigue el tema por `color-scheme`. Para buscar o agrupar, un `Combobox`.
 */
function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 text-base text-foreground transition-colors duration-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'aria-invalid:border-error-600 dark:aria-invalid:border-error-500',
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
