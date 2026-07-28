import type { SidebarGroup } from './docs-metadata.model';

export const SIDEBAR_GROUPS: SidebarGroup[] = [
	{
		label: 'Getting Started',
		order: 1,
		items: [
			{ title: 'Overview', slug: 'overview', group: 'Getting Started', order: 1, since: '0.0.1', tags: [], description: 'Introduction to Quenetiq' },
			{ title: 'Getting Started', slug: 'getting-started', group: 'Getting Started', order: 2, since: '0.0.1', tags: ['install', 'setup'], description: 'Quick start guide' },
		],
	},
	{
		label: 'Core',
		order: 2,
		items: [
			{ title: '@quenetiq/client', slug: 'client', group: 'Core', order: 1, since: '0.0.1', tags: ['client', 'graphql'], description: 'Framework-agnostic GraphQL client', package: '@quenetiq/client' },
			{ title: '@quenetiq/core', slug: 'core', group: 'Core', order: 2, since: '0.0.1', tags: ['angular', 'core'], description: 'Angular-native GraphQL integration', package: '@quenetiq/core' },
			{ title: '@quenetiq/cache', slug: 'cache', group: 'Core', order: 3, since: '0.0.1', tags: ['cache', 'normalized'], description: 'Normalized cache with type policies', package: '@quenetiq/cache',
				children: [
					{ title: 'Cache Helpers', slug: 'cache-helpers', group: 'Core', order: 1, since: '0.0.1', tags: ['cache', 'helpers', 'keys', 'meta', 'snapshot', 'optimistic'], description: 'Standalone cache helper functions' },
				],
			},
			{ title: '@quenetiq/observables', slug: 'observables', group: 'Core', order: 4, since: '1.0.6-beta', tags: ['observables', 'rxjs', 'cache'], description: 'RxJS operators for cache observation', package: '@quenetiq/observables' },
		],
	},
	{
		label: 'Frameworks',
		order: 3,
		items: [
			{ title: '@quenetiq/react', slug: 'react', group: 'Frameworks', order: 1, since: '0.0.1', tags: ['react', 'hooks'], description: 'React hooks and components', package: '@quenetiq/react' },
			{ title: '@quenetiq/vue', slug: 'vue', group: 'Frameworks', order: 2, since: '0.0.1', tags: ['vue', 'composables'], description: 'Vue composables and plugin', package: '@quenetiq/vue' },
		],
	},
	{
		label: 'Features',
		order: 4,
		items: [
			{ title: 'Subscriptions', slug: 'subscriptions', group: 'Features', order: 1, since: '0.0.1', tags: ['subscriptions', 'websocket'], description: 'WebSocket subscriptions', package: '@quenetiq/subscriptions' },
			{ title: 'Live Queries', slug: 'live-queries', group: 'Features', order: 2, since: '0.0.2-alpha.1', tags: ['live', 'realtime'], description: 'Real-time live queries' },
			{ title: 'File Upload', slug: 'file-upload', group: 'Features', order: 3, since: '0.0.1', tags: ['upload', 'multipart'], description: 'Multipart file upload', package: '@quenetiq/file-upload' },
			{ title: 'Pagination', slug: 'pagination', group: 'Features', order: 4, since: '0.0.1', tags: ['pagination', 'offset', 'cursor'], description: 'Offset and cursor pagination', package: '@quenetiq/pagination' },
			{ title: 'Fragments', slug: 'fragments', group: 'Features', order: 5, since: '0.0.1', tags: ['fragments', 'composable'], description: 'Fragment composition and data masking', package: '@quenetiq/fragments' },
			{ title: 'Persisted Queries', slug: 'persisted-queries', group: 'Features', order: 6, since: '0.0.1', tags: ['apq', 'persisted'], description: 'Automatic Persisted Queries', package: '@quenetiq/persisted-queries' },
			{ title: 'SSR', slug: 'ssr', group: 'Features', order: 7, since: '0.0.1', tags: ['ssr', 'server-side'], description: 'Server-Side Rendering helpers', package: '@quenetiq/ssr' },
			{ title: 'Epic Fetus', slug: 'epic-fetus', group: 'Features', order: 8, since: '1.0.5', tags: ['null-detection', 'overlay'], description: 'Null detection overlay' },
		],
	},
	{
		label: 'Middleware',
		order: 5,
		items: [
			{ title: 'Middleware Overview', slug: 'middlewares', group: 'Middleware', order: 1, since: '0.0.1', tags: ['middleware', 'pipeline'], description: 'Composable middleware pipeline', package: '@quenetiq/middlewares' },
			{ title: 'Error Handling', slug: 'errors', group: 'Middleware', order: 2, since: '0.0.3', tags: ['errors', 'handler'], description: 'Typed error classes and handler', package: '@quenetiq/errors' },
			{ title: 'OpenTelemetry', slug: 'opentelemetry', group: 'Middleware', order: 3, since: '1.0.5', tags: ['otel', 'tracing'], description: 'W3C Trace Context propagation', package: '@quenetiq/opentelemetry' },
		],
	},
	{
		label: 'Tools',
		order: 6,
		items: [
			{ title: 'Codegen', slug: 'codegen', group: 'Tools', order: 1, since: '0.0.1', tags: ['codegen', 'cli'], description: 'CLI code generation', package: '@quenetiq/codegen' },
			{ title: 'Dev Server', slug: 'dev-server', group: 'Tools', order: 2, since: '0.0.3', tags: ['dev-server', 'mock'], description: 'Unified development server', package: '@quenetiq/dev-server' },
			{ title: 'Downloader', slug: 'downloader', group: 'Tools', order: 3, since: '0.0.1', tags: ['schema', 'download'], description: 'Schema introspection download', package: '@quenetiq/downloader' },
			{ title: 'Testing', slug: 'testing', group: 'Tools', order: 4, since: '0.0.1', tags: ['testing', 'mock'], description: 'Mock GraphQL backend for tests', package: '@quenetiq/testing' },
			{ title: 'Debugging', slug: 'debugging', group: 'Tools', order: 5, since: '0.0.1', tags: ['debugging', 'devtools'], description: 'Debugging and inspection utilities', package: '@quenetiq/debugging' },
		],
	},
	{
		label: 'Reference',
		order: 7,
		items: [
			{ title: 'API Reference', slug: 'api', group: 'Reference', order: 1, since: '0.0.1', tags: ['api', 'reference'], description: 'Complete API reference' },
			{ title: 'Comparison', slug: 'comparison', group: 'Reference', order: 2, since: '0.0.1', tags: ['comparison', 'apollo', 'relay'], description: 'Comparison with other solutions' },
			{ title: 'Migration', slug: 'migration', group: 'Reference', order: 3, since: '0.0.2-alpha.1', tags: ['migration', 'apollo'], description: 'Migration from Apollo' },
			{ title: 'Apollo Adapter', slug: 'apollo-adapter', group: 'Reference', order: 4, since: '0.0.3', tags: ['apollo', 'adapter'], description: 'Apollo Client migration adapter', package: '@quenetiq/apollo-adapter' },
		],
	},
	{
		label: 'Environment',
		order: 8,
		items: [
			{ title: 'Sandboxes', slug: 'devcontainers', group: 'Environment', order: 1, since: '0.0.1', tags: ['codespaces', 'stackblitz'], description: 'Online development environments' },
		],
	},
];
