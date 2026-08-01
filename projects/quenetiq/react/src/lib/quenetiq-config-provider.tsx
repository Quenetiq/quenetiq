import { createContext, useContext, useMemo, type ReactNode } from 'react';
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

// ─── Feature-level configs ─────────────────────────────────────────────────

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
	/** GraphQL endpoint URL. */
	endpoint?: string;
	/** Alias for endpoint. */
	url?: string;
	/** Default headers sent with every request. */
	headers?: Record<string, string | (() => string)>;
	/** Error policy: 'none' | 'all' | 'ignore'. */
	errorPolicy?: 'none' | 'all' | 'ignore';
	/** Show errors even when data is present. */
	showErrorsOnSuccess?: boolean;
	/** Number of automatic retries on network error. */
	retryCount?: number;
	/** Delay between retries in ms. */
	retryDelay?: number;
	/** Enable request deduplication. */
	dedup?: boolean;
	/** Batch window in ms (0 = disabled). */
	batchWindow?: number;
	/** Middleware pipeline applied to every request. */
	middleware?: GraphqlMiddleware[];
	/** Retry exchange configuration. */
	retryExchange?: {
		maxRetries?: number;
		initialDelay?: number;
		maxDelay?: number;
		exponent?: number;
		jitter?: boolean;
		shouldRetry?: (result: unknown, attempt: number) => boolean;
	};
	/** Dev authentication token. */
	devAuth?: {
		token?: string;
		enabled?: boolean;
	};
	/** Global error callback. */
	onError?: (error: string) => void;
	/** Custom error handler. */
	errorHandler?: { handle(error: unknown): boolean | Promise<boolean> };
	/** Cache configuration. */
	cache?: {
		enabled?: boolean;
		typePolicies?: Record<string, TypePolicy>;
		persist?: { key?: string; storage?: 'memory' | 'localStorage' };
		maxAge?: number;
	};
	/** Persisted queries (APQ) configuration. */
	persistedQueries?: {
		enabled?: boolean;
		hash?: 'sha256' | 'simple';
		autoPersist?: boolean;
		useGetForHashedQueries?: boolean;
	};
	/** Subscriptions configuration. */
	subscriptions?: {
		wsEndpoint?: string;
		reconnect?: boolean;
		reconnectInterval?: number;
		lazy?: boolean;
	};
	/** Auto-download SDL schema. */
	autoDownload?: boolean;
	/** Auto-download SDL on init. */
	autoDownloadSchema?: boolean;

	// ── Feature configs ───────────────────────────────────────────────────

	/** @client directive support. */
	clientDirectives?: ClientDirectivesConfig;
	/** Endpoint discovery. */
	discovery?: EndpointDiscoveryConfig;
	/** Automatic mock middleware. */
	mock?: EndpointMockConfig;
	/** @defer/@stream streaming. */
	streaming?: StreamingConfig;
	/** Debug logging. */
	debug?: boolean | DebugConfig;
	/** Pagination defaults. */
	pagination?: PaginationConfig;
	/** File upload limits. */
	upload?: UploadConfig;
	/** SSR (transfer state, cache TTL). */
	ssr?: SsrConfig;
	/** Testing mode. */
	testing?: TestingConfig;
	/** OpenTelemetry / telemetry. */
	telemetry?: TelemetryConfig;
	/** Devtools panel configuration. */
	devtools?: boolean | DevtoolsConfig;
	/** Plugin array. */
	plugins?: QuenetiqPlugin[];
	/** Feature-level configs. */
	features?: FeatureConfig[];
}

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

// ─── Context ──────────────────────────────────────────────────────────────

interface QuenetiqGlobalContextValue {
	client: QuenetiqClient;
	cache: CacheStore | null;
	config: QuenetiqGlobalConfig;
}

const QuenetiqGlobalContext = createContext<QuenetiqGlobalContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────

export interface QuenetiqConfigProviderProps {
	config: QuenetiqGlobalConfig;
	children: ReactNode;
}

/**
 * Global configuration provider for React.
 *
 * Creates a `QuenetiqClient` + `CacheStore` from a single config object,
 * similar to Angular's `provideGraphql()`. No need to manually create
 * client/cache or pass them separately.
 *
 * @example
 * ```tsx
 * <QuenetiqConfigProvider config={{
 *   endpoint: '/graphql',
 *   cache: { enabled: true, typePolicies: { User: { keyFields: ['id'] } } },
 *   middleware: [authMiddleware(token)],
 *   clientDirectives: { enabled: true },
 *   debug: true,
 * }}>
 *   <App />
 * </QuenetiqConfigProvider>
 * ```
 */
export function QuenetiqConfigProvider({ config, children }: QuenetiqConfigProviderProps): ReactNode {
	const value = useMemo(() => {
		const clientConfig = mapGlobalConfigToClientConfig(config);
		const cacheConfig = mapGlobalConfigToCacheConfig(config);

		const cache = config.cache?.enabled !== false ? createCache(cacheConfig) : null;
		const client = createClient(clientConfig, cache ?? undefined);

		return { client, cache, config };
	}, [config]);

	return (
		<QuenetiqGlobalContext.Provider value={value}>
			{children}
		</QuenetiqGlobalContext.Provider>
	);
}

// ─── Hooks ────────────────────────────────────────────────────────────────

/**
 * Access the globally configured `QuenetiqClient`.
 * Must be used inside `<QuenetiqConfigProvider>`.
 */
export function useGlobalClient(): QuenetiqClient {
	const ctx = useContext(QuenetiqGlobalContext);
	if (!ctx) {
		throw new Error('useGlobalClient must be used inside <QuenetiqConfigProvider>');
	}
	return ctx.client;
}

/**
 * Access the globally configured `CacheStore`.
 * Returns `null` if cache is disabled.
 */
export function useGlobalCache(): CacheStore | null {
	const ctx = useContext(QuenetiqGlobalContext);
	if (!ctx) {
		throw new Error('useGlobalCache must be used inside <QuenetiqConfigProvider>');
	}
	return ctx.cache;
}

/**
 * Access the raw global config.
 */
export function useGlobalConfig(): QuenetiqGlobalConfig {
	const ctx = useContext(QuenetiqGlobalContext);
	if (!ctx) {
		throw new Error('useGlobalConfig must be used inside <QuenetiqConfigProvider>');
	}
	return ctx.config;
}
