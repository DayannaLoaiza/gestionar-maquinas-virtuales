'use client';

import { DeviceDesktop } from '@/components/svg/device-desktop';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { THEME_PREFERENCES, isThemePreference } from '@/lib/theme/theme-preference';

import { THEME_OPTIONS } from './theme-options';
import { useTheme } from './use-theme';

/**
 * Selector de tema de la cabecera (RF-app-shell-05, 06): Claro, Oscuro o Sistema. El botón muestra
 * el ícono de la opción elegida. Antes de hidratar, la preferencia no se conoce y el botón muestra
 * el ícono de Sistema, sin marcar ninguna opción.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const current = preference === null ? null : THEME_OPTIONS[preference];
  const TriggerIcon = current?.icon ?? DeviceDesktop;
  const triggerLabel =
    current === null ? 'Cambiar tema' : `Cambiar tema (actual: ${current.label})`;

  const selectPreference = (value: string): void => {
    if (isThemePreference(value)) setPreference(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={triggerLabel}>
          <TriggerIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preference ?? ''} onValueChange={selectPreference}>
          {THEME_PREFERENCES.map((option) => {
            const { label, icon: Icon } = THEME_OPTIONS[option];
            return (
              <DropdownMenuRadioItem key={option} value={option}>
                <Icon />
                {label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
