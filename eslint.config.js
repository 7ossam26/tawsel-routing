import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '.local/**',
      'output/playwright/phase-*-report/**',
      'output/playwright/phase-*-results/**',
      'data/**',
      'stitch-export/**'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['identity/**/*.js'],
    languageOptions: { globals: globals.browser }
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  }
);
