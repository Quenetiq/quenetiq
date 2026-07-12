import { InjectionToken, type AbstractType } from '@angular/core';
import type { Observable } from 'rxjs';
import type { GraphqlMiddleware } from './middleware';
import type { DevtoolsConfig } from './devtools';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Feature = Record<string, any>;

export interface RetryExchangeConfig {
	readonly maxRetries?: number;
	readonly initialDelay?: number;
	readonly maxDelay?: number;
	readonly exponent?: number;
	readonly jitter?: boolean;
	readonly shouldRetry?: (result: unknown, attempt: number) => boolean;
}

// ─── Core ───────────────────────────────────────────────────────────────────

export interface OnErrorServiceConfig {
	readonly provide: AbstractType<unknown> | InjectionToken<unknown>;
	readonly use: (service: unknown, error: string) => Observable<unknown>;
}

export interface GraphqlCoreConfig {
	readonly endpoint?: string;
	readonly url?: string;
	readonly headers?: Record<string, string | (() => string)>;
	readonly errorPolicy?: 'none' | 'all' | 'ignore';
	readonly showErrorsOnSuccess?: boolean;
	readonly retryCount?: number;
	readonly retryDelay?: number;
	readonly dedup?: boolean;
	readonly batchWindow?: number;
	readonly middleware?: GraphqlMiddleware[];
	readonly retryExchange?: RetryExchangeConfig;
	readonly devAuth?: {
		readonly token?: string;
		readonly enabled?: boolean;
	};
	readonly multiEndpoint?: boolean;
	readonly endpoints?: string;
	readonly onError?: ((error: string) => void) | OnErrorServiceConfig;
	readonly errorHandler?: { handle(error: unknown): boolean | Promise<boolean> };
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

export interface SubscriptionsConfig {
	readonly wsEndpoint?: string;
	readonly reconnect?: boolean;
	readonly reconnectInterval?: number;
	readonly lazy?: boolean;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

export interface SchemaConfig {
	readonly data?: Record<string, unknown>;
	readonly url?: string;
	readonly headers?: Record<string, string>;
}

// ─── Cache ──────────────────────────────────────────────────────────────────

export interface CacheConfig {
	readonly enabled?: boolean;
	readonly maxAge?: number;
	readonly serialize?: boolean;
	readonly typePolicies?: Record<
		string,
		{
			readonly keyFields?: string[];
			readonly merge?:
				| 'append'
				| 'prepend'
				| ((
						existing: unknown[] | undefined,
						incoming: unknown[],
						options?: { args?: Record<string, unknown> },
				  ) => unknown[]);
		}
	>;
	readonly schema?: SchemaConfig;
}

// ─── Persisted Queries ──────────────────────────────────────────────────────

export interface PersistedQueriesConfig {
	readonly enabled?: boolean;
	readonly hash?: 'sha256' | 'simple';
	readonly autoPersist?: boolean;
	readonly useGetForHashedQueries?: boolean;
}

// ─── File Upload ────────────────────────────────────────────────────────────

export interface UploadConfig {
	readonly maxFiles?: number;
	readonly maxFileSize?: number;
}

// ─── Debug ──────────────────────────────────────────────────────────────────

export interface DebugConfig {
	readonly logOperations?: boolean;
	readonly logTiming?: boolean;
	readonly logCache?: boolean;
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginationConfig {
	readonly defaultLimit?: number;
	readonly debounceMs?: number;
}

// ─── Testing ─────────────────────────────────────────────────────────────────

export interface TestingConfig {
	readonly enabled?: boolean;
}

// ─── SSR ────────────────────────────────────────────────────────────────────

export interface SsrConfig {
	readonly transferState?: boolean;
	readonly cacheTtl?: number;
}

// ─── Telemetry / OpenTelemetry ───────────────────────────────────────────────

export interface TelemetryConfig {
	readonly enabled?: boolean;
	readonly tracing?: {
		readonly enabled?: boolean;
		readonly exporter?: 'console' | 'otlp';
		readonly endpoint?: string;
		readonly serviceName?: string;
	};
	readonly tags?: Record<string, string>;
}

// ─── Codegen (CLI-only, ignored at runtime) ─────────────────────────────────

export interface CodegenConfig {
	readonly schema: {
		readonly endpoint: string;
		readonly dir?: string;
		readonly filename?: string;
		readonly autoDownload?: boolean;
		readonly autoDownloadSchema?: boolean;
		readonly headers?: Record<string, string>;
	};
	readonly types: {
		readonly dir: string;
		readonly scalars?: Record<string, string>;
		readonly enumsAsTypes?: boolean;
		readonly maybeValue?: string;
		readonly strictNullability?: boolean;
		readonly operationResultPrefix?: string;
		readonly operationResultSuffix?: string;
		readonly merge?: boolean;
	};
}

// ─── Plugins ────────────────────────────────────────────────────────────────

export interface DumbqlPlugin {
	readonly name: string;
	onInit?(client: unknown): void;
	getMiddleware?(): unknown;
}

// ─── Feature-level configs (stored in DumbqlConfig.features[]) ───────────────

export interface FeatureConfig {
	readonly name: string;
	readonly middleware?: GraphqlMiddleware[];
	readonly errorPolicy?: 'none' | 'all' | 'ignore';
	readonly retryCount?: number;
	readonly retryDelay?: number;
}

// ─── Unified Config ─────────────────────────────────────────────────────────

export interface DumbqlConfig extends GraphqlCoreConfig {
	readonly autoDownload?: boolean;
	readonly autoDownloadSchema?: boolean;
	readonly subscriptions?: SubscriptionsConfig;
	readonly cache?: CacheConfig;
	readonly persistedQueries?: PersistedQueriesConfig;
	readonly upload?: UploadConfig;
	readonly debug?: boolean | DebugConfig;
	readonly pagination?: PaginationConfig;
	readonly testing?: TestingConfig;
	readonly ssr?: SsrConfig;
	readonly codegen?: CodegenConfig;
	readonly devtools?: boolean | DevtoolsConfig;
	readonly telemetry?: TelemetryConfig;
	readonly plugins?: DumbqlPlugin[];
	readonly features?: FeatureConfig[];
}

/** @deprecated Use DumbqlConfig instead */
export type GraphqlConfig = DumbqlConfig;

// ─── Injection tokens ───────────────────────────────────────────────────────

export const DUMBQL_CONFIG = new InjectionToken<DumbqlConfig>('DUMBQL_CONFIG');

/** @deprecated Use DUMBQL_CONFIG instead */
export const GRAPHQL_CONFIG = DUMBQL_CONFIG;

// ─── Reactive config token ──────────────────────────────────────────────────

export interface ReactiveDumbqlConfig {
	readonly endpoint: import('@angular/core').Signal<string>;
	readonly errorPolicy: import('@angular/core').Signal<'none' | 'all' | 'ignore'>;
	readonly retryCount: import('@angular/core').Signal<number>;
	readonly retryDelay: import('@angular/core').Signal<number>;
	readonly dedup: import('@angular/core').Signal<boolean>;
	readonly batchWindow: import('@angular/core').Signal<number>;
	readonly middleware: import('@angular/core').Signal<GraphqlMiddleware[]>;
	readonly features: import('@angular/core').Signal<FeatureConfig[]>;
	readonly isDebugEnabled: import('@angular/core').Signal<boolean>;
	readonly isDevtoolsEnabled: import('@angular/core').Signal<boolean>;
	readonly raw: import('@angular/core').Signal<DumbqlConfig>;
	update(partial: Partial<DumbqlConfig>): void;
}

export const REACTIVE_DUMBQL_CONFIG = new InjectionToken<ReactiveDumbqlConfig>('REACTIVE_DUMBQL_CONFIG');

export const FEATURE_CONFIGS = new InjectionToken<FeatureConfig[]>('FEATURE_CONFIGS');

export { GRAPHQL_CACHE, type GraphqlCacheLike } from '@dumbql/cache';
