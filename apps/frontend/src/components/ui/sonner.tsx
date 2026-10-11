'use client';

import { Toaster as Sonner } from 'sonner';

import { AlertTriangle } from '@/components/svg/alert-triangle';
import { CircleCheck } from '@/components/svg/circle-check';
import { CircleX } from '@/components/svg/circle-x';
import { useTheme } from '@/components/theme/use-theme';

import { DEFAULT_TOAST_DURATION_MS } from './toast';

import type { CSSProperties } from 'react';
import type { ToasterProps } from 'sonner';

/** Cada tipo con su ícono y su color de estado: el color nunca va solo (RF-app-shell-09). */
const TOAST_ICONS = {
  success: <CircleCheck className="size-5 text-success-600 dark:text-success-500" />,
  error: <CircleX className="size-5 text-error-600 dark:text-error-500" />,
  warning: <AlertTriangle className="size-5 text-warning-600 dark:text-warning-500" />,
} satisfies NonNullable<ToasterProps['icons']>;

/** Variables de sonner con los tokens semánticos: la tarjeta cambia sola con el tema. */
const TOAST_TOKENS = {
  '--normal-bg': 'var(--card)',
  '--normal-text': 'var(--card-foreground)',
  '--normal-border': 'var(--border)',
  '--border-radius': '8px',
} as CSSProperties;

const TOAST_OPTIONS = {
  closeButtonAriaLabel: 'Cerrar notificación',
  classNames: { toast: 'font-sans', description: 'text-muted-foreground!' },
} satisfies NonNullable<ToasterProps['toastOptions']>;

/**
 * Contenedor de toasts de sonner. Se monta una sola vez, en el layout raíz, para que un toast
 * sobreviva a la navegación entre páginas. Los toasts se lanzan con `notify` (`./toast.ts`).
 */
function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme ?? 'light'}
      position="bottom-right"
      duration={DEFAULT_TOAST_DURATION_MS}
      closeButton
      icons={TOAST_ICONS}
      style={TOAST_TOKENS}
      toastOptions={TOAST_OPTIONS}
      containerAriaLabel="Notificaciones"
    />
  );
}

export { Toaster };
