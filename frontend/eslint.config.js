import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Prevent mock/fixture data from being imported in production modules.
      // Only test files (*.test.ts/tsx) and files inside src/mocks/ itself
      // are allowed to import from src/mocks/.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/mocks/**', '../mocks/**', './mocks/**'],
              message:
                'Mock data must not be imported from production modules. ' +
                'Use the VITE_USE_MOCKS flag and a dynamic import inside the ' +
                'API utility instead.',
            },
          ],
        },
      ],
    },
  },
  // Relax the restriction inside test files and the mocks directory itself
  {
    files: ['**/*.test.{ts,tsx}', '**/mocks/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
])
