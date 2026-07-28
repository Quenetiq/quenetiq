import { Observable } from 'rxjs';
import type { CacheStore } from '@quenetiq/cache';

export function staleWhileRevalidate<TData>(
	store: CacheStore,
	queryHash: string,
	fetch: () => Promise<TData>,
): Observable<TData | undefined> {
	return new Observable<TData | undefined>((subscriber) => {
		let completed = false;

		const cached = store.readQuery<TData>(queryHash);
		if (cached !== undefined) {
			subscriber.next(cached);
		}

		fetch()
			.then((fresh) => {
				if (completed) return;
				subscriber.next(fresh);
				subscriber.complete();
			})
			.catch((err) => {
				if (completed) return;
				if (cached !== undefined) {
					subscriber.complete();
				} else {
					subscriber.error(err);
				}
			});

		return () => {
			completed = true;
		};
	});
}
