import { Observable } from 'rxjs';
import type { CacheStore } from '@quenetiq/cache';

export function watchEntity<T extends Record<string, unknown>>(
	store: CacheStore,
	typename: string,
	id: string,
): Observable<T | null> {
	return new Observable<T | null>((subscriber) => {
		const entity = store.cache?.get(typename, id) as T | undefined;
		subscriber.next(entity ?? null);

		const unsub = store.events.on((event) => {
			if (event.type === 'write') {
				if (event.data.entity.__typename === typename && event.data.entity.id === id) {
					subscriber.next(event.data.entity as T);
				}
			}
			if (event.type === 'merge') {
				if (event.data.entity.__typename === typename && event.data.entity.id === id) {
					const merged = store.cache?.get(typename, id) as T | undefined;
					subscriber.next(merged ?? null);
				}
			}
			if (event.type === 'evict') {
				if (event.data.typename === typename && event.data.id === id) {
					subscriber.next(null);
				}
			}
		});

		return () => unsub();
	});
}
