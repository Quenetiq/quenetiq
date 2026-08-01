import { inject, Injector, signal, isSignal, type Signal, type WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { type Observable, Subject, switchMap, NEVER, share, ReplaySubject, startWith, distinctUntilChanged, of, map as rxMap, timer, takeUntil } from 'rxjs';
import { GraphqlService, type GraphQLResult } from './graphql.service';
import { EndpointsService } from './endpoints.service';
import type { DocumentNode, TypedDocumentNode, TypedQueryString } from './gql';
import type { InferResponse, InferVariables, InferEndpointNames } from './types';
import type { EndpointsYaml } from './endpoints-config';
import type { QuenetiqInjectOptions } from './inject-options';

export type RefetchIntervalEndpointParam<Yaml extends EndpointsYaml | undefined = undefined> =
	[Yaml] extends [EndpointsYaml]
		? InferEndpointNames<Yaml>
		: string | Signal<string>;

export interface RefetchIntervalOptions extends QuenetiqInjectOptions {
	/** Polling interval in ms. Set 0 or undefined to disable. */
	readonly intervalMs?: number | Signal<number>;
}

export interface RefetchIntervalHandle<T> {
	/** Stream of query results */
	readonly result$: Observable<GraphQLResult<T>>;
	/** Toggle query execution */
	readonly enabled: WritableSignal<boolean>;
	/** Force re-execution of the query */
	readonly refetch: () => void;
	/** Change polling interval at runtime */
	readonly setIntervalMs: (ms: number) => void;
	/** Signal: current data value */
	readonly data: Signal<T | undefined>;
	/** Signal: current error message */
	readonly error: Signal<string | undefined>;
	/** Signal: whether a query is in flight */
	readonly loading: Signal<boolean>;
	/** Signal: current status of the query */
	readonly status: Signal<'idle' | 'loading' | 'success' | 'error'>;
}

export function refetchInterval<
	TDocument extends TypedQueryString<unknown, Record<string, unknown>>
		| DocumentNode
		| TypedDocumentNode<unknown, Record<string, unknown>>,
	TResponse = InferResponse<TDocument>,
	TVariables extends Record<string, unknown> = InferVariables<TDocument> extends Record<string, unknown>
		? InferVariables<TDocument>
		: Record<string, unknown>,
>(
	document: TDocument,
	endpoint?: RefetchIntervalEndpointParam,
	variables?: TVariables,
	options?: RefetchIntervalOptions,
): RefetchIntervalHandle<TResponse> {
	const graphql = inject(GraphqlService);
	const injector = inject(Injector);
	const endpoints = inject(EndpointsService, { optional: true, ...options });
	const enabled = signal(true);
	const refetch$ = new Subject<void>();
	const destroy$ = new Subject<void>();
	const initialInterval = typeof options?.intervalMs === 'number' ? options.intervalMs : 0;
	const intervalMsSignal = signal(initialInterval);

	let endpoint$: Observable<string | undefined>;
	if (isSignal(endpoint)) {
		endpoint$ = toObservable(endpoint, { injector }).pipe(
			distinctUntilChanged(),
			rxMap((name) => {
				if (name && endpoints) {
					return endpoints.getRoute(name)?.url;
				}
				return undefined;
			}),
		);
	} else if (typeof endpoint === 'string') {
		const url = endpoints?.getRoute(endpoint)?.url;
		endpoint$ = of(url);
	} else {
		endpoint$ = of(undefined);
	}

	const result$ = toObservable(enabled, { injector }).pipe(
		distinctUntilChanged(),
		switchMap((isEnabled) => {
			if (!isEnabled) return NEVER;
			return toObservable(intervalMsSignal, { injector }).pipe(
				distinctUntilChanged(),
				switchMap((rawIntervalMs) => {
					const intervalMs = rawIntervalMs;
					if (intervalMs <= 0) {
						return refetch$.pipe(
							startWith(undefined),
							switchMap(() => endpoint$.pipe(
								switchMap((url) => {
									const doc = document as TypedDocumentNode<TResponse, Record<string, unknown>>;
									return graphql.query<TResponse>(doc, variables, url)
										.pipe(takeUntil(destroy$));
								}),
							)),
						);
					}
					return timer(0, intervalMs).pipe(
						switchMap(() => refetch$.pipe(
							startWith(undefined),
							switchMap(() => endpoint$.pipe(
								switchMap((url) => {
									const doc = document as TypedDocumentNode<TResponse, Record<string, unknown>>;
									return graphql.query<TResponse>(doc, variables, url)
										.pipe(takeUntil(destroy$));
								}),
							)),
						)),
					);
				}),
			);
		}),
		share({ connector: () => new ReplaySubject(1) }),
	);

	const statusSignal = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
	const dataSignal = signal<TResponse | undefined>(undefined);
	const errorSignal = signal<string | undefined>(undefined);
	const loadingSignal = signal(false);

	result$.subscribe({
		next: (result) => {
			loadingSignal.set(false);
			if (result.status === 'success') {
				statusSignal.set('success');
				dataSignal.set(result.data);
				errorSignal.set(undefined);
			} else {
				statusSignal.set('error');
				dataSignal.set(undefined);
				errorSignal.set(result.error);
			}
		},
		error: () => {
			loadingSignal.set(false);
			statusSignal.set('error');
			errorSignal.set('Query subscription error');
		},
	});

	return {
		result$,
		enabled,
		refetch: () => refetch$.next(),
		setIntervalMs: (ms: number) => intervalMsSignal.set(ms),
		data: dataSignal.asReadonly(),
		error: errorSignal.asReadonly(),
		loading: loadingSignal.asReadonly(),
		status: statusSignal.asReadonly(),
	};
}
