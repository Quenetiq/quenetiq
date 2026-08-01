import { inject, Injector, signal, isSignal, type Signal, type WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { type Observable, Subject, switchMap, NEVER, share, ReplaySubject, startWith, distinctUntilChanged, of, map as rxMap, takeUntil } from 'rxjs';
import { GraphqlService, type GraphQLResult, type RequestOverrideConfig } from './graphql.service';
import { EndpointsService } from './endpoints.service';
import type { GraphqlMiddleware } from './middleware';
import type { DocumentNode, TypedDocumentNode, TypedQueryString } from './gql';
import type { InferResponse, InferVariables, InferEndpointNames } from './types';
import type { EndpointsYaml } from './endpoints-config';
import type { QuenetiqInjectOptions } from './inject-options';

export type AbortQueryEndpointParam<Yaml extends EndpointsYaml | undefined = undefined> =
	[Yaml] extends [EndpointsYaml]
		? InferEndpointNames<Yaml>
		: string | Signal<string>;

export interface AbortQueryOptions extends QuenetiqInjectOptions {
	/** Whether to auto-abort on component destroy. Default: true */
	readonly autoAbort?: boolean;
}

export interface AbortQueryHandle<T> {
	/** Stream of query results */
	readonly result$: Observable<GraphQLResult<T>>;
	/** Toggle query execution. Set `false` to cancel in-flight requests. */
	readonly enabled: WritableSignal<boolean>;
	/** Force re-execution of the query */
	readonly refetch: () => void;
	/** Abort the current in-flight request */
	readonly abort: () => void;
	/** Signal: current data value */
	readonly data: Signal<T | undefined>;
	/** Signal: current error message */
	readonly error: Signal<string | undefined>;
	/** Signal: whether a query is in flight */
	readonly loading: Signal<boolean>;
	/** Signal: current status of the query */
	readonly status: Signal<'idle' | 'loading' | 'success' | 'error'>;
	/** Signal: whether the request was aborted */
	readonly aborted: Signal<boolean>;
}

export function abortQuery<
	TDocument extends TypedQueryString<unknown, Record<string, unknown>>
		| DocumentNode
		| TypedDocumentNode<unknown, Record<string, unknown>>,
	TResponse = InferResponse<TDocument>,
	TVariables extends Record<string, unknown> = InferVariables<TDocument> extends Record<string, unknown>
		? InferVariables<TDocument>
		: Record<string, unknown>,
>(
	document: TDocument,
	endpoint?: AbortQueryEndpointParam,
	variables?: TVariables,
	options?: AbortQueryOptions,
): AbortQueryHandle<TResponse> {
	const graphql = inject(GraphqlService);
	const injector = inject(Injector);
	const endpoints = inject(EndpointsService, { optional: true, ...options });
	const enabled = signal(true);
	const refetch$ = new Subject<void>();
	const destroy$ = new Subject<void>();

	let currentController: AbortController | null = null;

	let resolvedName: string | undefined;
	if (endpoints) {
		const name = isSignal(endpoint) ? endpoint() : (typeof endpoint === 'string' ? endpoint : undefined);
		resolvedName = endpoints.throwIfMultiEndpointMissing(name);
	}

	const resolveUrl = (epName?: string): string | undefined => {
		if (epName && endpoints) {
			return endpoints.getRoute(epName)?.url;
		}
		return undefined;
	};

	const resolveOverride = (epName?: string): RequestOverrideConfig | undefined => {
		if (!epName || !endpoints) return undefined;
		const route = endpoints.getRoute(epName);
		if (!route) return undefined;
		const hasOverride = route.middleware ?? route.errorPolicy ??
			(route.retryCount !== undefined || route.retryDelay !== undefined);
		return hasOverride ? {
			middleware: route.middleware?.filter((m): m is GraphqlMiddleware => typeof m !== 'string'),
			errorPolicy: route.errorPolicy,
			retryCount: route.retryCount,
			retryDelay: route.retryDelay,
		} : undefined;
	};

	let endpoint$: Observable<string | undefined>;
	if (isSignal(endpoint)) {
		endpoint$ = toObservable(endpoint, { injector }).pipe(
			distinctUntilChanged(),
			rxMap((name) => resolveUrl(name)),
		);
	} else if (typeof endpoint === 'string') {
		endpoint$ = of(resolveUrl(endpoint));
	} else if (resolvedName) {
		endpoint$ = of(resolveUrl(resolvedName));
	} else {
		endpoint$ = of(undefined);
	}

	const override$ = isSignal(endpoint)
		? toObservable(endpoint, { injector }).pipe(
			distinctUntilChanged(),
			rxMap((name) => resolveOverride(name)),
		)
		: of(resolveOverride(typeof endpoint === 'string' ? endpoint : resolvedName));

	const result$ = toObservable(enabled, { injector }).pipe(
		distinctUntilChanged(),
		switchMap((isEnabled) => {
			if (!isEnabled) return NEVER;
			return refetch$.pipe(
				startWith(undefined),
				switchMap(() => endpoint$.pipe(
					switchMap((url) => override$.pipe(
						switchMap((overrideCfg) => {
							currentController?.abort();
							currentController = new AbortController();
							const doc = document as TypedDocumentNode<TResponse, Record<string, unknown>>;
							return graphql.query<TResponse>(doc, variables, url, overrideCfg)
								.pipe(takeUntil(destroy$));
						}),
					)),
				)),
			);
		}),
		share({ connector: () => new ReplaySubject(1) }),
	);

	const statusSignal = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
	const dataSignal = signal<TResponse | undefined>(undefined);
	const errorSignal = signal<string | undefined>(undefined);
	const loadingSignal = signal(false);
	const abortedSignal = signal(false);

	result$.subscribe({
		next: (result) => {
			loadingSignal.set(false);
			abortedSignal.set(false);
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
		abort: () => {
			currentController?.abort();
			abortedSignal.set(true);
			loadingSignal.set(false);
		},
		data: dataSignal.asReadonly(),
		error: errorSignal.asReadonly(),
		loading: loadingSignal.asReadonly(),
		status: statusSignal.asReadonly(),
		aborted: abortedSignal.asReadonly(),
	};
}
