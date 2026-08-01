import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const projectsDir = resolve(__dirname, 'projects/quenetiq');

export default defineConfig({
  resolve: {
    alias: {
      '@quenetiq/client': resolve(projectsDir, 'client/src/public-api.ts'),
      '@quenetiq/cache': resolve(projectsDir, 'cache/src/public-api.ts'),
      '@quenetiq/core': resolve(projectsDir, 'core/src/public-api.ts'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['projects/quenetiq/react/src/**/*.spec.tsx'],
  },
});
