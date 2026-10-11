'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

/**
 * Interruptor de shadcn/ui (`new-york-v4`) sobre `Switch` de Radix (`role="switch"` con
 * `aria-checked`), con los tokens del proyecto. 24 × 44 px, para que se pueda tocar. El riel apagado
 * tiene contraste de al menos 3:1 contra la tarjeta en los dos temas (WCAG 1.4.11). El foco es el
 * contorno global de `globals.css`. Necesita un nombre accesible (`aria-label` o `<Label>`).
 */
function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        'data-[state=checked]:bg-primary-500 data-[state=unchecked]:bg-surface-500 dark:data-[state=checked]:bg-primary-400 dark:data-[state=unchecked]:bg-navy-400',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
