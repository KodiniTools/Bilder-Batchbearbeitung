import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  // Base JS rules
  js.configs.recommended,

  // Browser globals (window, document, localStorage, fetch, etc.)
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Vue flat/recommended — includes vue-parser for .vue files
  ...pluginVue.configs['flat/recommended'],

  // Configure vue-eslint-parser to use tsParser for <script lang="ts"> blocks
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
  },

  // Vue rule overrides
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-v-html': 'warn',
      'vue/attributes-order': 'warn',
    },
  },

  // TypeScript rules for .ts files only (NOT .vue — vue-parser handles those)
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // Disable formatting rules that conflict with Prettier (must be last)
  prettierConfig,

  // Global ignores
  {
    ignores: [
      'dist/**',
      'release/**',
      'node_modules/**',
      'src/lib/bildseriebearbeiten/**',
    ],
  },
]
