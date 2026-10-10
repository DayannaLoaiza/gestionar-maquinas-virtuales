// @ts-check
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { baseConfig } from './base.mjs';

/**
 * Configuración para aplicaciones Next.js (App Router, React 19).
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function nextConfig({ tsconfigRootDir }) {
  return tseslint.config(
    ...baseConfig({ tsconfigRootDir }),
    {
      files: ['**/*.{ts,tsx}'],
      ...reactPlugin.configs.flat['recommended'],
      ...reactPlugin.configs.flat['jsx-runtime'],
      settings: { react: { version: 'detect' } },
      languageOptions: {
        ...reactPlugin.configs.flat['recommended']?.languageOptions,
        globals: { ...globals.browser },
      },
    },
    reactHooks.configs.flat['recommended-latest'],
    {
      plugins: { '@next/next': nextPlugin },
      rules: {
        ...nextPlugin.configs.recommended.rules,
        ...nextPlugin.configs['core-web-vitals'].rules,
      },
    },
    {
      rules: {
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
      },
    },
  );
}
