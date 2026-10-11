import { afterEach, describe, expect, it, vi } from 'vitest';

import { DARK_CLASS, DARK_SCHEME_QUERY, THEME_STORAGE_KEY } from './theme-preference';
import { THEME_INIT_SCRIPT } from './theme-script';

/** Valor guardado, o un `localStorage` que lanza al leer (bloqueado por el navegador). */
const STORAGE_THROWS = Symbol('localStorage bloqueado');

interface ScriptCase {
  name: string;
  stored: string | null | typeof STORAGE_THROWS;
  isSystemDark: boolean;
  expectedDark: boolean;
}

function emulateSystemScheme(isDark: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: isDark && query === DARK_SCHEME_QUERY,
  }));
}

function prepareStorage(stored: ScriptCase['stored']): void {
  if (stored === STORAGE_THROWS) {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Acceso denegado', 'SecurityError');
    });
    return;
  }
  if (stored !== null) localStorage.setItem(THEME_STORAGE_KEY, stored);
}

/** Ejecuta el script como lo hace el navegador al leer el `<head>`. */
function runInitScript(): void {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- se prueba el string exacto que se envía al navegador
  const initScript = new Function(THEME_INIT_SCRIPT) as () => void;
  initScript();
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.className = '';
});

describe('script inicial del tema (RF-app-shell-07)', () => {
  it.each<ScriptCase>([
    {
      name: 'oscuro guardado con el sistema en claro → oscuro',
      stored: 'dark',
      isSystemDark: false,
      expectedDark: true,
    },
    {
      name: 'claro guardado con el sistema en oscuro → claro',
      stored: 'light',
      isSystemDark: true,
      expectedDark: false,
    },
    {
      name: 'sin valor guardado y el sistema en oscuro → oscuro',
      stored: null,
      isSystemDark: true,
      expectedDark: true,
    },
    {
      name: 'valor inválido → sigue al sistema',
      stored: 'a b',
      isSystemDark: true,
      expectedDark: true,
    },
    {
      name: 'localStorage que lanza → sigue al sistema',
      stored: STORAGE_THROWS,
      isSystemDark: true,
      expectedDark: true,
    },
  ])('$name', ({ stored, isSystemDark, expectedDark }) => {
    prepareStorage(stored);
    emulateSystemScheme(isSystemDark);

    expect(runInitScript).not.toThrow();
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(expectedDark);
  });
});
