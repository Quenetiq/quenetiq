import { signal, computed } from '@angular/core';
import {
	QUENETIQ_CONFIG,
	REACTIVE_QUENETIQ_CONFIG,
	FEATURE_CONFIGS,
	type QuenetiqConfig,
	type ReactiveQuenetiqConfig,
	type GraphqlMiddleware,
	type FeatureConfig,
} from './quenetiq-config';
import { validateQuenetiqConfig, type ConfigValidationError } from './config.service';
import type { DevtoolsConfig } from './devtools';
import type { Provider } from '@angular/core';

// ─── Feature-level provider ─────────────────────────────────────────────────

export function provideQuenetiqFeature(config: FeatureConfig): Provider[] {
	return [
		{
			provide: FEATURE_CONFIGS,
			useFactory: (existing: FeatureConfig[]) => [...(existing ?? []), config],
			deps: [[FEATURE_CONFIGS, { optional: true, skipSelf: true }]],
		},
	];
}

// ─── Fluent builder ─────────────────────────────────────────────────────────

class QuenetiqConfigBuilder {
	private config: QuenetiqConfig = {};

	endpoint(url: string): this {
		this.config = { ...this.config, endpoint: url };
		return this;
	}

	headers(headers: Record<string, string | (() => string)>): this {
		this.config = { ...this.config, headers: { ...this.config.headers, ...headers } };
		return this;
	}

	errorPolicy(policy: 'none' | 'all' | 'ignore'): this {
		this.config = { ...this.config, errorPolicy: policy };
		return this;
	}

	retry(count: number, delay = 1000): this {
		this.config = { ...this.config, retryCount: count, retryDelay: delay };
		return this;
	}

	dedup(enabled = true): this {
		this.config = { ...this.config, dedup: enabled };
		return this;
	}

	batch(windowMs: number): this {
		this.config = { ...this.config, batchWindow: windowMs };
		return this;
	}

	middleware(...mw: GraphqlMiddleware[]): this {
		this.config = { ...this.config, middleware: [...(this.config.middleware ?? []), ...mw] };
		return this;
	}

	showErrorsOnSuccess(enabled = true): this {
		this.config = { ...this.config, showErrorsOnSuccess: enabled };
		return this;
	}

	devAuth(token: string, enabled = true): this {
		this.config = { ...this.config, devAuth: { token, enabled } };
		return this;
	}

	// ─── Sub-configs ──────────────────────────────────────────────────────

	cache(config: QuenetiqConfig['cache']): this {
		this.config = { ...this.config, cache: { ...this.config.cache, ...config } };
		return this;
	}

	subscriptions(config: QuenetiqConfig['subscriptions']): this {
		this.config = { ...this.config, subscriptions: { ...this.config.subscriptions, ...config } };
		return this;
	}

	persistedQueries(config: QuenetiqConfig['persistedQueries']): this {
		this.config = { ...this.config, persistedQueries: { ...this.config.persistedQueries, ...config } };
		return this;
	}

	upload(config: QuenetiqConfig['upload']): this {
		this.config = { ...this.config, upload: { ...this.config.upload, ...config } };
		return this;
	}

	debug(config: boolean | QuenetiqConfig['debug']): this {
		this.config = { ...this.config, debug: config };
		return this;
	}

	pagination(config: QuenetiqConfig['pagination']): this {
		this.config = { ...this.config, pagination: { ...this.config.pagination, ...config } };
		return this;
	}

	ssr(config: QuenetiqConfig['ssr']): this {
		this.config = { ...this.config, ssr: { ...this.config.ssr, ...config } };
		return this;
	}

	devtools(config: boolean | DevtoolsConfig): this {
		this.config = { ...this.config, devtools: config };
		return this;
	}

	telemetry(config: QuenetiqConfig['telemetry']): this {
		this.config = { ...this.config, telemetry: { ...this.config.telemetry, ...config } };
		return this;
	}

	plugins(...plugins: NonNullable<QuenetiqConfig['plugins']>): this {
		this.config = { ...this.config, plugins: [...(this.config.plugins ?? []), ...plugins] };
		return this;
	}

	multiEndpoint(endpoints: string | QuenetiqConfig['multiEndpoint'] = true): this {
		if (typeof endpoints === 'string') {
			this.config = { ...this.config, multiEndpoint: true, endpoints };
		} else {
			this.config = { ...this.config, multiEndpoint: endpoints };
		}
		return this;
	}

	onError(handler: QuenetiqConfig['onError']): this {
		this.config = { ...this.config, onError: handler };
		return this;
	}

	errorHandler(handler: QuenetiqConfig['errorHandler']): this {
		this.config = { ...this.config, errorHandler: handler };
		return this;
	}

	// ─── Merge raw config ─────────────────────────────────────────────────

	merge(raw: Partial<QuenetiqConfig>): this {
		this.config = { ...this.config, ...raw };
		return this;
	}

	// ─── Validation ───────────────────────────────────────────────────────

	validate(): ConfigValidationError[] {
		return validateQuenetiqConfig(this.config);
	}

	validateOrThrow(): void {
		const errors = this.validate();
		if (errors.length > 0) {
			const msg = errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');
			throw new Error(`Quenetiq config validation failed:\n${msg}`);
		}
	}

	// ─── Build ────────────────────────────────────────────────────────────

	build(): QuenetiqConfig {
		this.validateOrThrow();
		return this.config;
	}

	buildProviders(): Provider[] {
		return provideQuenetiq(this.build());
	}
}

// ─── Main entry ─────────────────────────────────────────────────────────────

/**
 * Create a Quenetiq config with fluent API.
 *
 * @example
 * ```typescript
 * const config = quenetiqConfig()
 *   .endpoint('/graphql')
 *   .errorPolicy('all')
 *   .retry(3, 1000)
 *   .dedup()
 *   .cache({ enabled: true, maxAge: 60_000 })
 *   .middleware(loggingMiddleware)
 *   .build();
 *
 * // Or directly get providers:
 * providers: [
 *   ...quenetiqConfig()
 *     .endpoint('/graphql')
 *     .retry(3)
 *     .buildProviders(),
 * ]
 * ```
 */
export function quenetiqConfig(): QuenetiqConfigBuilder {
	return new QuenetiqConfigBuilder();
}

/**
 * Legacy provider function. Consider using `quenetiqConfig().buildProviders()` instead.
 */
export function provideQuenetiq(config: Partial<QuenetiqConfig>): Provider[] {
	const merged: QuenetiqConfig = {
		endpoint: '/graphql',
		errorPolicy: 'none',
		retryCount: 0,
		retryDelay: 1000,
		dedup: false,
		batchWindow: 0,
		devAuth: { enabled: true },
		...config,
	};

	const errors = validateQuenetiqConfig(merged);
	if (errors.length > 0) {
		const msg = errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');
		throw new Error(`Quenetiq config validation failed:\n${msg}`);
	}

	return buildProvidersWithReactive(merged);
}

function buildProvidersWithReactive(config: QuenetiqConfig): Provider[] {
	const endpointSig = signal(config.endpoint ?? '/graphql');
	const errorPolicySig = signal(config.errorPolicy ?? 'none');
	const retryCountSig = signal(config.retryCount ?? 0);
	const retryDelaySig = signal(config.retryDelay ?? 1000);
	const dedupSig = signal(config.dedup ?? false);
	const batchWindowSig = signal(config.batchWindow ?? 0);
	const middlewareSig = signal<GraphqlMiddleware[]>(config.middleware ?? []);
	const debugSig = signal(config.debug ?? false);
	const devtoolsSig = signal(config.devtools ?? false);
	const rawSig = signal(config);
	const featuresSig = signal<FeatureConfig[]>(config.features ?? []);

	const reactiveConfig: ReactiveQuenetiqConfig = {
		endpoint: endpointSig.asReadonly(),
		errorPolicy: errorPolicySig.asReadonly(),
		retryCount: retryCountSig.asReadonly(),
		retryDelay: retryDelaySig.asReadonly(),
		dedup: dedupSig.asReadonly(),
		batchWindow: batchWindowSig.asReadonly(),
		middleware: middlewareSig.asReadonly(),
		isDebugEnabled: computed(() => {
			const d = debugSig();
			return d === true || (typeof d === 'object' && Object.values(d).some(Boolean));
		}),
		isDevtoolsEnabled: computed(() => {
			const d = devtoolsSig();
			return d === true || (typeof d === 'object' && d.autoConnect !== false);
		}),
		features: featuresSig.asReadonly(),
		raw: rawSig.asReadonly(),
		update(partial: Partial<QuenetiqConfig>) {
			rawSig.update((prev) => ({ ...prev, ...partial }));
			if (partial.endpoint !== undefined) endpointSig.set(partial.endpoint);
			if (partial.errorPolicy !== undefined) errorPolicySig.set(partial.errorPolicy);
			if (partial.retryCount !== undefined) retryCountSig.set(partial.retryCount);
			if (partial.retryDelay !== undefined) retryDelaySig.set(partial.retryDelay);
			if (partial.dedup !== undefined) dedupSig.set(partial.dedup);
			if (partial.batchWindow !== undefined) batchWindowSig.set(partial.batchWindow);
			if (partial.middleware !== undefined) middlewareSig.set(partial.middleware);
			if (partial.debug !== undefined) debugSig.set(partial.debug);
			if (partial.devtools !== undefined) devtoolsSig.set(partial.devtools);
			if (partial.features !== undefined) featuresSig.set(partial.features);
		},
	};

	return [
		{ provide: QUENETIQ_CONFIG, useValue: config },
		{ provide: REACTIVE_QUENETIQ_CONFIG, useValue: reactiveConfig },
	];
}
