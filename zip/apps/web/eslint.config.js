import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    ...js.configs.recommended,
    rules: { 'no-unused-vars': 'off' },
  },
];
