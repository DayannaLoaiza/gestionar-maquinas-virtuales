// @ts-check
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { baseConfig } from './base.mjs';

/**
 * Configuración para aplicaciones Nest.js (Node, CommonJS, decoradores).
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function nestConfig({ tsconfigRootDir }) {
  return tseslint.config(...baseConfig({ tsconfigRootDir }), {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      // Las clases de Nest (módulos, DTOs) suelen estar vacías o ser solo decoradores.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      // La inyección de dependencias requiere imports de valor para la metadata de decoradores.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  });
}
