import { Observable } from 'rxjs';
import { share, finalize } from 'rxjs/operators';
import { type GraphqlMiddleware, type GraphQLResult } from '@quenetiq/core';

/**
 * Deduplicates in-flight GraphQL requests.
 * When the same query + variables is already being fetched,
 * subsequent calls share the same in-flight Observable instead
 * of creating a new HTTP request.
 */
export function dedupMiddleware(): GraphqlMiddleware {
	const inFlight = new Map<string, Observable<GraphQLResult<unknown>>>();

	return (request, next) => {
		const key = request.type + '|' + request.query + '|' + JSON.stringify(request.variables ?? {});

		const existing = inFlight.get(key);
		if (existing) return existing;

		const shared$ = next(request).pipe(
			share(),
			finalize(() => inFlight.delete(key)),
		);

		inFlight.set(key, shared$);
		return shared$;
	};
}
