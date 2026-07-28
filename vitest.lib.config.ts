import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const projectsDir = resolve(__dirname, 'projects/quenetiq');

export default defineConfig({
  resolve: {
    alias: {
      '@quenetiq/core': resolve(projectsDir, 'core/src/public-api.ts'),
      '@quenetiq/fragments': resolve(projectsDir, 'fragments/src/public-api.ts'),
      '@quenetiq/middlewares': resolve(projectsDir, 'middlewares/src/public-api.ts'),
      '@quenetiq/opentelemetry': resolve(projectsDir, 'opentelemetry/src/public-api.ts'),
      '@quenetiq/persisted-queries': resolve(projectsDir, 'persisted-queries/src/public-api.ts'),
      '@quenetiq/codegen': resolve(projectsDir, 'codegen/src/public-api.ts'),
      '@quenetiq/client': resolve(projectsDir, 'client/src/public-api.ts'),
      '@quenetiq/cache': resolve(projectsDir, 'cache/src/public-api.ts'),
      '@quenetiq/cache/angular': resolve(projectsDir, 'cache/src/angular.ts'),
    },
  },
  test: {
    globals: true,
    include: [
      'projects/quenetiq/**/*.spec.ts',
      '!projects/quenetiq/react/**',
      '!projects/quenetiq/vue/**',
    ],
    coverage: {
      provider: 'v8',
      enabled: true,
      reportsDirectory: './coverage',
      reporter: ['text', 'text-summary', 'lcov', 'json'],
      include: [
        'projects/quenetiq/**/*.ts',
        '!projects/quenetiq/**/*.spec.ts',
        '!projects/quenetiq/**/*.d.ts',
        '!projects/quenetiq/**/node_modules/**',
      ],
      thresholds: {
        perFile: false,
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});
