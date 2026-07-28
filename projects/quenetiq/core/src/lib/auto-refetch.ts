import { inject, Injectable, type Provider, ENVIRONMENT_INITIALIZER, Injector } from '@angular/core';
import { tap } from 'rxjs';
import type { GraphQLResult } from './graphql.service';
import type { GraphqlMiddleware } from './middleware';
import { GRAPHQL_CACHE } from './quenetiq-config';

export function mutationCachePolicy(injector?: Injector): GraphqlMiddleware {
	return (request, next) => {
		if (request.type !== 'mutation') return next(request);

		return next(request).pipe(
			tap((result: GraphQLResult<unknown>) => {
				if (result.status !== 'success') return;
				const inj =
					injector ??
					(() => {
						try {
							return inject(Injector);
						} catch {
							return null;
						}
					})();
				if (!inj) return;
				const cache = inj.get(GRAPHQL_CACHE, null);
				if (!cache) return;
				const typeNames = new Set<string | undefined>();
				extractTypes(result.data, typeNames);
				const names = Array.from(typeNames).filter(Boolean) as string[];
				if (names.length > 0) {
					cache.clearLocalStateByTypes(names);
				}
			}),
		);
	};
}

function extractTypes(data: unknown, types: Set<string | undefined>): void {
	if (!data || typeof data !== 'object') return;
	if (Array.isArray(data)) {
		for (const item of data) extractTypes(item, types);
		return;
	}
	const obj = data as Record<string, unknown>;
	if (typeof obj['__typename'] === 'string') {
		types.add(obj['__typename'] as string);
	}
	for (const v of Object.values(obj)) {
		if (v && typeof v === 'object') extractTypes(v, types);
	}
}

@Injectable()
export class AutoRefetchService {
	clearRegistry(): void {
		// no-op, kept for API compatibility
	}
}

export function provideAutoRefetch(): Provider[] {
	return [
		AutoRefetchService,
		{
			provide: ENVIRONMENT_INITIALIZER,
			multi: true,
			useValue: () => inject(AutoRefetchService),
		},
	];
}
