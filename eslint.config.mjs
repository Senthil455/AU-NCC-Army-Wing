import tseslint from 'typescript-eslint';

/**
 * Shared lint baseline for every TypeScript workspace.
 *
 * `apps/backend` and `packages/shared` import this file and append their own ignores, so the
 * rule set and parser live in exactly one place. `apps/frontend` intentionally keeps
 * `next lint` (eslint-config-next) because that integration is version-coupled to Next.js —
 * see ARCHITECTURE.md § Tooling.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
);
