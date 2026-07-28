import type { CacheStore } from '@quenetiq/cache';

export function readHash<T extends Record<string, unknown>>(
	store: CacheStore,
	typename: string,
	id?: string,
): T | T[] | null {
	if (id !== undefined) {
		return (store.cache.get(typename, id) as T | undefined) ?? null;
	}
	const entities = store.cache.get(typename) as T[] | undefined;
	return entities ?? null;
}
