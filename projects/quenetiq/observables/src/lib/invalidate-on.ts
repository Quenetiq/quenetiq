import { Observable, type MonoTypeOperatorFunction } from 'rxjs';
import type { CacheEntity, CacheStore } from '@quenetiq/cache';

export function invalidateOn<T>(
	store: CacheStore,
	typename: string,
	id: string,
): MonoTypeOperatorFunction<T> {
	return (source) =>
		new Observable<T>((subscriber) => {
			let latestValue: T | undefined;
			let sourceCompleted = false;
			let sourceSubscription: (() => void) | undefined;

			const subscribeToSource = (): void => {
				const sub = source.subscribe({
					next: (value) => {
						latestValue = value;
						subscriber.next(value);
					},
					error: (err) => subscriber.error(err),
					complete: () => {
						sourceCompleted = true;
						if (!cacheUnsub) subscriber.complete();
					},
				});
				sourceSubscription = () => sub.unsubscribe();
			};

			const cacheUnsub = store.events.on((event) => {
				if (sourceCompleted) return;

				const shouldInvalidate =
					(event.type === 'write' || event.type === 'merge') &&
					event.data.entity.__typename === typename &&
					('id' in event.data.entity && event.data.entity.id === id);

				if (shouldInvalidate) {
					if (sourceSubscription) {
						sourceSubscription();
						sourceSubscription = undefined;
					}
					subscribeToSource();
				}
			});

			subscribeToSource();

			return () => {
				if (sourceSubscription) sourceSubscription();
				cacheUnsub();
			};
		});
}
