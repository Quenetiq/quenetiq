import { Observable } from 'rxjs';
import type { CacheStore } from '@quenetiq/cache';
import { observeQuery } from './observe-query';

export function asCache<T>(
	store: CacheStore,
	queryHash: string,
): Observable<T | null> {
	return new Observable<T | null>((subscriber) => {
		subscriber.next(store.readQuery<T>(queryHash) ?? null);

		const sub = observeQuery<T>(store, queryHash).subscribe({
			next: (data) => subscriber.next(data ?? null),
			error: (err) => subscriber.error(err),
		});

		return () => sub.unsubscribe();
	});
}
