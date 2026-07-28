import { inject } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { EndpointsService } from './endpoints.service';
import { print, type DocumentNode } from './gql';
import { GqlSubscriptionWsClient } from './gql-subscription-impl';

/**
 * Resolve the WebSocket URL for a subscription based on the endpoint name.
 *
 * In multi-endpoint mode, looks up the route's URL and converts it to a WS URL.
 *
 * @example
 * ```typescript
 * const wsUrl = resolveSubscriptionUrl('main');
 * // => 'ws://localhost:4000/graphql'
 * ```
 */
export function resolveSubscriptionUrl(endpointName: string): string | undefined {
	const endpoints = inject(EndpointsService, { optional: true });
	if (!endpoints) return undefined;

	const route = endpoints.getRoute(endpointName);
	if (!route) return undefined;

	return route.url
		.replace(/^https:\/\//, 'wss://')
		.replace(/^http:\/\//, 'ws://');
}

/**
 * Multi-endpoint aware subscription factory.
 * Creates a subscription Observable that resolves the WebSocket URL from the
 * named endpoint at injection time.
 *
 * @example
 * ```typescript
 * const payments$ = subscribeTo('payments', PAYMENTS_SUBSCRIPTION);
 * payments$.subscribe(data => console.log(data));
 * ```
 */
export function subscribeTo<T>(
	endpointName: string | undefined,
	document: DocumentNode,
	variables?: Record<string, unknown>,
): Observable<T> {
	return defer(() => {
		const endpoints = inject(EndpointsService, { optional: true });

		let resolvedName: string | undefined = endpointName;
		if (endpoints) {
			resolvedName = endpoints.throwIfMultiEndpointMissing(endpointName);
		}

		if (!resolvedName) {
			throw new Error(
				'Quenetiq: subscribeTo() requires an endpoint name when multiEndpoint is enabled.',
			);
		}

		const wsUrl = resolveSubscriptionUrl(resolvedName);
		if (!wsUrl) {
			throw new Error(
				`Quenetiq: Cannot resolve subscription URL for endpoint "${resolvedName}". ` +
					'Make sure provideMultiEndpoint() is configured with the endpoint.',
			);
		}

		const core = new GqlSubscriptionWsClient(wsUrl);
		const query = print(document);

		return new Observable<T>((subscriber) => {
			const unsubscribe = core.subscribe<T>(query, {
				next: (data: T) => subscriber.next(data),
				error: (err: unknown) => subscriber.error(err),
				complete: () => subscriber.complete(),
			}, variables);
			return () => unsubscribe();
		});
	});
}
