import tseslint from 'typescript-eslint'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'public/mockServiceWorker.js'] },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts'],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
    rules: {},
  },
]
