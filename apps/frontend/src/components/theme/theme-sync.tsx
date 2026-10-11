'use client';

import { useEffect } from 'react';

import { applyResolvedTheme } from '@/lib/theme/theme-store';

import { useTheme } from './use-theme';

/**
 * Mantiene la clase de `<html>` al día después de la carga: cuando la persona elige otro tema, otra
 * pestaña lo cambia o, con "system", cambia el sistema operativo. El tema del primer pintado lo pone
 * `THEME_INIT_SCRIPT`. Va una sola vez, en el layout raíz, y no pinta nada.
 */
export function ThemeSync(): null {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme !== null) applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  return null;
}
