import { Observable, type OperatorFunction } from 'rxjs';
import type { CacheStore } from '@quenetiq/cache';

export function cacheFirst<TData>(
	store: CacheStore,
	queryHash: string,
	fetch: () => Promise<TData>,
): Observable<TData | undefined> {
	return new Observable<TData | undefined>((subscriber) => {
		let latest: TData | undefined;
		let completed = false;

		const cached = store.readQuery<TData>(queryHash);
		if (cached !== undefined) {
			latest = cached;
			subscriber.next(cached);
		}

		fetch()
			.then((fresh) => {
				if (completed) return;
				latest = fresh;
				subscriber.next(fresh);
				subscriber.complete();
			})
			.catch((err) => {
				if (!completed) subscriber.error(err);
			});

		return () => {
			completed = true;
		};
	});
}

export function cacheFirstPipe<TData>(
	fetch: () => Promise<TData>,
	store: CacheStore,
	queryHash: string,
): OperatorFunction<unknown, TData | undefined> {
	return (source) =>
		new Observable<TData | undefined>((subscriber) => {
			const sub = source.subscribe({
				error: (err) => subscriber.error(err),
				complete: () => subscriber.complete(),
			});

			const inner = cacheFirst(store, queryHash, fetch).subscribe({
				next: (v) => subscriber.next(v),
				error: (err) => subscriber.error(err),
				complete: () => {
					sub.unsubscribe();
					subscriber.complete();
				},
			});

			return () => {
				sub.unsubscribe();
				inner.unsubscribe();
			};
		});
}
