import { NormalizedCache, type CacheEntity, type OptimisticUpdate, type TypePolicy, isCacheEntity } from './normalized-cache';
import { CacheGc } from './cache-gc';
import { CachePersistence, type CachePersistConfig } from './cache-persist';
import { CacheEvents } from './cache-events';
import { CacheMetrics } from './cache-metrics';
import { CrossTabSync } from './cross-tab-sync';
import { SmartPersistence } from './smart-persistence';

const LOCAL_STATE_PREFIX = '__local__';

function isNonNullObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface CacheStorePersist {
	persist(data: [string, Record<string, unknown>][]): Promise<void>;
	restore(): Promise<[string, Record<string, unknown>][] | null>;
	clear(): Promise<void>;
}

export interface CacheStoreConfig {
	persist?: CacheStorePersist | CachePersistConfig;
	typePolicies?: Record<string, TypePolicy>;
	autoGc?: {
		enabled?: boolean;
		threshold?: number;
	};
	crossTabSync?: boolean | import('./cross-tab-sync').CrossTabSyncConfig;
}

export class CacheStore {
	readonly cache: NormalizedCache;
	readonly gc: CacheGc;
	readonly events: CacheEvents;
	readonly metrics: CacheMetrics;
	private localState = new Map<string, unknown>();
	private localStateListeners = new Map<string, Set<() => void>>();
	private localStateTypes = new Map<string, Set<string>>();
	private persistSvc: CacheStorePersist | null = null;
	private autoGcEnabled = false;
	private autoGcThreshold = 200;
	private transactionDepth = 0;
	private transactionEvents: Omit<import('./cache-events').CacheEvent, 'timestamp' | 'seq'>[] = [];
	private crossTabSync: import('./cross-tab-sync').CrossTabSync | null = null;

	/** queryHash -> Set<entityKey> — which entities a query result depends on */
	private queryEntities = new Map<string, Set<string>>();
	/** entityKey -> Set<queryHash> — reverse index: which queries depend on an entity */
	private entityToQueries = new Map<string, Set<string>>();

	constructor(config?: CacheStoreConfig) {
		this.cache = new NormalizedCache(config?.typePolicies);
		this.gc = new CacheGc(this.cache);
		this.events = new CacheEvents();
		this.metrics = new CacheMetrics();
		this.autoGcEnabled = config?.autoGc?.enabled ?? false;
		this.autoGcThreshold = config?.autoGc?.threshold ?? 200;
		let persistSvc: CacheStorePersist | undefined;

		if (config?.persist) {
			persistSvc = 'persist' in config.persist
				? config.persist
				: new CachePersistence(config.persist);
		} else if (config?.typePolicies) {
			const typeTtl: Record<string, number> = {};
			for (const [typeName, policy] of Object.entries(config.typePolicies)) {
				if (policy.ttl) {
					typeTtl[typeName] = policy.ttl;
				}
			}
			if (Object.keys(typeTtl).length > 0) {
				persistSvc = new SmartPersistence({ ttl: typeTtl });
			}
		}

		if (persistSvc) {
			this.persistSvc = persistSvc;
			persistSvc.restore().then((restored) => {
				if (restored) {
					for (const [key, value] of restored) {
						if (key.startsWith(LOCAL_STATE_PREFIX)) {
							this.writeLocal(key.slice(LOCAL_STATE_PREFIX.length), value);
						} else if (isCacheEntity(value)) {
							this.cache.set(value);
						}
					}
				}
			}).catch((e) => {
				this.metrics.recordError();
				this.emitEvent({ type: 'error', data: { operation: 'restore', error: e } });
			});
		}

		if (config?.crossTabSync) {
			const syncConfig = typeof config.crossTabSync === 'boolean' ? undefined : config.crossTabSync;
			this.crossTabSync = new CrossTabSync(this.events, this, syncConfig);
		}
	}

	/**
	 * Execute a batch of cache operations as a single transaction.
	 * Events are buffered and emitted all at once when the transaction completes.
	 */
	transaction(fn: () => void): void {
		this.transactionDepth++;
		try {
			fn();
		} finally {
			this.transactionDepth--;
			if (this.transactionDepth === 0) {
				for (const event of this.transactionEvents) {
					this.emitEvent(event);
				}
				this.transactionEvents = [];
			}
		}
	}

	private emitEvent(event: Omit<import('./cache-events').CacheEvent, 'timestamp' | 'seq'>): void {
		if (this.transactionDepth > 0) {
			this.transactionEvents.push(event);
		} else {
			this.events.emit(event);
		}
	}

	query(typename: string, id: string): CacheEntity | undefined {
		const start = performance.now();
		const entity = this.cache.get(typename, id);
		this.metrics.recordReadTime(performance.now() - start);
		this.metrics.recordRead(entity !== undefined);
		this.emitEvent({ type: 'read', data: { typename, id, hit: entity !== undefined } });
		return entity;
	}

	write(entity: CacheEntity, source = ''): void {
		this.cache.set(entity, source);
		this.metrics.recordWrite();
		this.emitEvent({ type: 'write', data: { entity, key: `${entity.__typename}:${entity.id ?? ''}` } });
		this.invalidateEntity(entity.__typename, entity.id ?? '');
	}

	merge(entity: Partial<CacheEntity> & { __typename: string; id: string }, source = ''): void {
		const start = performance.now();
		const key = `${entity.__typename}:${entity.id}`;
		const existed = this.cache.get(entity.__typename, entity.id) !== undefined;
		const { changedFields, previousValues } = this.cache.merge(entity, source);
		this.metrics.recordMergeTime(performance.now() - start);
		this.metrics.recordMerge();
		this.emitEvent({ type: 'merge', data: { entity, key, existed, changedFields, previousValues } });
		this.invalidateEntity(entity.__typename, entity.id);
		this.maybeAutoGc();
	}

	evict(typename: string, id: string): void {
		const entity = this.cache.get(typename, id);
		this.cache.remove(typename, id);
		this.metrics.recordEviction();
		this.emitEvent({ type: 'evict', data: { typename, id, entity } });
		this.invalidateEntity(typename, id);
	}

	applyOptimistic(update: OptimisticUpdate): void {
		this.cache.applyOptimistic(update);
		this.emitEvent({ type: 'optimistic', data: { action: 'apply', id: update.id } });
	}

	rollbackOptimistic(id: string): void {
		this.cache.rollbackOptimistic(id);
		this.emitEvent({ type: 'optimistic', data: { action: 'rollback', id } });
	}

	commitOptimistic(id: string): void {
		this.cache.commitOptimistic(id);
		this.emitEvent({ type: 'optimistic', data: { action: 'commit', id } });
	}

	/** Read a full query result by its cache key. */
	readQuery<T = unknown>(queryHash: string): T | undefined {
		return this.localState.get(queryHash) as T | undefined;
	}

	/** Write a full query result into the local state. */
	writeQuery<T>(queryHash: string, data: T): void {
		this.writeLocal(queryHash, data);
	}

	/** Read specific fields from a cached entity. */
	readFragment<T extends Record<string, unknown>>(
		typename: string,
		id: string,
		fields: readonly string[],
	): Pick<T, keyof T> | undefined {
		const entity = this.cache.get(typename, id);
		if (!entity) return undefined;
		const result: Record<string, unknown> = {};
		for (const field of fields) {
			if (field in entity) {
				result[field] = entity[field];
			}
		}
		return result as Pick<T, keyof T>;
	}

	/** Merge specific fields into a cached entity. */
	writeFragment(
		typename: string,
		id: string,
		fields: Record<string, unknown>,
	): void {
		this.merge({ __typename: typename, id, ...fields });
	}

	readLocal<T = unknown>(key: string): T | undefined {
		return this.localState.get(key) as T | undefined;
	}

	hasLocal(key: string): boolean {
		return this.localState.has(key);
	}

	localKeys(): string[] {
		return Array.from(this.localState.keys());
	}

	localEntries(): [string, unknown][] {
		return Array.from(this.localState.entries());
	}

	localSize(): number {
		return this.localState.size;
	}

	watchLocal(key: string, listener: () => void): () => void {
		const existing = this.localStateListeners.get(key);
		if (existing) {
			existing.add(listener);
		} else {
			this.localStateListeners.set(key, new Set([listener]));
		}
		return () => {
			this.localStateListeners.get(key)?.delete(listener);
		};
	}

	writeLocal<T>(key: string, value: T): void {
		this.localState.set(key, value);
		const listeners = this.localStateListeners.get(key);
		if (listeners) {
			for (const listener of listeners) {
				listener();
			}
		}
	}

	clearLocalState(): void {
		this.localState.clear();
		this.localStateListeners.clear();
		this.localStateTypes.clear();
	}

	/** Clear all entities and local state from the cache. */
	async clear(): Promise<void> {
		const count = this.cache.count();
		this.cache.clear();
		this.localState.clear();
		this.localStateListeners.clear();
		this.localStateTypes.clear();
		this.emitEvent({ type: 'clear', data: { entityCount: count } });
		await this.persistSvc?.clear();
	}

	writeLocalWithTypes<T>(key: string, value: T, types: Set<string>): void {
		this.localStateTypes.set(key, types);
		this.writeLocal(key, value);
	}

	clearLocalStateByTypes(types: string[]): void {
		if (types.length === 0) return;
		const typeSet = new Set(types);
		const toDelete: string[] = [];
		for (const [key, tracked] of this.localStateTypes) {
			for (const t of tracked) {
				if (typeSet.has(t)) {
					toDelete.push(key);
					break;
				}
			}
		}
		for (const key of toDelete) {
			this.localState.delete(key);
			this.localStateTypes.delete(key);
			const listeners = this.localStateListeners.get(key);
			if (listeners) {
				for (const listener of listeners) {
					listener();
				}
			}
		}
	}

	/** Record which entity keys a query result depends on. */
	recordQueryDependencies(queryHash: string, entityKeys: Set<string>): void {
		// Remove old reverse references
		const oldEntities = this.queryEntities.get(queryHash);
		if (oldEntities) {
			for (const ek of oldEntities) {
				this.entityToQueries.get(ek)?.delete(queryHash);
			}
		}
		// Store new dependencies
		this.queryEntities.set(queryHash, entityKeys);
		for (const ek of entityKeys) {
			let set = this.entityToQueries.get(ek);
			if (!set) {
				set = new Set();
				this.entityToQueries.set(ek, set);
			}
			set.add(queryHash);
		}
	}

	/** Notify watchers that a query's cached result may have changed. */
	notifyQueryChanged(queryHash: string): void {
		const value = this.localState.get(queryHash);
		if (value === undefined) return;
		const listeners = this.localStateListeners.get(queryHash);
		if (listeners) {
			for (const listener of listeners) {
				listener();
			}
		}
	}

	/** Get all query hashes that depend on a given entity key. */
	getQueriesForEntity(entityKey: string): string[] {
		return Array.from(this.entityToQueries.get(entityKey) ?? []);
	}

	/** Get all entity keys that a query depends on. */
	getEntitiesForQuery(queryHash: string): string[] {
		return Array.from(this.queryEntities.get(queryHash) ?? []);
	}

	/**
	 * Selectively invalidate cached query results that depend on a specific entity.
	 * Only clears queries whose dependency graph includes this entity key,
	 * unlike clearLocalStateByTypes which clears ALL queries for a type.
	 */
	invalidateEntity(typename: string, id: string): void {
		const entityKey = `${typename}:${id}`;
		const queryHashes = this.entityToQueries.get(entityKey);
		if (!queryHashes) return;
		for (const hash of queryHashes) {
			this.localState.delete(hash);
			this.queryEntities.delete(hash);
			this.notifyQueryChanged(hash);
		}
		this.entityToQueries.delete(entityKey);
	}

	/** Invalidate a specific query hash from local state. */
	invalidateQuery(queryHash: string): void {
		this.localState.delete(queryHash);
		this.queryEntities.delete(queryHash);
		this.notifyQueryChanged(queryHash);
	}

	/**
	 * Prime the cache with query data before the query runs.
	 * Extracts entities from the result, merges them into the normalized cache,
	 * and stores the full result in local state so the query returns it immediately.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- source reserved for observability hooks
	prime(queryHash: string, data: unknown, _source = ''): void {
		const { entityKeys, typeNames } = this.normalizeResult(data);
		this.writeLocalWithTypes(queryHash, data, typeNames);
		this.recordQueryDependencies(queryHash, entityKeys);
	}

	getEntityMeta(key: string): import('./normalized-cache').EntityMeta | undefined {
		return this.cache.getMeta(key);
	}

	getAllEntityMeta(): Map<string, import('./normalized-cache').EntityMeta> {
		return this.cache.allMeta();
	}

	resolveField(typename: string, id: string, field: string, args?: Record<string, unknown>): unknown {
		return this.cache.resolveField(typename, id, field, args);
	}

	isEntityStale(typename: string, id: string, maxAge: number): boolean {
		return this.cache.isStale(typename, id, maxAge);
	}

	getEntityAge(typename: string, id: string): number | undefined {
		return this.cache.getEntityAge(typename, id);
	}

	serialize(): string {
		return JSON.stringify({
			entities: Array.from(this.cache.all().entries()),
			localState: Array.from(this.localState.entries()),
		});
	}

	deserialize(json: string): void {
		const data = JSON.parse(json);
		for (const [, entity] of data.entities) {
			this.cache.set(entity);
		}
		for (const [key, value] of data.localState) {
			this.writeLocal(key, value);
		}
	}

	snapshot(): import('./normalized-cache').CacheSnapshot {
		return this.cache.snapshot();
	}

	restore(s: import('./normalized-cache').CacheSnapshot): void {
		this.cache.restore(s);
	}

	setTypePolicies(policies: Record<string, TypePolicy>): void {
		this.cache.setTypePolicies(policies);
	}

	/**
	 * Walk a query/mutation result object, extract all entities with
	 * `__typename` + `id`, and merge them into the normalized cache.
	 * Returns the extracted entity keys and type names for use in
	 * dependency tracking and selective invalidation.
	 */
	normalizeResult(data: unknown): { entityKeys: Set<string>; typeNames: Set<string> } {
		const entityKeys = new Set<string>();
		const typeNames = new Set<string>();
		this.extractAndMerge(data, entityKeys, typeNames);
		return { entityKeys, typeNames };
	}

	private extractAndMerge(data: unknown, entityKeys: Set<string>, typeNames: Set<string>): void {
		if (Array.isArray(data)) {
			for (const item of data) this.extractAndMerge(item, entityKeys, typeNames);
			return;
		}
		if (!isNonNullObject(data)) return;
		const obj = data;
		const rawTypename = obj['__typename'];
		if (typeof rawTypename === 'string') {
			typeNames.add(rawTypename);
			const id = obj['id'];
			if (typeof id === 'string' || typeof id === 'number') {
				const entityKey = `${rawTypename}:${id}`;
				entityKeys.add(entityKey);
				this.merge({
					__typename: rawTypename,
					id: String(id),
					...obj,
				});
			}
		}
		for (const v of Object.values(obj)) {
			if (v && typeof v === 'object') this.extractAndMerge(v, entityKeys, typeNames);
		}
	}

	collectGarbage(): number {
		const { evicted: evictedKeys, count: evictedCount } = this.gc.sweep();
		if (evictedCount > 0) {
			this.metrics.recordGcRun(evictedCount);
			const refCounts: Record<string, number> = {};
			for (const typename of this.getEntityTypes()) {
				const entities = this.cache.get(typename);
				if (entities) {
					for (const e of entities) {
						if (e.id) {
							refCounts[`${e.__typename}:${e.id}`] = this.gc.refCountOf(e.__typename, e.id);
						}
					}
				}
			}
			this.emitEvent({ type: 'gcSweep', data: { evicted: evictedKeys, refCounts } });
		}
		return evictedCount;
	}

	async persist(): Promise<void> {
		if (!this.persistSvc) return;
		try {
			const data: [string, Record<string, unknown>][] = [];
			for (const [k, v] of this.cache.all()) {
				data.push([k, v]);
			}
			for (const [key, value] of this.localState) {
				data.push([`${LOCAL_STATE_PREFIX}${key}`, { value }]);
			}
			await this.persistSvc.persist(data);
		} catch (e) {
			this.metrics.recordError();
			this.emitEvent({ type: 'error', data: { operation: 'persist', error: e } });
		}
	}

	getMetricsSnapshot(): ReturnType<CacheMetrics['snapshot']> {
		let refCountTotal = 0;
		let danglingCount = 0;
		for (const typename of this.getEntityTypes()) {
			const entities = this.cache.get(typename);
			if (entities) {
				for (const e of entities) {
					if (e.id) {
						const rc = this.gc.refCountOf(e.__typename, e.id);
						if (rc === 0) danglingCount++;
						refCountTotal += rc;
					}
				}
			}
		}
		const sizeEstimate = new Blob([this.serialize()]).size;
		return this.metrics.snapshot(
			this.cache.count(),
			refCountTotal,
			danglingCount,
			this.cache.optimisticCount(),
			this.localState.size,
			sizeEstimate,
		);
	}

	/**
	 * Generate a human-readable debug report of the cache state.
	 * Useful for debugging and development tools.
	 */
	getDebugReport(): string {
		const snap = this.getMetricsSnapshot();
		const lines: string[] = [
			'── Cache Report ─────────────────────────────────────',
			`Entities:          ${snap.currentEntityCount}`,
			`Local state keys:  ${snap.localStateCount}`,
			`Size estimate:     ${(snap.sizeEstimateBytes / 1024).toFixed(1)} KB`,
			`Hit rate:          ${(snap.hitRate * 100).toFixed(1)}%`,
			`Reads:             ${snap.totalReads} (${snap.totalReads - Math.round(snap.hitRate * snap.totalReads)} misses)`,
			`Writes:            ${snap.totalWrites}`,
			`Merges:            ${snap.totalMerges}`,
			`Evictions:         ${snap.totalEvictions}`,
			`GC runs:           ${snap.totalGcRuns} (evicted ${snap.totalEntitiesEvicted} total)`,
			`Errors:            ${snap.totalErrors}`,
			`Dangling entities: ${snap.currentDanglingCount}`,
			`Ref count total:   ${snap.currentRefCountTotal}`,
		];

		// Entity breakdown by type
		const types = this.getEntityTypes();
		if (types.length > 0) {
			lines.push('');
			lines.push('Entity breakdown:');
			for (const t of types.sort()) {
				const entities = this.cache.get(t);
				const count = entities?.length ?? 0;
				lines.push(`  ${t}: ${count}`);
			}
		}

		lines.push('─────────────────────────────────────────────────────');
		return lines.join('\n');
	}

	private maybeAutoGc(): void {
		if (!this.autoGcEnabled) return;
		if (this.cache.count() >= this.autoGcThreshold) {
			this.collectGarbage();
		}
	}

	/** Return all cache keys (e.g. ["Todo:1", "User:3"]). */
	allKeys(): string[] {
		return this.cache.allKeys();
	}

	/** Return cache keys for a specific typename. */
	keysByType(typename: string): string[] {
		return this.cache.keysByType(typename);
	}

	/** Return all unique typenames in the cache. */
	getEntityTypes(): string[] {
		return this.cache.getEntityTypes();
	}

	/** Full context for an entity: data, metadata, age, staleness, size. */
	explain(typename: string, id: string): import('./normalized-cache').EntityExplain | undefined {
		return this.cache.explain(typename, id);
	}

	/** Dry-run merge: see what would change without applying it. */
	mergeDry(entity: Partial<CacheEntity> & { __typename: string; id: string }): import('./normalized-cache').DryMergeResult {
		return this.cache.mergeDry(entity);
	}

	/**
	 * Export the bidirectional dependency graph.
	 * `forward`: queryHash → entityKeys[] (which entities a query depends on)
	 * `reverse`: entityKey → queryHash[] (which queries depend on an entity)
	 */
	graph(): { forward: Record<string, string[]>; reverse: Record<string, string[]> } {
		const forward: Record<string, string[]> = {};
		for (const [q, entities] of this.queryEntities) {
			forward[q] = Array.from(entities);
		}
		const reverse: Record<string, string[]> = {};
		for (const [e, queries] of this.entityToQueries) {
			reverse[e] = Array.from(queries);
		}
		return { forward, reverse };
	}

	/** Estimate the serialized size of the cache in bytes. */
	sizeEstimate(): number {
		return new Blob([this.serialize()]).size;
	}

	/** Toggle structured debug logging. Returns unsubscribe function. */
	debug(enabled: boolean | { logger?: (...args: unknown[]) => void } = true): () => void {
		return this.events.setLogging(enabled);
	}
}

export function createCache(config?: CacheStoreConfig): CacheStore {
	return new CacheStore(config);
}
