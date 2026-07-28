import { BehaviorSubject, Observable } from 'rxjs';
import { type CacheEntity, type OptimisticUpdate, type TypePolicy, type NormalizedCache } from './normalized-cache';
import { CacheStore } from './cache-store';
import { type CacheGc } from './cache-gc';
import { CachePersistenceService } from './cache-persist-ng';
import { type CacheEvent, CacheEvents } from './cache-events';
import { type CacheMetricsSnapshot, type CacheMetrics } from './cache-metrics';
import { type Provider } from '@angular/core';
import { GRAPHQL_CACHE } from './tokens';
import { filter } from 'rxjs/operators';

export class CacheService {
	private store: CacheStore;
	readonly cache: NormalizedCache;
	readonly gc: CacheGc;
	readonly events: CacheEvents;
	readonly metrics: CacheMetrics;

	private localStateSubject = new Map<string, BehaviorSubject<unknown>>();

	constructor(persistSvc?: CachePersistenceService | null) {
		this.store = new CacheStore(persistSvc ? { persist: persistSvc } : undefined);
		this.cache = this.store.cache;
		this.gc = this.store.gc;
		this.events = this.store.events;
		this.metrics = this.store.metrics;
	}

	query<T = CacheEntity>(typename: string, id: string): T | undefined {
		return this.store.query(typename, id) as T | undefined;
	}

	write(entity: CacheEntity): void {
		this.store.write(entity);
	}

	merge(entity: Partial<CacheEntity> & { __typename: string; id: string }): void {
		this.store.merge(entity);
	}

	evict(typename: string, id: string): void {
		this.store.evict(typename, id);
	}

	applyOptimistic(update: OptimisticUpdate): void {
		this.store.applyOptimistic(update);
	}

	rollbackOptimistic(id: string): void {
		this.store.rollbackOptimistic(id);
	}

	commitOptimistic(id: string): void {
		this.store.commitOptimistic(id);
	}

	readQuery<T = unknown>(queryHash: string): T | undefined {
		return this.store.readQuery<T>(queryHash);
	}

	writeQuery<T>(queryHash: string, data: T): void {
		this.store.writeQuery(queryHash, data);
	}

	readFragment<T extends Record<string, unknown>>(
		typename: string,
		id: string,
		fields: readonly string[],
	): Pick<T, keyof T> | undefined {
		return this.store.readFragment<T>(typename, id, fields);
	}

	writeFragment(
		typename: string,
		id: string,
		fields: Record<string, unknown>,
	): void {
		this.store.writeFragment(typename, id, fields);
	}

	readLocal<T = unknown>(key: string): T | undefined {
		return this.store.readLocal<T>(key);
	}

	hasLocal(key: string): boolean {
		return this.store.hasLocal(key);
	}

	localKeys(): string[] {
		return this.store.localKeys();
	}

	localEntries(): [string, unknown][] {
		return this.store.localEntries();
	}

	localSize(): number {
		return this.store.localSize();
	}

	watchLocal(key: string): Observable<unknown> {
		const existing = this.localStateSubject.get(key);
		if (existing) {
			return existing.asObservable();
		}
		const subj = new BehaviorSubject<unknown>(this.store.readLocal(key));
		this.localStateSubject.set(key, subj);
		this.store.watchLocal(key, () => {
			subj.next(this.store.readLocal(key));
		});
		return subj.asObservable();
	}

	writeLocal<T>(key: string, value: T): void {
		this.store.writeLocal(key, value);
	}

	clearLocalState(): void {
		this.localStateSubject.clear();
		this.store.clearLocalState();
	}

	writeLocalWithTypes<T>(key: string, value: T, types: Set<string>): void {
		this.store.writeLocalWithTypes(key, value, types);
	}

	clearLocalStateByTypes(types: string[]): void {
		this.store.clearLocalStateByTypes(types);
	}

	recordQueryDependencies(queryHash: string, entityKeys: Set<string>): void {
		this.store.recordQueryDependencies(queryHash, entityKeys);
	}

	notifyQueryChanged(queryHash: string): void {
		this.store.notifyQueryChanged(queryHash);
	}

	getQueriesForEntity(entityKey: string): string[] {
		return this.store.getQueriesForEntity(entityKey);
	}

	getEntitiesForQuery(queryHash: string): string[] {
		return this.store.getEntitiesForQuery(queryHash);
	}

	invalidateEntity(typename: string, id: string): void {
		this.store.invalidateEntity(typename, id);
	}

	invalidateQuery(queryHash: string): void {
		this.store.invalidateQuery(queryHash);
	}

	prime(queryHash: string, data: unknown, source = ''): void {
		this.store.prime(queryHash, data, source);
	}

	getEntityMeta(key: string): import('./normalized-cache').EntityMeta | undefined {
		return this.store.getEntityMeta(key);
	}

	getAllEntityMeta(): Map<string, import('./normalized-cache').EntityMeta> {
		return this.store.getAllEntityMeta();
	}

	resolveField(typename: string, id: string, field: string, args?: Record<string, unknown>): unknown {
		return this.store.resolveField(typename, id, field, args);
	}

	isEntityStale(typename: string, id: string, maxAge: number): boolean {
		return this.store.isEntityStale(typename, id, maxAge);
	}

	getEntityAge(typename: string, id: string): number | undefined {
		return this.store.getEntityAge(typename, id);
	}

	allKeys(): string[] {
		return this.store.allKeys();
	}

	keysByType(typename: string): string[] {
		return this.store.keysByType(typename);
	}

	getEntityTypes(): string[] {
		return this.store.getEntityTypes();
	}

	snapshot(): import('./normalized-cache').CacheSnapshot {
		return this.store.snapshot();
	}

	restore(s: import('./normalized-cache').CacheSnapshot): void {
		this.store.restore(s);
	}

	serialize(): string {
		return this.store.serialize();
	}

	deserialize(json: string): void {
		this.store.deserialize(json);
	}

	setTypePolicies(policies: Record<string, TypePolicy>): void {
		this.store.setTypePolicies(policies);
	}

	/**
	 * Walk a query/mutation result object, extract all entities with
	 * `__typename` + `id`, and merge them into the normalized cache.
	 */
	normalizeResult(data: unknown): { entityKeys: Set<string>; typeNames: Set<string> } {
		return this.store.normalizeResult(data);
	}

	collectGarbage(): number {
		return this.store.collectGarbage();
	}

	transaction(fn: () => void): void {
		this.store.transaction(fn);
	}

	async persist(): Promise<void> {
		await this.store.persist();
	}

	onEvent(): Observable<CacheEvent> {
		return new Observable<CacheEvent>((subscriber) => {
			const unsubscribe = this.events.on((event) => subscriber.next(event));
			return () => unsubscribe();
		});
	}

	onWrite(): Observable<CacheEvent & { type: 'write' }> {
		return this.onEvent().pipe(filter((e): e is CacheEvent & { type: 'write' } => e.type === 'write'));
	}

	onEvict(): Observable<CacheEvent & { type: 'evict' }> {
		return this.onEvent().pipe(filter((e): e is CacheEvent & { type: 'evict' } => e.type === 'evict'));
	}

	onGcSweep(): Observable<CacheEvent & { type: 'gcSweep' }> {
		return this.onEvent().pipe(filter((e): e is CacheEvent & { type: 'gcSweep' } => e.type === 'gcSweep'));
	}

	onOptimistic(): Observable<CacheEvent & { type: 'optimistic' }> {
		return this.onEvent().pipe(filter((e): e is CacheEvent & { type: 'optimistic' } => e.type === 'optimistic'));
	}

	onError(): Observable<CacheEvent & { type: 'error' }> {
		return this.onEvent().pipe(filter((e): e is CacheEvent & { type: 'error' } => e.type === 'error'));
	}

	/**
	 * Generate a human-readable debug report of the cache state.
	 */
	getDebugReport(): string {
		return this.store.getDebugReport();
	}

	getMetricsSnapshot(): CacheMetricsSnapshot {
		return this.store.getMetricsSnapshot();
	}
}

export function provideCacheService(persistSvc?: CachePersistenceService): Provider[] {
	const service = new CacheService(persistSvc);
	return [
		{ provide: CacheService, useValue: service },
		{ provide: GRAPHQL_CACHE, useExisting: CacheService },
	];
}
