import { from, of, type Observable } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import type { GraphqlMiddleware, GraphQLResult } from '@quenetiq/core';

export interface ErrorHandlerConfig {
	handle(error: unknown): boolean | Promise<boolean>;
	fallbackMessage?: string;
}

export function errorHandlerMiddleware(config: ErrorHandlerConfig): GraphqlMiddleware {
	const fallbackMessage = config.fallbackMessage ?? 'An error occurred';

	return (request, next) => {
		return next(request).pipe(
			catchError((error: unknown) => {
				const out = config.handle(error);
				const toResult$ = (handled: boolean): Observable<GraphQLResult<never>> => {
					if (handled) {
						return of<GraphQLResult<never>>({
							status: 'error',
							error: error instanceof Error ? error.message : fallbackMessage,
						});
					}
					throw error;
				};

				if (out instanceof Promise) {
					return from(out).pipe(mergeMap(toResult$));
				}

				return toResult$(out);
			}),
		);
	};
}
