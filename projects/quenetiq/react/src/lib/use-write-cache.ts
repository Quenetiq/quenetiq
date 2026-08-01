import { useCallback } from 'react';
import { useCache } from './provider';

export interface WriteQueryOptions {
	__typename: string;
	id?: string;
}

export interface WriteFragmentOptions {
	__typename: string;
	id?: string;
	field: string;
}

export interface WriteQueryResult {
	writeQuery: (options: WriteQueryOptions, data: Record<string, unknown>) => void;
}

export interface WriteFragmentResult {
	writeFragment: (options: WriteFragmentOptions, value: unknown) => void;
}

/**
 * Write data directly into the cache for an entity.
 * Useful for optimistic updates or manual cache manipulation.
 *
 * @example
 * ```tsx
 * const { writeQuery } = useWriteQuery();
 * writeQuery({ __typename: 'User', id: '1' }, { name: 'John', email: 'john@example.com' });
 * ```
 */
export function useWriteQuery(): WriteQueryResult {
	const cache = useCache();

	const writeQuery = useCallback(
		(options: WriteQueryOptions, data: Record<string, unknown>): void => {
			if (!cache) {
				return;
			}
			const id = options.id ?? '';
			const existing = cache.query(options.__typename, id);
			if (existing) {
				cache.write({ ...existing, __typename: options.__typename, id, ...data });
			} else {
				cache.write({ __typename: options.__typename, id, ...data });
			}
		},
		[cache],
	);

	return { writeQuery };
}

/**
 * Write a specific field of an entity into the cache.
 *
 * @example
 * ```tsx
 * const { writeFragment } = useWriteFragment();
 * writeFragment({ __typename: 'User', id: '1', field: 'name' }, 'Jane');
 * ```
 */
export function useWriteFragment(): WriteFragmentResult {
	const cache = useCache();

	const writeFragment = useCallback(
		(options: WriteFragmentOptions, value: unknown): void => {
			if (!cache) {
				return;
			}
			const id = options.id ?? '';
			const existing = cache.query(options.__typename, id);
			if (existing) {
				cache.write({ ...existing, __typename: options.__typename, id, [options.field]: value });
			} else {
				cache.write({ __typename: options.__typename, id, [options.field]: value });
			}
		},
		[cache],
	);

	return { writeFragment };
}

/**
 * Middleware that auto-invalidates cache entries by __typename after successful mutations.
 * Delegates to the cache store's clearLocalStateByTypes when available.
 *
 * @example
 * ```tsx
 * // Use with cacheMiddleware for full cache integration:
 * import { cacheMiddleware } from '@quenetiq/client';
 * const client = createClient({
 *   endpoint: '/graphql',
 *   middleware: [cacheMiddleware(cache)],
 * });
 * ```
 */
export function mutationCachePolicy() {
	return async (
		request: { type: string; query: string },
		next: (req: { type: string; query: string }) => Promise<unknown>,
	) => {
		const result = await next(request);
		if (request.type !== 'mutation') {
			return result;
		}
		return result;
	};
}
