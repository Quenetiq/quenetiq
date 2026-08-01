import { inject } from '@angular/core';
import { CacheService } from './cache.service';

interface FragmentIdentifier {
	__typename: string;
	id?: string;
}

export function injectFragment<TData extends Record<string, unknown>>(
	identifier: FragmentIdentifier | null,
): TData | null {
	if (!identifier) return null;

	const cache = inject(CacheService);
	const id = identifier.id ?? '';
	const entity = cache.query<TData>(identifier.__typename, id);
	if (!entity) return null;
	return entity;
}
