import { Observable } from 'rxjs';
import type { CacheEntity, CacheStore } from '@quenetiq/cache';

export function observeEntity<T extends CacheEntity = CacheEntity>(
	store: CacheStore,
	typename: string,
	id: string,
): Observable<T | undefined> {
	return new Observable<T | undefined>((subscriber) => {
		const emit = (): void => {
			try {
				const entity = store.query(typename, id) as T | undefined;
				subscriber.next(entity);
			} catch (e) {
				subscriber.error(e);
			}
		};

		emit();

		const unsub = store.events.on((event) => {
			if (
				event.type === 'write' &&
				event.data.entity.__typename === typename &&
				event.data.entity.id === id
			) {
				emit();
				return;
			}
			if (
				event.type === 'merge' &&
				event.data.entity.__typename === typename &&
				(('id' in event.data.entity && event.data.entity.id === id))
			) {
				emit();
				return;
			}
			if (event.type === 'evict' && event.data.typename === typename && event.data.id === id) {
				emit();
				return;
			}
		});

		return () => {
			unsub();
		};
	});
}
