import type { CacheStore } from '@quenetiq/cache';

/**
 * Minimal interface that Apollo Client's InMemoryCache satisfies.
 * Only covers the methods needed for migration.
 */
export interface ApolloCacheCompatible {
	readQuery<T, TVariables = Record<string, unknown>>(options: {
		query: { loc?: { source?: { body: string } }; definitions?: unknown[] };
		variables?: TVariables;
	}): T | null;

	writeQuery<T, TVariables = Record<string, unknown>>(options: {
		query: { loc?: { source?: { body: string } }; definitions?: unknown[] };
		variables?: TVariables;
		data: T;
	}): void;

	evict(options: { id: string; fieldName?: string }): boolean;

	gc(): number;

	extract(optimistic?: boolean): Record<string, unknown>;

	restore(serializedState: Record<string, unknown>): void;
}

/**
 * Wraps an Apollo InMemoryCache instance so it can be used as a Quenetiq CacheStore.
 * Useful for incremental migration.
 */
export function fromApolloCache(apolloCache: ApolloCacheCompatible): Partial<CacheStore> {
	return {
		query(typename: string, id: string) {
			const data = apolloCache.readQuery({
				query: {
					loc: { source: { body: `query { ${typename}(id: "${id}") { ... } }` } },
				},
			});
			return data as { __typename: string; id: string } | undefined;
		},
	};
}
