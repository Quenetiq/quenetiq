import { Observable, of, switchMap, tap } from 'rxjs';
import { type GraphqlMiddleware, type GraphqlRequestContext, type GraphQLResult } from '@quenetiq/core';

export interface AuthRefreshConfig {
	refreshToken: () => string | Promise<string> | Observable<string>;
	headerName?: string;
	triggerStatuses?: number[];
	maxAttempts?: number;
}

export function authRefreshMiddleware(config: AuthRefreshConfig): GraphqlMiddleware {
	const headerName = config.headerName ?? 'Authorization';
	const triggerStatuses = new Set(config.triggerStatuses ?? [401]);
	const maxAttempts = config.maxAttempts ?? 1;
	let isRefreshing = false;
	const refreshQueue: {
		request: GraphqlRequestContext;
		resolve: (result: Observable<GraphQLResult<unknown>>) => void;
	}[] = [];

	return (request, next) => {
		let attempts = 0;

		function execute(): Observable<GraphQLResult<unknown>> {
			return next(request).pipe(
				switchMap((result) => {
					const httpStatus = result.status === 'error' ? result.networkError?.status : undefined;
					const isAuthError =
						result.status === 'error' &&
						triggerStatuses.size > 0 &&
						httpStatus !== undefined &&
						triggerStatuses.has(httpStatus);

					if (!isAuthError || attempts >= maxAttempts) {
						return of(result);
					}

					attempts++;

					if (isRefreshing) {
						return new Observable<GraphQLResult<unknown>>((sub) => {
							refreshQueue.push({ request, resolve: (obs) => obs.subscribe(sub) });
						});
					}

					isRefreshing = true;
					const token$ = config.refreshToken();

					const obs$ =
						token$ instanceof Observable
							? token$
							: token$ instanceof Promise
								? new Observable<string>((sub) => {
									token$
										.then((t) => {
											sub.next(t);
											sub.complete();
										})
										.catch((e: unknown) => {
											sub.error(e);
										});
								})
								: of(token$);

					return obs$.pipe(
						tap((newToken) => {
							request.headers[headerName] = /Bearer\s/.test(newToken) ? newToken : `Bearer ${newToken}`;
							isRefreshing = false;
							const queue = refreshQueue.splice(0);
							for (const item of queue) {
								item.request.headers[headerName] = request.headers[headerName];
								item.resolve(execute());
							}
						}),
						switchMap(() => execute()),
					);
				}),
			);
		}

		return execute();
	};
}
