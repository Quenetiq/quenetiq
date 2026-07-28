import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CacheEvent, CacheEvents } from './cache-events';
import type { CacheSnapshot } from './normalized-cache';

/**
 * Type-safe wrapper for GraphQL results that includes cache metadata.
 * Use instead of spreading `fromCache` ad-hoc on result objects.
 */
export interface CacheAwareResult<T> {
	status: 'success';
	data: T;
	fromCache: boolean;
	cachedAt?: number;
	entityKeys?: string[];
	graphQLErrors?: unknown[];
}

export interface GraphqlCacheLike {
	merge(entity: { __typename: string; id: string; [key: string]: unknown }): void;
	query(typename: string, id: string): unknown;
	write(typename: string, id: string, data: Record<string, unknown>): void;
	readLocal(key: string): unknown;
	writeLocalWithTypes<T>(key: string, value: T, types: Set<string>): void;
	clearLocalStateByTypes(types: string[]): void;
	setTypePolicies(policies: Record<string, { keyFields?: string[]; merge?: unknown }>): void;
	applyOptimistic(update: { id: string; entities: { __typename: string; id: string }[] }): string;
	commitOptimistic(id: string): void;
	rollbackOptimistic(id: string): void;
	/** Return all cache keys (e.g. ["Todo:1", "User:3"]). */
	allKeys?(): string[];
	/** Return cache keys for a specific typename. */
	keysByType?(typename: string): string[];
	/** Return all unique typenames in the cache. */
	getEntityTypes?(): string[];
	/** Capture a snapshot of entities and metadata for export. */
	snapshot?(): CacheSnapshot;
	/** Restore a previously captured snapshot. */
	restore?(snapshot: CacheSnapshot): void;
	/** Record which entity keys a query result depends on. */
	recordQueryDependencies?(queryHash: string, entityKeys: Set<string>): void;
	/** Notify watchers that a query's cached result may have changed. */
	notifyQueryChanged?(queryHash: string): void;
	/** Get all query hashes that depend on a given entity key. */
	getQueriesForEntity?(entityKey: string): string[];
	/** Get all entity keys that a query depends on. */
	getEntitiesForQuery?(queryHash: string): string[];
	/** Subscribe to cache events (write, merge, evict, etc.). */
	onEvent?(): Observable<CacheEvent>;
	/** Watch a local state key for changes. Returns unsubscribe function. */
	watchLocal?(key: string, listener: () => void): () => void;
	/** Walk a result object, extract entities, and merge into the normalized cache. */
	normalizeResult?(data: unknown): { entityKeys: Set<string>; typeNames: Set<string> };
	/** Cache event bus for subscribing to and emitting cache events. */
	events?: CacheEvents;
}

export const GRAPHQL_CACHE = new InjectionToken<GraphqlCacheLike>('GRAPHQL_CACHE');
