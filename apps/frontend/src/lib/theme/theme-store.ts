import {
  DARK_CLASS,
  DARK_SCHEME_QUERY,
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  isThemePreference,
} from './theme-preference';

import type { ResolvedTheme, ThemePreference } from './theme-preference';

/**
 * Stores externos del tema para `useSyncExternalStore` (solo en el navegador). La preferencia vive
 * en `localStorage` y además en memoria: si el navegador no deja guardar, el tema elegido vale igual
 * durante la visita (caso límite de la spec).
 */

let currentPreference: ThemePreference | undefined;
const preferenceListeners = new Set<() => void>();

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function getThemePreference(): ThemePreference {
  currentPreference ??= readStoredPreference();
  return currentPreference;
}

/** Guarda la elección y avisa a esta pestaña; las demás se enteran por el evento `storage`. */
export function setThemePreference(preference: ThemePreference): void {
  currentPreference = preference;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Sin almacenamiento (bloqueado o lleno): la elección vale hasta recargar.
  }
  for (const listener of preferenceListeners) listener();
}

/** Escucha los cambios de esta pestaña y los de otras pestañas (RF-app-shell-06). */
export function subscribeThemePreference(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    // `key` es null cuando otra pestaña vacía todo el `localStorage`.
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    currentPreference = readStoredPreference();
    onChange();
  };
  preferenceListeners.add(onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    preferenceListeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function getSystemIsDark(): boolean {
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

/** Sigue la preferencia del sistema operativo mientras la página está abierta. */
export function subscribeSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

/** Desactiva las transiciones mientras cambia el tema: ningún elemento hace su propio fundido. */
const PAUSE_TRANSITIONS_CSS = '*,*::before,*::after{transition:none!important}';

/** Pone o quita la clase `dark` de `<html>`, que cambia de golpe toda la interfaz (RF-app-shell-06). */
export function applyResolvedTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  const isDark = theme === 'dark';
  if (root.classList.contains(DARK_CLASS) === isDark) return;

  const pause = document.createElement('style');
  pause.textContent = PAUSE_TRANSITIONS_CSS;
  document.head.appendChild(pause);
  root.classList.toggle(DARK_CLASS, isDark);
  // Fuerza el cálculo de estilos con el tema nuevo antes de devolver las transiciones.
  window.getComputedStyle(document.body).getPropertyValue('color');
  window.requestAnimationFrame(() => {
    pause.remove();
  });
}
