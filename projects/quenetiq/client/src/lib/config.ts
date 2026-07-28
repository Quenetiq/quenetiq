import type { GraphqlMiddleware } from './middleware';

// ─── Cache ──────────────────────────────────────────────────────────────────

export interface CacheConfig {
	enabled?: boolean;
	maxAge?: number;
	serialize?: boolean;
	/** Enable console logging of cache hits, misses, and evictions. */
	logCache?: boolean;
	typePolicies?: Record<string, {
		keyFields?: string[];
		keyFn?: (entity: { __typename: string; id?: string; [key: string]: unknown }) => string;
		merge?:
			| 'append'
			| 'prepend'
			| ((
					existing: unknown | undefined,
					incoming: unknown,
					options?: { args?: Record<string, unknown> },
			  ) => unknown);
	}>;
	schema?: SchemaConfig;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

export interface SchemaConfig {
	data?: Record<string, unknown>;
	url?: string;
	headers?: Record<string, string>;
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

export interface SubscriptionsConfig {
	wsEndpoint?: string;
	reconnect?: boolean;
	reconnectInterval?: number;
	lazy?: boolean;
}

// ─── Persisted Queries ──────────────────────────────────────────────────────

export interface PersistedQueriesConfig {
	enabled?: boolean;
	hash?: 'sha256' | 'simple';
	autoPersist?: boolean;
	/** Send hash-only requests via GET instead of POST to enable CDN caching.
	 *  Only applies when `hash` is set and the query body is empty (hash-only). */
	useGetForHashedQueries?: boolean;
}

// ─── Retry Exchange ─────────────────────────────────────────────────────────

export interface RetryExchangeConfig {
	maxRetries?: number;
	initialDelay?: number;
	maxDelay?: number;
	exponent?: number;
	jitter?: boolean;
	shouldRetry?: (result: unknown, attempt: number) => boolean;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export interface MiddlewareConfig {
	onError?: (error: string) => void;
}

// ─── Client Directives ─────────────────────────────────────────────────────

export interface ClientDirectivesConfig {
	/** Enable @client directive support. */
	enabled?: boolean;
	/** Local field resolvers: field name → value or resolver function. */
	fields?: Record<string, unknown | (() => unknown)>;
}

// ─── Endpoint Discovery ────────────────────────────────────────────────────

export interface EndpointDiscoveryConfig {
	/** Enable automatic endpoint discovery. */
	enabled?: boolean;
	/** List of named endpoints to probe. */
	endpoints?: Record<string, { url: string; headers?: Record<string, string> }>;
	/** Timeout in ms for each probe. */
	timeout?: number;
}

// ─── Endpoint Mock ─────────────────────────────────────────────────────────

export interface EndpointMockConfig {
	/** Enable automatic mock middleware. */
	enabled?: boolean;
	/** Custom mock resolvers per type. */
	mocks?: Record<string, (typeName: string, fieldName: string) => unknown>;
	/** Default delay (ms) to simulate network latency. */
	delay?: number;
	/** Passthrough URLs that should not be mocked. */
	passthrough?: string[];
}

// ─── Streaming / Defer ─────────────────────────────────────────────────────

export interface StreamingConfig {
	/** Enable @defer/@stream support. */
	enabled?: boolean;
	/** Custom delimiter for multipart chunk boundaries. */
	delimiter?: string;
	/** Timeout in ms before a pending chunk is considered abandoned. */
	chunkTimeout?: number;
}

// ─── Client Config ──────────────────────────────────────────────────────────

export interface ClientConfig {
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
	retryExchange?: RetryExchangeConfig;
	devAuth?: {
		token?: string;
		enabled?: boolean;
	};
	onError?: (error: string) => void;
	/**
	 * Custom error handler. Receives every error during query execution.
	 * Called before `onError` — useful for logging, metrics, or custom toast.
	 */
	errorHandler?: { handle(error: unknown): boolean | Promise<boolean> };
	subscriptions?: SubscriptionsConfig;
	cache?: CacheConfig;
	persistedQueries?: PersistedQueriesConfig;
	/** @client directive support configuration. */
	clientDirectives?: ClientDirectivesConfig;
	/** Endpoint discovery configuration. */
	discovery?: EndpointDiscoveryConfig;
	/** Automatic mock middleware configuration. */
	mock?: EndpointMockConfig;
	/** @defer/@stream streaming configuration. */
	streaming?: StreamingConfig;
}
