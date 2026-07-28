import { defineWorkspace } from 'vitest/config';
import { resolve } from 'path';

const projectsDir = resolve(__dirname, 'projects/quenetiq');

const alias = {
  '@quenetiq/client': resolve(projectsDir, 'client/src/public-api.ts'),
  '@quenetiq/cache': resolve(projectsDir, 'cache/src/public-api.ts'),
  '@quenetiq/core': resolve(projectsDir, 'core/src/public-api.ts'),
};

interface ProjectOpts {
  name: string;
  include: string[];
  env?: string;
  aliases?: Record<string, string>;
}

function project({ name, include, env = 'node', aliases }: ProjectOpts) {
  return {
    ...(aliases ? { resolve: { alias: { ...aliases } } } : {}),
    test: {
      name,
      include,
      environment: env as 'node',
      coverage: {
        enabled: true,
        provider: 'v8' as const,
        reportsDirectory: './coverage',
        reporter: ['text', 'text-summary', 'lcov'],
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
  };
}

export default defineWorkspace([
  project({ name: 'core', include: ['projects/quenetiq/core/src/**/*.spec.ts'], aliases }),
  project({ name: 'middlewares', include: ['projects/quenetiq/middlewares/src/**/*.spec.ts'] }),
  project({ name: 'opentelemetry', include: ['projects/quenetiq/opentelemetry/src/**/*.spec.ts'] }),
  project({ name: 'fragments', include: ['projects/quenetiq/fragments/src/**/*.spec.ts'] }),
  project({ name: 'persisted-queries', include: ['projects/quenetiq/persisted-queries/src/**/*.spec.ts'] }),
  project({ name: 'codegen', include: ['projects/quenetiq/codegen/src/**/*.spec.ts'] }),
  project({ name: 'client', include: ['projects/quenetiq/client/src/**/*.spec.ts'], aliases: { '@quenetiq/client': alias['@quenetiq/client'] } }),
  project({ name: 'errors', include: ['projects/quenetiq/errors/src/**/*.spec.ts', 'projects/quenetiq/vue/src/**/*.spec.ts'], aliases: { '@quenetiq/client': alias['@quenetiq/client'] } }),
  project({ name: 'cache', include: ['projects/quenetiq/cache/src/**/*.spec.ts'] }),
  project({ name: 'pagination', include: ['projects/quenetiq/pagination/src/**/*.spec.ts'] }),
  project({ name: 'downloader', include: ['projects/quenetiq/downloader/src/**/*.spec.ts'] }),
  project({ name: 'apollo-adapter', include: ['projects/quenetiq/apollo-adapter/src/**/*.spec.ts'] }),
  project({ name: 'dev-server', include: ['projects/quenetiq/dev-server/src/**/*.spec.ts'] }),
  project({ name: 'react', include: ['projects/quenetiq/react/src/**/*.spec.ts'], aliases: { '@quenetiq/client': alias['@quenetiq/client'] } }),
]);
