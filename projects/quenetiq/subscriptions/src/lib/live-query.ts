import { inject } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { print, type DocumentNode, type QuenetiqConfig, QUENETIQ_CONFIG } from '@quenetiq/core';
import { GraphqlLiveQuery } from './graphql-live-query';
import { SUBSCRIPTIONS_CONFIG } from './subscriptions-config';

export function injectLiveQuery<T>(document: DocumentNode, variables?: Record<string, unknown>): Observable<T> {
	return defer(() => {
		const config: QuenetiqConfig = inject(QUENETIQ_CONFIG, { optional: true }) ?? { endpoint: '/graphql' };
		const subsConfig = inject(SUBSCRIPTIONS_CONFIG, { optional: true });

		const endpoint = subsConfig?.wsUrl ?? config.endpoint ?? '/graphql';
		const liveQuery = new GraphqlLiveQuery(endpoint);
		const queryStr = print(document);

		return new Observable<T>((subscriber) => {
			let wsUnsub: (() => void) | null = null;
			let completed = false;

			liveQuery
				.execute<T>(queryStr, variables, {
					next: (data) => {
						if (!completed) subscriber.next(data);
					},
					error: (err) => {
						if (!completed) subscriber.error(err);
					},
					complete: () => {
						if (!completed) subscriber.complete();
					},
				})
				.then((unsub) => {
					if (completed) {
						unsub();
					} else {
						wsUnsub = unsub;
					}
				});

			return () => {
				completed = true;
				if (wsUnsub) wsUnsub();
			};
		});
	});
}
