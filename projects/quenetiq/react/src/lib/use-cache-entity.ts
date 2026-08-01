import { useState, useEffect, useCallback } from 'react';
import type { CacheEntity } from '@quenetiq/cache';
import { useCache } from './provider';

export interface UseCacheEntityOptions {
	typename: string;
	id: string;
}

export interface UseCacheEntityResult<T extends CacheEntity = CacheEntity> {
	data: T | null;
	loading: boolean;
	error: string | null;
	refetch: () => void;
}

/**
 * React hook that reads a normalized entity from the cache and re-renders
 * when the entity changes (write, merge, evict).
 *
 * @example
 * ```tsx
 * function TodoItem({ id }: { id: string }) {
 *   const { data, loading } = useCacheEntity({ typename: 'Todo', id });
 *   if (loading) return <p>Loading...</p>;
 *   if (!data) return <p>Not found</p>;
 *   return <p>{data.title}</p>;
 * }
 * ```
 */
export function useCacheEntity<T extends CacheEntity = CacheEntity>(
	options: UseCacheEntityOptions,
): UseCacheEntityResult<T> {
	const cache = useCache();
	const { typename, id } = options;

	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const readEntity = useCallback(() => {
		if (!cache) {
			setLoading(false);
			return;
		}

		try {
			const entity = cache.query(typename, id) as T | undefined;
			setData(entity ?? null);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to read cache entity');
		} finally {
			setLoading(false);
		}
	}, [cache, typename, id]);

	useEffect(() => {
		readEntity();

		if (!cache) return;

		const unsubscribe = cache.events.on((event) => {
			if (event.type === 'write' || event.type === 'merge') {
				const entity = event.data.entity;
				if (entity.__typename === typename && entity.id === id) {
					readEntity();
				}
			} else if (event.type === 'evict') {
				if (event.data.typename === typename && event.data.id === id) {
					setData(null);
				}
			}
		});

		return unsubscribe;
	}, [cache, typename, id, readEntity]);

	return { data, loading, error, refetch: readEntity };
}
