import type { QuenetiqConfig } from '@quenetiq/core';

const config: QuenetiqConfig = {
	// ── Core ────────────────────────────────────────────────────────────────────
	endpoint: '/graphql',
	errorPolicy: 'none',
	retryCount: 3,
	retryDelay: 1000,
	dedup: true,
	batchWindow: 50,
	middleware: [],
	devAuth: {
		enabled: true,
		token: 'dev-token',
	},

	// ── Subscriptions ───────────────────────────────────────────────────────────
	subscriptions: {
		wsEndpoint: 'ws://localhost:4000/graphql',
		reconnect: true,
		reconnectInterval: 2000,
		lazy: true,
	},

	// ── Cache ───────────────────────────────────────────────────────────────────
	cache: {
		enabled: true,
		maxAge: 300_000,
		serialize: true,
		typePolicies: {},
	},

	// ── Persisted Queries ───────────────────────────────────────────────────────
	persistedQueries: {
		enabled: false,
		hash: 'simple',
		autoPersist: false,
	},

	// ── File Upload ─────────────────────────────────────────────────────────────
	upload: {
		maxFiles: 10,
		maxFileSize: 10_485_760,
	},

	// ── Debug ───────────────────────────────────────────────────────────────────
	debug: {
		logOperations: true,
		logTiming: true,
		logCache: false,
	},

	// ── Pagination ──────────────────────────────────────────────────────────────
	pagination: {
		defaultLimit: 20,
		debounceMs: 300,
	},

	// ── SSR ─────────────────────────────────────────────────────────────────────
	ssr: {
		transferState: true,
		cacheTtl: 60_000,
	},

	// ── Testing ─────────────────────────────────────────────────────────────────
	testing: {
		enabled: true,
	},

	// ── Telemetry / OpenTelemetry ───────────────────────────────────────────────
	telemetry: {
		enabled: true,
		tracing: {
			enabled: true,
			exporter: 'console',
			serviceName: 'quenetiq-app',
		},
		tags: {
			env: 'development',
		},
	},

	// ── DevTools (browser extension integration) ────────────────────────────────
	devtools: {
		autoConnect: true,
		maxRequests: 500,
		captureSchema: true,
		endpoint: '/graphql',
	},

	// ── Codegen (CLI-only, ignored at runtime) ──────────────────────────────────
	codegen: {
		schema: {
			endpoint: '/graphql',
			dir: './graphql',
			filename: 'schema.json',
			autoDownload: true,
			headers: {
				Authorization: 'Bearer ${AUTH_TOKEN}',
			},
		},
		types: {
			dir: './graphql/types',
			scalars: {
				DateTime: 'string',
				JSON: 'Record<string, unknown>',
				Upload: 'File',
				UUID: 'string',
				Long: 'number',
				BigInt: 'string',
			},
			enumsAsTypes: false,
			maybeValue: 'T | null | undefined',
			strictNullability: true,
			operationResultPrefix: '',
			operationResultSuffix: 'Result',
		},
	},
};

export default config;
