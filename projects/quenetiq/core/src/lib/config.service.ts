import { Injectable, inject } from '@angular/core';
import {
	QUENETIQ_CONFIG,
	REACTIVE_QUENETIQ_CONFIG,
	type QuenetiqConfig,
	type GraphqlMiddleware,
	type CacheConfig,
	type SubscriptionsConfig,
	type StreamingConfig,
	type PersistedQueriesConfig,
	type UploadConfig,
	type DebugConfig,
	type PaginationConfig,
	type SsrConfig,
} from './quenetiq-config';
import { validateEndpointsYaml, parseEndpointsYaml } from './endpoints-config';
import type { DevtoolsConfig as DevtoolsCfg } from './devtools';

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ConfigValidationError {
	readonly path: string;
	readonly message: string;
}

export function validateQuenetiqConfig(config: Partial<QuenetiqConfig>): ConfigValidationError[] {
	const errors: ConfigValidationError[] = [];

	if (config.endpoint !== undefined && typeof config.endpoint !== 'string') {
		errors.push({ path: 'endpoint', message: 'Must be a string' });
	}

	if (config.errorPolicy !== undefined && !['none', 'all', 'ignore'].includes(config.errorPolicy)) {
		errors.push({ path: 'errorPolicy', message: `Must be "none", "all", or "ignore", got "${config.errorPolicy}"` });
	}

	if (config.retryCount !== undefined && (typeof config.retryCount !== 'number' || config.retryCount < 0)) {
		errors.push({ path: 'retryCount', message: 'Must be a non-negative number' });
	}

	if (config.retryDelay !== undefined && (typeof config.retryDelay !== 'number' || config.retryDelay < 0)) {
		errors.push({ path: 'retryDelay', message: 'Must be a non-negative number' });
	}

	if (config.batchWindow !== undefined && (typeof config.batchWindow !== 'number' || config.batchWindow < 0)) {
		errors.push({ path: 'batchWindow', message: 'Must be a non-negative number' });
	}

	if (config.multiEndpoint && config.endpoints) {
		try {
			const yaml = parseEndpointsYaml(config.endpoints);
			const yamlErrors = validateEndpointsYaml(yaml);
			for (const err of yamlErrors) {
				errors.push({ path: 'endpoints', message: err });
			}
		} catch (e) {
			errors.push({ path: 'endpoints', message: `Invalid YAML: ${e instanceof Error ? e.message : String(e)}` });
		}
	}

	return errors;
}

// ─── Config Service (reactive) ──────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class QuenetiqConfigService {
	private readonly _raw = inject(QUENETIQ_CONFIG, { optional: true }) ?? { endpoint: '/graphql' };
	private readonly reactive = inject(REACTIVE_QUENETIQ_CONFIG, { optional: true });

	get all(): QuenetiqConfig {
		return this.reactive ? this.reactive.raw() : this._raw;
	}

	get endpoint(): string {
		return this.reactive ? this.reactive.endpoint() : (this._raw.endpoint ?? '/graphql');
	}

	get errorPolicy(): 'none' | 'all' | 'ignore' {
		return this.reactive ? this.reactive.errorPolicy() : (this._raw.errorPolicy ?? 'none');
	}

	get retryCount(): number {
		return this.reactive ? this.reactive.retryCount() : (this._raw.retryCount ?? 0);
	}

	get retryDelay(): number {
		return this.reactive ? this.reactive.retryDelay() : (this._raw.retryDelay ?? 1000);
	}

	get dedup(): boolean {
		return this.reactive ? this.reactive.dedup() : (this._raw.dedup ?? false);
	}

	get batchWindow(): number {
		return this.reactive ? this.reactive.batchWindow() : (this._raw.batchWindow ?? 0);
	}

	get middleware(): GraphqlMiddleware[] {
		return this.reactive ? this.reactive.middleware() : (this._raw.middleware ?? []);
	}

	get isDebugEnabled(): boolean {
		if (this.reactive) return this.reactive.isDebugEnabled();
		const debug = this._raw.debug;
		return debug === true || (typeof debug === 'object' && Object.values(debug).some(Boolean));
	}

	get isDevtoolsEnabled(): boolean {
		if (this.reactive) return this.reactive.isDevtoolsEnabled();
		const devtools = this._raw.devtools;
		return devtools === true || (typeof devtools === 'object' && devtools.autoConnect !== false);
	}

	/** Update config at runtime (only works with reactive config) */
	update(partial: Partial<QuenetiqConfig>): void {
		if (!this.reactive) {
			// eslint-disable-next-line no-console
			console.warn('Quenetiq: Runtime config updates require provideQuenetiq() with reactive config. Falling back to static config.');
			return;
		}
		this.reactive.update(partial);
	}

	get cache(): CacheConfig {
		return this._raw.cache ?? {};
	}

	get subscriptions(): SubscriptionsConfig {
		return this._raw.subscriptions ?? {};
	}

	get streaming(): StreamingConfig {
		return this._raw.streaming ?? {};
	}

	get persistedQueries(): PersistedQueriesConfig {
		return this._raw.persistedQueries ?? {};
	}

	get upload(): UploadConfig {
		return this._raw.upload ?? {};
	}

	get debug(): DebugConfig {
		if (typeof this._raw.debug === 'boolean') {
			return { logOperations: this._raw.debug, logTiming: this._raw.debug, logCache: this._raw.debug };
		}
		return this._raw.debug ?? {};
	}

	get pagination(): PaginationConfig {
		return this._raw.pagination ?? {};
	}

	get ssr(): SsrConfig {
		return this._raw.ssr ?? {};
	}

	get devtools(): DevtoolsCfg {
		return typeof this._raw.devtools === 'boolean' ? {} : (this._raw.devtools ?? {});
	}
}
