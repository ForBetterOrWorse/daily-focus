import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import jsxA11yX from 'eslint-plugin-jsx-a11y-x';
import testingLibraryPlugin from 'eslint-plugin-testing-library';
import vitestPlugin from '@vitest/eslint-plugin';
import checkFile from 'eslint-plugin-check-file';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'eslint.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{css,json}'],
    plugins: { 'check-file': checkFile },
    processor: 'check-file/eslint-processor-check-file',
    rules: {
      'check-file/filename-naming-convention': ['error', { '**/*.{css,json}': 'KEBAB_CASE' }, { ignoreMiddleExtensions: true }],
      'check-file/folder-naming-convention': ['error', { '**/*/': 'KEBAB_CASE' }],
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': ['error', { '**/*.{js,jsx,ts,tsx}': 'KEBAB_CASE' }, { ignoreMiddleExtensions: true }],
      'check-file/folder-naming-convention': ['error', { '**/*/': 'KEBAB_CASE' }],
    },
  },
  {
    files: ['src/**/*.{js,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      curly: ['error', 'all'],
    },
    settings: {
      react: {
        version: '19',
      },
    },
  },
  {
    files: ['src/**/*.{jsx,tsx}'],
    ...jsxA11yX.configs.recommended,
  },
  {
    files: ['src/**/*.{jsx,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^[a-z]/] > JSXAttribute[name.name='disabled']",
          message: 'Use aria-disabled="true" so the control stays focusable, and block activation in the handler.',
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    plugins: {
      'testing-library': testingLibraryPlugin,
      vitest: vitestPlugin,
    },
    rules: {
      ...testingLibraryPlugin.configs['flat/react'].rules,
      ...vitestPlugin.configs.recommended.rules,
      'vitest/consistent-test-it': [
        'error',
        {
          fn: 'it',
          withinDescribe: 'it',
        },
      ],
      'vitest/valid-title': [
        'error',
        {
          mustMatch: {
            it: ['^should\\b'],
            test: ['^should\\b'],
          },
        },
      ],
    },
  }
);
