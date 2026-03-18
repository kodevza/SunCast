import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'test-results', '.nyc_output']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='window'][callee.property.name='dispatchEvent']",
          message:
            'Do not use window.dispatchEvent for internal app communication. Use explicit stores/services instead.',
        },
        {
          selector: "NewExpression[callee.name='CustomEvent']",
          message:
            'Do not use CustomEvent for internal app communication. Use explicit stores/services instead.',
        },
        {
          selector:
            "CallExpression[callee.object.name='window'][callee.property.name='addEventListener'] > Literal:first-child[value=/^(app\\.|observability|global-error-toast-action)/]",
          message:
            'Do not use window.addEventListener for internal app communication. Use explicit stores/services instead.',
        },
      ],
    },
  },

  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      'import/no-restricted-paths': ['error', {
        basePath: process.cwd(),
        zones: [
          {
            target: './src/app/analysis',
            from: './src/app/features',
            message: 'analysis must not import features',
          },
          {
            target: './src/app/analysis',
            from: './src/app/hooks',
            message: 'analysis must not import features',
          },          
          {
            target: './src/geometry',
            from: './src/app/features',
            message: 'features must not import geometry directly',
          },
          {
            target: './src/rendering',
            from: './src/app/features',
            message: 'features must not import geometry directly',
          },
          {
            target: './src/shared',
            from: './src/app/features',
            message: 'features must not import geometry directly',
          },          
          {
            target: './src/state',
            from: './src/app/features',
            message: 'features must not import geometry directly',
          },  
          {
            target: './src/app/hooks',
            from: './src/app/presentation',
            message: 'features must not import geometry directly',
          },
        ],
      }],
    },
  },
  {
    files: ['src/app/presentation/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^(\\.\\./)+geometry(?:/|$)',
            allowImportNamePattern: '.*Result[s]?$',
            message: 'presentation must not import geometry directly (except symbols ending with Result or Results)',
          },
          {
            group: ['**/*.tsx'],
            importNames: ['SelectedRoofSunInput'],
            message: 'Do not import SelectedRoofSunInput from component modules. Import from src/types/presentation-contracts.ts.',
          },
        ],
      }],
    },
  },
])
