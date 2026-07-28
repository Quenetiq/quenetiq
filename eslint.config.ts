import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    plugins: {
      'unused-imports': unusedImports,
    },
    languageOptions: {
      parserOptions: {
         project: [
           './tsconfig.json',
           './tsconfig.app.json',
           './tsconfig.spec.json',
           './projects/quenetiq/core/tsconfig.lib.json',
           './projects/quenetiq/downloader/tsconfig.lib.json',
           './projects/quenetiq/subscriptions/tsconfig.lib.json',
           './projects/quenetiq/file-upload/tsconfig.lib.json',
           './projects/quenetiq/debugging/tsconfig.lib.json',
           './projects/quenetiq/cache/tsconfig.lib.json',
           './projects/quenetiq/fragments/tsconfig.lib.json',
           './projects/quenetiq/pagination/tsconfig.lib.json',
           './projects/quenetiq/ssr/tsconfig.lib.json',
           './projects/quenetiq/testing/tsconfig.lib.json',
           './projects/quenetiq/persisted-queries/tsconfig.lib.json',
            './projects/quenetiq/middlewares/tsconfig.lib.json',
             './projects/quenetiq/codegen/tsconfig.lib.json',
              './projects/quenetiq/dev-server/tsconfig.lib.json',
              './projects/quenetiq/apollo-adapter/tsconfig.lib.json',
              './projects/quenetiq/client/tsconfig.lib.json',
              './projects/quenetiq/errors/tsconfig.lib.json',
              './projects/quenetiq/opentelemetry/tsconfig.lib.json',
              './projects/quenetiq/react/tsconfig.lib.json',
              './projects/quenetiq/vue/tsconfig.lib.json',
              './tsconfig.spec.json',
           ],
      },
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/component-max-inline-declarations': [
        'warn',
        { template: 3, styles: 10 },
      ],

      'no-var': 'off',
      'prefer-arrow-callback': 0,
      'array-bracket-spacing': 1,
      indent: ['error', 'tab', { ignoredNodes: ['PropertyDefinition'] }],
      semi: 'error',
      'max-len': ['error', 120, { ignoreStrings: true, ignoreTemplateLiterals: true }],
      'no-trailing-spaces': 'error',
      'no-console': 'error',
      'no-alert': 'error',
      quotes: ['error', 'single'],
      'dot-notation': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'unused-imports/no-unused-vars': 'off',
      'no-console': 'off',
      'max-len': 'off',
    },
  },
  {
    files: ['**/console-exporter.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/cost-estimation.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['projects/quenetiq/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'qtq', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'qtq', style: 'kebab-case' },
      ],
    },
  },
  {
    files: [
      'projects/quenetiq/core/src/lib/null-overlay.ts',
      'projects/quenetiq/debugging/src/lib/devtools-panel/devtools-panel.component.ts',
      'src/app/shared/ui/docs-stackblitz-starter/docs-stackblitz-starter.component.ts',
    ],
    rules: {
      '@angular-eslint/component-max-inline-declarations': 'off',
    },
  },
  {
    files: ['projects/quenetiq/opentelemetry/src/tracer.ts'],
    rules: {
      '@typescript-eslint/no-this-alias': 'off',
    },
  },
  {
    files: ['projects/quenetiq/dev-server/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: [
      '**/jest.config.ts',
      '**/*-compat/**',
      '*.json',
      'tsconfig.*.json',
      'node_modules',
      'tslint.json',
      'src/test.ts',
      '*.js',
      '*.md',
      'src/assets/**/*.js',
      'dist',
      '.angular',
      'out-tsc',
    ],
  },
);
