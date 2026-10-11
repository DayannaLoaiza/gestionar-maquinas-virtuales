/** Clave de `localStorage` con la preferencia de tema (RF-app-shell-06). */
export const THEME_STORAGE_KEY = 'vm-theme';

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** El tema que se pinta: la opción elegida, o la del sistema operativo si es "system". */
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

/** Primera visita, o un valor guardado que no es una de las opciones. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

/** Media query de la preferencia del sistema operativo. */
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/** Clase de `<html>` que activa los tokens oscuros y las variantes `dark:` (`globals.css`). */
export const DARK_CLASS = 'dark';

const VALID_PREFERENCES: ReadonlySet<unknown> = new Set(THEME_PREFERENCES);

/** `localStorage` es entrada externa (C8): solo valen las tres opciones. */
export function isThemePreference(value: unknown): value is ThemePreference {
  return VALID_PREFERENCES.has(value);
}

export function resolveTheme(preference: ThemePreference, isSystemDark: boolean): ResolvedTheme {
  if (preference !== 'system') return preference;
  return isSystemDark ? 'dark' : 'light';
}
