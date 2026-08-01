import { Observable, Subject, fromEvent, merge, of, switchMap, takeUntil, tap } from 'rxjs';
import { type GraphqlMiddleware } from '@quenetiq/core';

export interface FocusRefetchConfig {
	visibilityOnly?: boolean;
	minStaleSeconds?: number;
}

const lastFetch = new Map<string, number>();

export function focusRefetchMiddleware(config?: FocusRefetchConfig): GraphqlMiddleware {
	const visibilityOnly = config?.visibilityOnly ?? false;
	const minStale = (config?.minStaleSeconds ?? 30) * 1000;

	const focus$ = visibilityOnly
		? fromEvent(document, 'visibilitychange').pipe(
			switchMap(() => (document.visibilityState === 'visible' ? of(null) : new Observable<never>())),
		)
		: merge(
			fromEvent(document, 'visibilitychange').pipe(
				switchMap(() => (document.visibilityState === 'visible' ? of(null) : new Observable<never>())),
			),
			fromEvent(window, 'focus'),
		);

	return (request, next) => {
		if (request.type !== 'query') return next(request);

		return next(request).pipe(
			tap(() => {
				const key = request.query;
				lastFetch.set(key, Date.now());
			}),
			switchMap((initialResult) => {
				if (initialResult.status !== 'success') return of(initialResult);

				const key = request.query;
				const stop$ = new Subject<void>();

				return merge(
					of(initialResult),
					focus$.pipe(
						switchMap(() => {
							const last = lastFetch.get(key) ?? 0;
							if (Date.now() - last < minStale) return [];
							lastFetch.set(key, Date.now());
							return next(request).pipe(takeUntil(stop$));
						}),
					),
				);
			}),
		);
	};
}
