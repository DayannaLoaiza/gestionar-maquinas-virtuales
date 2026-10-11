import { DeviceDesktop } from '@/components/svg/device-desktop';
import { Moon } from '@/components/svg/moon';
import { Sun } from '@/components/svg/sun';

import type { ThemePreference } from '@/lib/theme/theme-preference';
import type { ComponentType, SVGProps } from 'react';

export interface ThemeOption {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * Nombre e ícono de cada opción del selector (RF-app-shell-05). Es un `Record`: si se agrega una
 * preferencia en `THEME_PREFERENCES`, esto no compila hasta darle su texto.
 */
export const THEME_OPTIONS = {
  light: { label: 'Claro', icon: Sun },
  dark: { label: 'Oscuro', icon: Moon },
  system: { label: 'Sistema', icon: DeviceDesktop },
} as const satisfies Record<ThemePreference, ThemeOption>;
