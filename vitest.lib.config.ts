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
      'projects/quenetiq/cache/src/lib/__tests__/*.spec.ts',
      'projects/quenetiq/client/src/lib/__tests__/*.spec.ts',
      'projects/quenetiq/core/src/lib/*.spec.ts',
      'projects/quenetiq/core/src/lib/__tests__/*.spec.ts',
      'projects/quenetiq/fragments/src/lib/*.spec.ts',
      'projects/quenetiq/middlewares/src/lib/*.spec.ts',
      'projects/quenetiq/errors/src/lib/*.spec.ts',
      'projects/quenetiq/subscriptions/src/lib/*.spec.ts',
      'projects/quenetiq/observables/src/lib/__tests__/*.spec.ts',
      'projects/quenetiq/pagination/src/lib/*.spec.ts',
      'projects/quenetiq/persisted-queries/src/lib/*.spec.ts',
      'projects/quenetiq/ssr/src/lib/*.spec.ts',
      'projects/quenetiq/downloader/src/lib/*.spec.ts',
      'projects/quenetiq/debugging/src/lib/__tests__/*.spec.ts',
      'projects/quenetiq/opentelemetry/src/lib/*.spec.ts',
      'projects/quenetiq/codegen/src/lib/*.spec.ts',
      'projects/quenetiq/apollo-adapter/src/lib/__tests__/*.spec.ts',
      'projects/quenetiq/file-upload/src/lib/__tests__/*.spec.ts',
      'projects/quenetiq/dev-server/src/lib/__tests__/*.spec.ts',
      'projects/quenetiq/testing/src/lib/__tests__/*.spec.ts',
    ],
    coverage: {
      provider: 'istanbul',
      enabled: true,
      reporter: ['text', 'text-summary', 'lcov', 'json'],
      exclude: [
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/node_modules/**',
      ],
      thresholds: {
        perFile: false,
        statements: 70,
        branches: 65,
        functions: 65,
        lines: 70,
      },
    },
  },
});
