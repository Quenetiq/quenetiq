import { buildKey, inlineKey, simpleKey, allKeys, keysByType, getEntityTypes } from './cache-keys';
import { getMeta, getAllMeta, getEntityAge, isStale, touchMeta } from './cache-meta';
import { takeSnapshot, restoreSnapshot, type CacheSnapshot } from './cache-snapshot';
import { applyOptimistic, rollbackOptimistic, commitOptimistic } from './cache-optimistic';

export interface CacheEntity {
	__typename: string;
	id?: string;
	[key: string]: unknown;
}

export interface EntityMeta {
	createdAt: number;
	updatedAt: number;
	source: string;
	mergeCount: number;
}

export interface OptimisticUpdate {
	id: string;
	apply: (cache: Map<string, CacheEntity>) => void;
	rollback: (previous: Map<string, CacheEntity>) => void;
}

export interface CacheReadContext {
	entity: CacheEntity;
	[key: string]: unknown;
}

export function isCacheEntity(value: unknown): value is CacheEntity {
	if (typeof value !== 'object' || value === null) return false;
	return '__typename' in value && typeof value.__typename === 'string';
}

export interface TypePolicy {
	keyFields?: string[];
	keyFn?: (entity: CacheEntity) => string;
	/** Time-to-live in milliseconds. Entities older than this are treated as stale and not returned from storage. */
	ttl?: number;
	merge?:
		| 'append'
		| 'prepend'
		| ((existing: unknown | undefined, incoming: unknown, options?: { args?: Record<string, unknown> }) => unknown);
	resolve?: (field: string, args: Record<string, unknown>, ctx: CacheReadContext) => unknown;
}

export type { CacheSnapshot } from './cache-snapshot';

export interface EntityExplain {
	entity: CacheEntity;
	key: string;
	meta: EntityMeta | undefined;
	ageMs: number | undefined;
	staleness: 'fresh' | 'stale';
	sizeBytes: number;
}

export interface DryMergeResult {
	key: string;
	existed: boolean;
	changedFields: string[];
	previousValues: Record<string, unknown>;
	result: CacheEntity;
}

export class NormalizedCache {
	private entities = new Map<string, CacheEntity>();
	private optimistics = new Map<string, OptimisticUpdate>();
	private meta = new Map<string, EntityMeta>();
	private typePolicies: Record<string, TypePolicy>;

	constructor(typePolicies?: Record<string, TypePolicy>) {
		this.typePolicies = typePolicies ?? {};
	}

	setTypePolicies(policies: Record<string, TypePolicy>): void {
		this.typePolicies = { ...policies };
	}

	key(typename: string, id: string): string {
		return simpleKey(typename, id);
	}

	get<T extends CacheEntity = CacheEntity>(typename: string, id: string): T | undefined;
	get<T extends CacheEntity = CacheEntity>(typename: string): T[] | undefined;
	get<T extends CacheEntity = CacheEntity>(typename: string, id?: string): T | T[] | undefined {
		if (id !== undefined) {
			return this.entities.get(simpleKey(typename, id)) as T | undefined;
		}
		const results: T[] = [];
		const prefix = `${typename}:`;
		for (const [k, v] of this.entities) {
			if (k.startsWith(prefix)) {
				results.push(v as T);
			}
		}
		return results.length ? results : undefined;
	}

	set(entity: CacheEntity, source = ''): void {
		if (!entity.__typename) return;
		const t = entity.__typename;
		const policy = this.typePolicies[t];
		const k = buildKey(t, entity, policy) ?? inlineKey(t);
		this.entities.set(k, entity);
		touchMeta(this.meta, k, source);
	}

	merge(entity: Partial<CacheEntity> & { __typename: string; id?: string }, source = ''): { changedFields: string[]; previousValues: Record<string, unknown> } {
		const t = entity.__typename;
		const policy = this.typePolicies[t];
		const k = buildKey(t, entity, policy) ?? inlineKey(t);
		const existing = this.entities.get(k);

		const changedFields: string[] = [];
		const previousValues: Record<string, unknown> = {};
		if (existing) {
			for (const [field, value] of Object.entries(entity)) {
				if (field === '__typename') continue;
				if (existing[field] !== value) {
					changedFields.push(field);
					previousValues[field] = existing[field];
				}
			}
		} else {
			for (const field of Object.keys(entity)) {
				if (field !== '__typename') changedFields.push(field);
			}
		}

		if (policy?.merge && typeof policy.merge === 'function') {
			const merged = policy.merge(existing, entity, undefined);
			if (!isCacheEntity(merged)) throw new Error(`Custom merge function for ${t} must return a CacheEntity`);
			this.entities.set(k, merged);
		} else {
			const base: CacheEntity = existing ?? { __typename: t };
			this.entities.set(k, { ...base, ...entity });
		}
		touchMeta(this.meta, k, source);
		return { changedFields, previousValues };
	}

	remove(typename: string, id?: string): void {
		if (id !== undefined) {
			const k = simpleKey(typename, id);
			this.entities.delete(k);
			this.meta.delete(k);
			return;
		}
		for (const key of this.entities.keys()) {
			if (key.startsWith(`${typename}:`)) {
				this.entities.delete(key);
				this.meta.delete(key);
			}
		}
	}

	all(): Map<string, CacheEntity> {
		return new Map(this.entities);
	}

	clear(): void {
		this.entities.clear();
		this.optimistics.clear();
		this.meta.clear();
	}

	getMeta(key: string): EntityMeta | undefined {
		return getMeta(this.meta, key);
	}

	allMeta(): Map<string, EntityMeta> {
		return getAllMeta(this.meta);
	}

	resolveField(typename: string, id: string, field: string, args: Record<string, unknown> = {}): unknown {
		const entity = this.get(typename, id);
		if (!entity) return undefined;
		const policy = this.typePolicies[typename];
		if (policy?.resolve) {
			return policy.resolve(field, args, { entity });
		}
		return entity[field];
	}

	isStale(typename: string, id: string, maxAge: number): boolean {
		return isStale(this.meta, simpleKey(typename, id), maxAge);
	}

	getEntityAge(typename: string, id: string): number | undefined {
		return getEntityAge(this.meta, simpleKey(typename, id));
	}

	applyOptimistic(update: OptimisticUpdate): void {
		applyOptimistic(this.entities, this.optimistics, update);
	}

	rollbackOptimistic(id: string): void {
		rollbackOptimistic(this.entities, this.optimistics, id);
	}

	commitOptimistic(id: string): void {
		commitOptimistic(this.optimistics, id);
	}

	allKeys(): string[] {
		return allKeys(this.entities);
	}

	keysByType(typename: string): string[] {
		return keysByType(this.entities, typename);
	}

	getEntityTypes(): string[] {
		return getEntityTypes(this.entities);
	}

	snapshot(): CacheSnapshot {
		return takeSnapshot(this.entities, this.meta);
	}

	restore(snapshot: CacheSnapshot): void {
		restoreSnapshot(this.entities, this.meta, snapshot);
	}

	count(): number {
		return this.entities.size;
	}

	optimisticCount(): number {
		return this.optimistics.size;
	}

	explain(typename: string, id: string): EntityExplain | undefined {
		const k = simpleKey(typename, id);
		const entity = this.entities.get(k);
		if (!entity) return undefined;
		const meta = this.meta.get(k);
		const age = meta ? Date.now() - meta.updatedAt : undefined;
		const stale = meta ? Date.now() - meta.updatedAt > 60_000 : true;
		return {
			entity,
			key: k,
			meta,
			ageMs: age,
			staleness: stale ? 'stale' : 'fresh',
			sizeBytes: new Blob([JSON.stringify(entity)]).size,
		};
	}

	mergeDry(entity: Partial<CacheEntity> & { __typename: string; id?: string }): DryMergeResult {
		const t = entity.__typename;
		const policy = this.typePolicies[t];
		const k = buildKey(t, entity, policy) ?? inlineKey(t);
		const existing = this.entities.get(k);

		const changedFields: string[] = [];
		const previousValues: Record<string, unknown> = {};
		if (existing) {
			for (const [field, value] of Object.entries(entity)) {
				if (field === '__typename') continue;
				if (existing[field] !== value) {
					changedFields.push(field);
					previousValues[field] = existing[field];
				}
			}
		} else {
			for (const field of Object.keys(entity)) {
				if (field !== '__typename') changedFields.push(field);
			}
		}

		let result: CacheEntity;
		if (policy?.merge && typeof policy.merge === 'function') {
			const merged = policy.merge(existing, entity, undefined);
			if (!isCacheEntity(merged)) throw new Error(`Custom merge for ${t} must return CacheEntity`);
			result = merged;
		} else {
			const base: CacheEntity = existing ?? { __typename: t };
			result = { ...base, ...entity };
		}

		return {
			key: k,
			existed: existing !== undefined,
			changedFields,
			previousValues,
			result,
		};
	}
}
