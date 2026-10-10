import { nestConfig } from '@vm/eslint-config/nest';

export default [
  ...nestConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    // Lo que sube de carpeta va con el alias: así una dependencia hacia otro módulo o hacia
    // `shared/` se lee en el propio import (.claude/rules/nestjs-patterns.md → "Imports").
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['..', '../*'],
              message: 'Usá el alias @/… (./ solo para la misma carpeta o sus subcarpetas).',
            },
          ],
        },
      ],
    },
  },
];
