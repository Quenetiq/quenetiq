import { inject } from '@angular/core';
import { GRAPHQL_CACHE } from './quenetiq-config';
import type { QuenetiqInjectOptions } from './inject-options';

/**
 * Glob-based cache invalidation. Invalidates all cache entries matching a glob pattern.
 *
 * @example
 * ```typescript
 * const invalidate = injectGlobInvalidation();
 * invalidate('User:*');           // invalidate all User entities
 * invalidate('Post:*:comments');  // invalidate comments field on all Posts
 * ```
 */
export function injectGlobInvalidation(di?: QuenetiqInjectOptions) {
	const cache = inject(GRAPHQL_CACHE, { optional: true, ...di });

	return (glob: string): number => {
		if (!cache) {
			// eslint-disable-next-line no-console
			console.warn('Quenetiq: No cache service available for glob invalidation');
			return 0;
		}

		// Simple glob pattern matching: * matches any characters except ':'
		// Pattern: "User:*" matches "User:1", "User:2", etc.
		const regexStr = '^' + glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
			.replace(/\*/g, '[^:]*')
			.replace(/\*\*/g, '.*') + '$';
		const regex = new RegExp(regexStr);

		let count = 0;

		// Iterate over all types in cache and find matching keys
		if (typeof (cache as unknown as { types?: Map<string, Map<string, unknown>> }).types === 'object') {
			const types = (cache as unknown as { types: Map<string, Map<string, unknown>> }).types;
			for (const [typename, entities] of types) {
				for (const id of entities.keys()) {
					const key = `${typename}:${id}`;
					if (regex.test(key)) {
						entities.delete(id);
						count++;
					}
				}
			}
		}

		return count;
	};
}
