import { useSyncExternalStore } from 'react';

import { resolveTheme } from '@/lib/theme/theme-preference';
import {
  getSystemIsDark,
  getThemePreference,
  setThemePreference,
  subscribeSystemTheme,
  subscribeThemePreference,
} from '@/lib/theme/theme-store';

import type { ResolvedTheme, ThemePreference } from '@/lib/theme/theme-preference';

export interface ThemeState {
  /** `null` en el servidor y durante la hidratación: la preferencia solo existe en el navegador. */
  preference: ThemePreference | null;
  resolvedTheme: ResolvedTheme | null;
  setPreference: (preference: ThemePreference) => void;
}

const getServerSnapshot = (): null => null;

export function useTheme(): ThemeState {
  const preference = useSyncExternalStore<ThemePreference | null>(
    subscribeThemePreference,
    getThemePreference,
    getServerSnapshot,
  );
  const isSystemDark = useSyncExternalStore<boolean | null>(
    subscribeSystemTheme,
    getSystemIsDark,
    getServerSnapshot,
  );
  const resolvedTheme =
    preference === null || isSystemDark === null ? null : resolveTheme(preference, isSystemDark);
  return { preference, resolvedTheme, setPreference: setThemePreference };
}
