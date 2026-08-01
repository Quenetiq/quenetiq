import { inject, Injector } from '@angular/core';
import { of, tap, merge, Subject, takeUntil } from 'rxjs';
import type { GraphQLResult } from './graphql.service';
import type { GraphqlMiddleware } from './middleware';
import { QUENETIQ_CONFIG, GRAPHQL_CACHE, type QuenetiqConfig } from './quenetiq-config';

type CachedQueryResult = GraphQLResult<unknown> & { fromCache: true; cachedAt: number; entityKeys: string[] };

function toCachedResult(raw: GraphQLResult<unknown>, cachedAt: number, entityKeys: string[]): CachedQueryResult {
	return { ...raw, fromCache: true, cachedAt, entityKeys };
}

interface EntityRef {
	__typename: string;
	id: string;
	[key: string]: unknown;
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEntityRef(obj: Record<string, unknown>): obj is EntityRef {
	return typeof obj['__typename'] === 'string'
		&& (typeof obj['id'] === 'string' || typeof obj['id'] === 'number');
}

function extractEntities(data: unknown, entities: EntityRef[]): void {
	if (!isNonNullObject(data)) return;
	if (isEntityRef(data)) {
		entities.push(data);
	}
	for (const v of Object.values(data)) {
		if (isNonNullObject(v)) {
			extractEntities(v, entities);
		} else if (Array.isArray(v)) {
			for (const item of v) extractEntities(item, entities);
		}
	}
}

function extractTypeNames(data: unknown, types: Set<string>): void {
	if (!isNonNullObject(data)) return;
	if (typeof data['__typename'] === 'string') {
		types.add(data['__typename']);
	}
	for (const v of Object.values(data)) {
		if (isNonNullObject(v)) {
			extractTypeNames(v, types);
		} else if (Array.isArray(v)) {
			for (const item of v) extractTypeNames(item, types);
		}
	}
}

const initialized = new WeakSet<Injector>();

/** Module-level timestamp store shared across cache middleware instances. */
const globalFetchTimestamps = new Map<string, number>();

/**
 * Export a snapshot of all cached query data as a plain JSON object.
 * Useful for SSR, debugging, and persistence.
 */
export function cacheSnapshot(injector: Injector): Record<string, unknown> {
	const cache = injector.get(GRAPHQL_CACHE, null);
	if (!cache) return {};

	const snapshot: Record<string, unknown> = {};

	// Try the public serialize() API first (CacheStore)
	if ('serialize' in cache && typeof cache.serialize === 'function') {
		try {
			const data = JSON.parse((cache.serialize as () => string)());
			// serialize() returns { entities: [...], localState: [...] }
			if (data.entities) {
				for (const [key, value] of data.entities) {
					snapshot[key] = value;
				}
			}
			if (data.localState) {
				for (const [key, value] of data.localState) {
					snapshot[`__local__${key}`] = value;
				}
			}
		} catch {
			// best-effort
		}
		return snapshot;
	}

	// Fallback: use readLocal for local state keys (GraphqlCacheLike)
	if ('readLocal' in cache && typeof cache.readLocal === 'function') {
		// We can only read local state; entity data is not exposed via GraphqlCacheLike
		try {
			const localData = (cache as { _localState?: Map<string, unknown> })._localState;
			if (localData instanceof Map) {
				for (const [key, value] of localData) {
					snapshot[`__local__${key}`] = value;
				}
			}
		} catch {
			// best-effort
		}
	}

	return snapshot;
}

/**
 * Clear all cached queries that match a specific endpoint namespace.
 */
export function clearCacheByEndpoint(injector: Injector, endpoint: string): void {
	const cache = injector.get(GRAPHQL_CACHE, null);
	if (!cache) return;

	const prefix = `${endpoint}:`;
	for (const key of globalFetchTimestamps.keys()) {
		if (key.startsWith(prefix)) {
			globalFetchTimestamps.delete(key);
		}
	}
}

export function cacheMiddleware(injector?: Injector): GraphqlMiddleware {
	const fetchTimestamps = globalFetchTimestamps;
	const loggingInstances = new WeakSet<Injector>();

	return (request, next) => {
		const inj =
			injector ??
			(() => {
				try {
					return inject(Injector);
				} catch {
					return null;
				}
			})();
		if (!inj) return next(request);

		const cache = inj.get(GRAPHQL_CACHE, null);
		if (!cache) return next(request);

		const cfg = inj.get(QUENETIQ_CONFIG, null) as QuenetiqConfig | null;

		// Wire typePolicies once per Injector
		if (!initialized.has(inj) && cfg?.cache?.typePolicies) {
			initialized.add(inj);
			try {
				const policies = cfg.cache.typePolicies;
				cache.setTypePolicies(policies);
			} catch {
				// typePolicies are best-effort
			}
		}

		// Wire up cache event logging once per Injector
		if (!loggingInstances.has(inj) && cfg?.debug) {
			loggingInstances.add(inj);
			const debug = typeof cfg.debug === 'boolean'
				? { logCache: cfg.debug }
				: cfg.debug;
			if (debug.logCache) {
				cache.events?.setLogging({ enableLogging: true });
			}
		}

		const maxAge = cfg?.cache?.maxAge ?? 0;
		const staleTime = maxAge > 0 ? Math.floor(maxAge / 2) : 0;

		const storeResult = (result: GraphQLResult<unknown>, queryHash: string): void => {
			if (result.status === 'success' && result.data) {
				try {
					const entities: EntityRef[] = [];
					const typeNames = new Set<string>();
					extractEntities(result.data, entities);
					extractTypeNames(result.data, typeNames);
					for (const entity of entities) {
						cache.merge(entity);
					}
					// Record entity-key dependencies for watchQuery
					const entityKeys = new Set(entities.map((e) => `${e.__typename}:${e.id}`));
					cache.recordQueryDependencies?.(queryHash, entityKeys);
					cache.writeLocalWithTypes(queryHash, result, typeNames);
					fetchTimestamps.set(queryHash, Date.now());
				} catch {
					// cache write is best-effort
				}
			}
		};

		if (request.type === 'query') {
			const ns = request.endpoint ?? 'default';
			const queryHash = `${ns}:query:${request.query}|${JSON.stringify(request.variables)}`;
			let cachedRaw: GraphQLResult<unknown> | undefined;
			try {
				cachedRaw = cache.readLocal(queryHash) as GraphQLResult<unknown> | undefined;
			} catch {
				cachedRaw = undefined;
			}
			const lastFetch = fetchTimestamps.get(queryHash) ?? 0;
			const age = Date.now() - lastFetch;

			if (cachedRaw && maxAge > 0) {
				const entityKeys = cache.getEntitiesForQuery?.(queryHash) ?? [];
				if (age < staleTime) {
					return of(toCachedResult(cachedRaw, lastFetch, entityKeys));
				}
				if (age < maxAge) {
					const stop$ = new Subject<void>();
					return merge(
						of(toCachedResult(cachedRaw, lastFetch, entityKeys)),
						next(request).pipe(
							tap((result) => storeResult(result, queryHash)),
							takeUntil(stop$),
						),
					);
				}
			}

			return next(request).pipe(tap((result) => storeResult(result, queryHash)));
		}

		if (request.type === 'mutation') {
			return next(request).pipe(
				tap((result: GraphQLResult<unknown>) => {
					if (result.status === 'success' && result.data) {
						try {
							const entities: EntityRef[] = [];
							const typeNames = new Set<string>();
							extractEntities(result.data, entities);
							extractTypeNames(result.data, typeNames);
							for (const entity of entities) {
								cache.merge(entity);
							}
							if (typeNames.size > 0) {
								cache.clearLocalStateByTypes(Array.from(typeNames));
							}
							for (const entity of entities) {
								const entityKey = `${entity.__typename}:${entity.id}`;
								const affectedHashes = cache.getQueriesForEntity?.(entityKey) ?? [];
								for (const hash of affectedHashes) {
									cache.notifyQueryChanged?.(hash);
								}
							}
							// Refetch explicit query hashes from config
							const refetchMap = cfg?.cache?.refetchQueries;
							if (refetchMap) {
								const opName = request.query.match(/mutation\s+(\w+)/)?.[1];
								if (opName && refetchMap[opName]) {
									const entry = refetchMap[opName];
									const hashes = typeof entry === 'function'
										? entry(result.data)
										: entry;
									for (const hash of hashes) {
										if ('invalidateQuery' in cache && typeof cache.invalidateQuery === 'function') {
											cache.invalidateQuery(hash);
										}
									}
								}
							}
						} catch {
							// cache update after mutation is best-effort
						}
					}
				}),
			);
		}

		return next(request);
	};
}
