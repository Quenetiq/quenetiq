import { inject, type App, type InjectionKey, type Plugin } from 'vue';
import type { QuenetiqClient, ClientConfig, GraphqlMiddleware } from '@quenetiq/client';
import { createClient } from '@quenetiq/client';
import type { CacheStore, CacheStoreConfig, TypePolicy } from '@quenetiq/cache';
import { createCache } from '@quenetiq/cache';
import type {
	ClientDirectivesConfig,
	EndpointDiscoveryConfig,
	EndpointMockConfig,
	StreamingConfig,
} from '@quenetiq/client';
import { registerDirectives } from './directives';
import { QUENETIQ_CLIENT_KEY } from './plugin';

// ─── Feature-level configs (same as React) ────────────────────────────────

export interface DebugConfig {
	logOperations?: boolean;
	logTiming?: boolean;
	logCache?: boolean;
}

export interface PaginationConfig {
	defaultLimit?: number;
	debounceMs?: number;
}

export interface UploadConfig {
	maxFileSize?: number;
}

export interface SsrConfig {
	transferState?: boolean;
	cacheTtl?: number;
}

export interface TestingConfig {
	enabled?: boolean;
}

export interface TelemetryConfig {
	enabled?: boolean;
	tracing?: {
		enabled?: boolean;
		exporter?: 'console' | 'otlp';
		endpoint?: string;
		serviceName?: string;
	};
	tags?: Record<string, string>;
}

export interface DevtoolsConfig {
	autoConnect?: boolean;
	maxRequests?: number;
	captureSchema?: boolean;
	endpoint?: string;
	schemaDownload?: {
		endpoint?: string;
		headers?: Record<string, string>;
		format?: 'json' | 'sdl';
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Feature = Record<string, any>;

export interface FeatureConfig {
	name: string;
	middleware?: GraphqlMiddleware[];
	errorPolicy?: 'none' | 'all' | 'ignore';
	retryCount?: number;
	retryDelay?: number;
}

export interface QuenetiqPlugin {
	name: string;
	onInit?(client: unknown): void;
	getMiddleware?(): unknown;
}

// ─── Global Config ────────────────────────────────────────────────────────

export interface QuenetiqGlobalConfig {
	endpoint?: string;
	url?: string;
	headers?: Record<string, string | (() => string)>;
	errorPolicy?: 'none' | 'all' | 'ignore';
	showErrorsOnSuccess?: boolean;
	retryCount?: number;
	retryDelay?: number;
	dedup?: boolean;
	batchWindow?: number;
	middleware?: GraphqlMiddleware[];
	retryExchange?: {
		maxRetries?: number;
		initialDelay?: number;
		maxDelay?: number;
		exponent?: number;
		jitter?: boolean;
		shouldRetry?: (result: unknown, attempt: number) => boolean;
	};
	devAuth?: { token?: string; enabled?: boolean };
	onError?: (error: string) => void;
	errorHandler?: { handle(error: unknown): boolean | Promise<boolean> };
	cache?: {
		enabled?: boolean;
		typePolicies?: Record<string, TypePolicy>;
		persist?: { key?: string; storage?: 'memory' | 'localStorage' };
		maxAge?: number;
	};
	persistedQueries?: {
		enabled?: boolean;
		hash?: 'sha256' | 'simple';
		autoPersist?: boolean;
		useGetForHashedQueries?: boolean;
	};
	subscriptions?: {
		wsEndpoint?: string;
		reconnect?: boolean;
		reconnectInterval?: number;
		lazy?: boolean;
	};
	autoDownload?: boolean;
	autoDownloadSchema?: boolean;
	clientDirectives?: ClientDirectivesConfig;
	discovery?: EndpointDiscoveryConfig;
	mock?: EndpointMockConfig;
	streaming?: StreamingConfig;
	debug?: boolean | DebugConfig;
	pagination?: PaginationConfig;
	upload?: UploadConfig;
	ssr?: SsrConfig;
	testing?: TestingConfig;
	telemetry?: TelemetryConfig;
	devtools?: boolean | DevtoolsConfig;
	plugins?: QuenetiqPlugin[];
	features?: FeatureConfig[];
}

// ─── Context ──────────────────────────────────────────────────────────────

interface QuenetiqGlobalContextValue {
	client: QuenetiqClient;
	cache: CacheStore | null;
	config: QuenetiqGlobalConfig;
}

export const QUENETIQ_GLOBAL_CONFIG_KEY: InjectionKey<QuenetiqGlobalContextValue> =
	Symbol('quenetiq-global-config');

// ─── Config Mapping (pure, testable) ─────────────────────────────────────

export function mapGlobalConfigToClientConfig(config: QuenetiqGlobalConfig): ClientConfig {
	return {
		endpoint: config.endpoint ?? config.url,
		url: config.url,
		headers: config.headers,
		errorPolicy: config.errorPolicy,
		showErrorsOnSuccess: config.showErrorsOnSuccess,
		retryCount: config.retryCount,
		retryDelay: config.retryDelay,
		dedup: config.dedup,
		batchWindow: config.batchWindow,
		middleware: config.middleware,
		retryExchange: config.retryExchange,
		devAuth: config.devAuth,
		onError: config.onError,
		errorHandler: config.errorHandler,
		subscriptions: config.subscriptions,
		persistedQueries: config.persistedQueries,
		clientDirectives: config.clientDirectives,
		discovery: config.discovery,
		mock: config.mock,
		streaming: config.streaming,
		cache: config.cache
			? {
				enabled: config.cache.enabled,
				typePolicies: config.cache.typePolicies,
				maxAge: config.cache.maxAge,
			  }
			: undefined,
	};
}

export function mapGlobalConfigToCacheConfig(
	config: QuenetiqGlobalConfig,
): CacheStoreConfig | undefined {
	if (!config.cache) return undefined;
	return {
		typePolicies: config.cache.typePolicies,
		persist: config.cache.persist,
	};
}

// ─── Plugin ───────────────────────────────────────────────────────────────

export interface QuenetiqConfigPluginOptions {
	config: QuenetiqGlobalConfig;
}

/**
 * Vue plugin that creates a `QuenetiqClient` + `CacheStore` from a unified
 * config object — Vue's equivalent of Angular's `provideGraphql()`.
 *
 * @example
 * ```ts
 * app.use(createQuenetiqConfigPlugin({
 *   config: {
 *     endpoint: '/graphql',
 *     cache: { enabled: true, typePolicies: { User: { keyFields: ['id'] } } },
 *     clientDirectives: { enabled: true },
 *   },
 * }));
 * ```
 */
export function createQuenetiqConfigPlugin(options: QuenetiqConfigPluginOptions): Plugin {
	const { config } = options;

	return {
		install(app: App): void {
			const clientConfig = mapGlobalConfigToClientConfig(config);
			const cacheConfig = mapGlobalConfigToCacheConfig(config);

			const cache = config.cache?.enabled !== false ? createCache(cacheConfig) : null;
			const client = createClient(clientConfig, cache ?? undefined);

			app.provide(QUENETIQ_CLIENT_KEY, client);
			app.provide(QUENETIQ_GLOBAL_CONFIG_KEY, { client, cache, config });
			registerDirectives(app, client);
		},
	};
}

// ─── Composables ──────────────────────────────────────────────────────────

/**
 * Access the globally configured `QuenetiqClient`.
 * Must be used after `app.use(createQuenetiqConfigPlugin(...))`.
 */
export function useGlobalClient(): QuenetiqClient {
	const ctx = inject(QUENETIQ_GLOBAL_CONFIG_KEY, null);
	if (!ctx) {
		throw new Error('useGlobalClient must be used after installing QuenetiqConfigPlugin');
	}
	return ctx.client;
}

/**
 * Access the globally configured `CacheStore`.
 * Returns `null` if cache is disabled.
 */
export function useGlobalCache(): CacheStore | null {
	const ctx = inject(QUENETIQ_GLOBAL_CONFIG_KEY, null);
	if (!ctx) {
		throw new Error('useGlobalCache must be used after installing QuenetiqConfigPlugin');
	}
	return ctx.cache;
}

/**
 * Access the raw global config.
 */
export function useGlobalConfig(): QuenetiqGlobalConfig {
	const ctx = inject(QUENETIQ_GLOBAL_CONFIG_KEY, null);
	if (!ctx) {
		throw new Error('useGlobalConfig must be used after installing QuenetiqConfigPlugin');
	}
	return ctx.config;
}
