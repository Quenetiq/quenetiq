import { Injectable, inject } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { print, type DocumentNode, type QuenetiqConfig, QUENETIQ_CONFIG } from '@quenetiq/core';
import { GraphqlSubscription } from './graphql-subscription';
import { SUBSCRIPTIONS_CONFIG } from './subscriptions-config';

@Injectable({ providedIn: 'root' })
export class GraphqlSubscriptionService {
	private readonly config: QuenetiqConfig =
		inject(QUENETIQ_CONFIG, { optional: true }) ?? ({ endpoint: '/graphql' } as QuenetiqConfig);

	private readonly subsConfig = inject(SUBSCRIPTIONS_CONFIG, { optional: true });

	private readonly core = new GraphqlSubscription(this.subsConfig?.wsUrl ?? this.config.endpoint ?? '/graphql');

	subscribe<T>(document: DocumentNode, variables?: Record<string, unknown>): Observable<T> {
		const query = print(document);
		const { reconnect, reconnectInterval, maxReconnectAttempts } = this.subsConfig ?? {};

		if (!reconnect) {
			return new Observable<T>((subscriber: Subscriber<T>) => {
				const unsubscribe = this.core.subscribe<T>(query, variables, {
					next: (data) => subscriber.next(data),
					error: (err) => subscriber.error(err),
					complete: () => subscriber.complete(),
				});
				return () => unsubscribe();
			});
		}

		const baseInterval = reconnectInterval ?? 2000;
		const maxAttempts = maxReconnectAttempts ?? 5;

		return new Observable<T>((subscriber: Subscriber<T>) => {
			let currentUnsubscribe: (() => void) | null = null;
			let attempt = 0;
			let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
			let destroyed = false;

			const connect = () => {
				if (destroyed) return;

				currentUnsubscribe = this.core.subscribe<T>(query, variables, {
					next: (data) => subscriber.next(data),
					error: (err) => subscriber.error(err),
					complete: () => {
						if (!destroyed && attempt < maxAttempts) {
							const delay = baseInterval * Math.pow(2, attempt) + Math.random() * 1000;
							attempt++;
							reconnectTimer = setTimeout(connect, delay);
						} else if (!destroyed) {
							subscriber.complete();
						}
					},
				});
			};

			connect();

			return () => {
				destroyed = true;
				if (reconnectTimer) clearTimeout(reconnectTimer);
				if (currentUnsubscribe) currentUnsubscribe();
			};
		});
	}
}
