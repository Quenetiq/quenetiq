import { inject } from '@angular/core';
import { GRAPHQL_CACHE } from './quenetiq-config';
import type { QuenetiqInjectOptions } from './inject-options';

export interface WriteQueryOptions {
	/** The typename of the entity. */
	__typename: string;
	/** The ID of the entity (optional, defaults to ''). */
	id?: string;
}

/**
 * Write data directly into the cache for a query result.
 * Useful for optimistic updates or manual cache manipulation.
 *
 * @example
 * ```typescript
 * const writeQuery = injectWriteQuery();
 * writeQuery({ __typename: 'User', id: '1' }, { name: 'John', email: 'john@example.com' });
 * ```
 */
export function injectWriteQuery(di?: QuenetiqInjectOptions) {
	const cache = inject(GRAPHQL_CACHE, { optional: true, ...di });

	return (options: WriteQueryOptions, data: Record<string, unknown>): void => {
		if (!cache) {
			// eslint-disable-next-line no-console
			console.warn('Quenetiq: No cache service available for writeQuery');
			return;
		}
		const id = options.id ?? '';
		const entity = cache.query(options.__typename, id);
		if (entity) {
			cache.write(options.__typename, id, { ...entity, ...data });
		} else {
			cache.write(options.__typename, id, data);
		}
	};
}

export interface WriteFragmentOptions {
	/** The typename of the entity. */
	__typename: string;
	/** The ID of the entity (optional, defaults to ''). */
	id?: string;
	/** The field name to update within the entity. */
	field: string;
}

/**
 * Write a specific field of a fragment entity into the cache.
 *
 * @example
 * ```typescript
 * const writeFragment = injectWriteFragment();
 * writeFragment({ __typename: 'User', id: '1', field: 'name' }, 'Jane');
 * ```
 */
export function injectWriteFragment(di?: QuenetiqInjectOptions) {
	const cache = inject(GRAPHQL_CACHE, { optional: true, ...di });

	return (options: WriteFragmentOptions, value: unknown): void => {
		if (!cache) {
			// eslint-disable-next-line no-console
			console.warn('Quenetiq: No cache service available for writeFragment');
			return;
		}
		const id = options.id ?? '';
		const entity = cache.query(options.__typename, id);
		if (entity) {
			cache.write(options.__typename, id, { ...entity, [options.field]: value });
		} else {
			cache.write(options.__typename, id, { [options.field]: value });
		}
	};
}
