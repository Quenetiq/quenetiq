import { Observable } from 'rxjs';
import type { CacheStore } from '@quenetiq/cache';
import { observeQuery } from './observe-query';

export interface WatchQueryOptions<TData> {
	queryHash: string;
	fetch: () => Promise<TData>;
}

export function watchQuery<TData>(
	store: CacheStore,
	options: WatchQueryOptions<TData>,
): Observable<TData | undefined> {
	const { queryHash, fetch } = options;

	return new Observable<TData | undefined>((subscriber) => {
		let completed = false;

		const handleError = (err: unknown): void => {
			if (!completed) subscriber.error(err);
		};

		const initialFetch = (): void => {
			fetch()
				.then((fresh) => {
					if (completed) return;
					subscriber.next(fresh);
				})
				.catch(handleError);
		};

		const cacheObs = observeQuery<TData>(store, queryHash);
		const cacheSub = cacheObs.subscribe({
			next: (data) => {
				if (data !== undefined) {
					subscriber.next(data);
				}
			},
			error: handleError,
		});

		initialFetch();

		return () => {
			completed = true;
			cacheSub.unsubscribe();
		};
	});
}
