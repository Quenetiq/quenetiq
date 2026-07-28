import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

const projectsDir = resolve(__dirname, 'projects/quenetiq');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@quenetiq/client': resolve(projectsDir, 'client/src/public-api.ts'),
      '@quenetiq/cache': resolve(projectsDir, 'cache/src/public-api.ts'),
      '@quenetiq/core': resolve(projectsDir, 'core/src/public-api.ts'),
    },
  },
  test: {
    include: ['projects/quenetiq/*/src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.tsx'],
    environment: 'jsdom',
  },
});
