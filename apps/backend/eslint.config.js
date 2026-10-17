export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parserOptions: { project: false } },
    rules: { 'no-console': 'off' },
  },
];
