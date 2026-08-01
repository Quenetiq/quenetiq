import type { CacheStore } from '@quenetiq/cache';

export function lastValueFromCache<T>(
	store: CacheStore,
	queryHash: string,
): Promise<T | null> {
	return Promise.resolve(store.readQuery<T>(queryHash) ?? null);
}
