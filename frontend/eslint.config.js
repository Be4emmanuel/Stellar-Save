import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import base from '../eslint.config.base.js';

export default tseslint.config(
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Use utils/logger for debug/info output; raw console.log is banned.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': ['error', { fixToUnknown: true }],
    },
  },
  // Static accessibility checks.
  //
  // Scoped to the web app rather than the shared `eslint.config.base.js`:
  // `mobile/` also spreads that base config and lints .tsx, but the jsx-a11y
  // rule set is DOM-oriented and its rules (alt-text, anchor-is-valid, ...)
  // do not hold for React Native primitives, which use accessibilityLabel.
  //
  // The recommended rules are registered as `warn` rather than `error` on
  // purpose: this rule set has never been enforced here, so turning it on at
  // `error` would fail the whole suite in one step. Warnings surface every
  // violation in `npm run lint` output without breaking the build; promote
  // them to `error` once the backlog is cleared.
  {
    files: ['**/*.tsx'],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...Object.fromEntries(
        Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([rule, severity]) => [
          rule,
          // Keep any configured severity options, downgrade the level to warn.
          Array.isArray(severity) ? ['warn', ...severity.slice(1)] : 'warn',
        ])
      ),
    },
  },
  {
    files: ['src/test/**', '**/*.test.{ts,tsx}', 'e2e/**'],
    rules: {
      'no-console': 'off',
    },
  }
);
