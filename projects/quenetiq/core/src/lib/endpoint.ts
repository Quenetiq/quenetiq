import { inject, InjectionToken, type Provider } from '@angular/core';
import { type Observable, switchMap, of } from 'rxjs';
import { GraphqlService, type GraphQLResult, type RequestOverrideConfig } from './graphql.service';
import { EndpointsService, type EndpointLifecycleHook, ENDPOINT_LIFECYCLE } from './endpoints.service';
import type { DocumentNode, TypedDocumentNode } from './gql';
import type { GraphqlCacheLike } from './quenetiq-config';
import type { InferResponse, InferVariables } from './types';
import type { EndpointRoute } from './endpoints-config';
import type { QuenetiqInjectOptions } from './inject-options';

export interface MutateEndpointOptions {
	optimistic?: (cache: GraphqlCacheLike) => string;
}

export class GraphqlEndpoint {
	private readonly overrideConfig: RequestOverrideConfig | undefined;
	private readonly lifecycle: EndpointLifecycleHook | null;

	constructor(
		private readonly graphql: GraphqlService,
		private readonly endpointUrl: string,
		private readonly routeHeaders?: Record<string, string | (() => string)>,
		config?: RequestOverrideConfig,
	) {
		this.overrideConfig = config;
		this.lifecycle = inject(ENDPOINT_LIFECYCLE, { optional: true }) ?? null;
	}

	get url(): string {
		return this.endpointUrl;
	}

	private withHooks<T>(
		name: string,
		route: EndpointRoute | undefined,
		fn: () => Observable<GraphQLResult<T>>,
	): Observable<GraphQLResult<T>> {
		if (!this.lifecycle) return fn();
		this.lifecycle.beforeEndpoint?.(name, route as EndpointRoute);
		const start = performance.now();
		return fn().pipe(
			switchMap((result) => {
				const durationMs = performance.now() - start;
				this.lifecycle!.afterEndpoint?.(name, route as EndpointRoute, durationMs);
				return of(result);
			}),
		);
	}

	private getRouteName(): string {
		const endpoints = inject(EndpointsService, { optional: true });
		if (!endpoints) return 'default';
		return endpoints.routeNames.find((n) => {
			const route = endpoints.getRoute(n);
			return route?.url === this.endpointUrl;
		}) ?? 'default';
	}

	query<
		TDocument extends DocumentNode | TypedDocumentNode<unknown, Record<string, unknown>>,
		TResponse = InferResponse<TDocument>,
		TVariables extends Record<string, unknown> = InferVariables<TDocument> extends Record<string, unknown>
			? InferVariables<TDocument>
			: Record<string, unknown>,
	>(
		document: TDocument,
		variables?: TVariables,
	): Observable<GraphQLResult<TResponse>> {
		const name = this.getRouteName();
		const endpoints = inject(EndpointsService, { optional: true });
		const route = endpoints?.getRoute(name);
		return this.withHooks(name, route, () =>
			this.graphql.query<TResponse, TVariables>(document, variables, this.endpointUrl, this.overrideConfig),
		);
	}

	mutate<
		TDocument extends DocumentNode | TypedDocumentNode<unknown, Record<string, unknown>>,
		TResponse = InferResponse<TDocument>,
		TVariables extends Record<string, unknown> = InferVariables<TDocument> extends Record<string, unknown>
			? InferVariables<TDocument>
			: Record<string, unknown>,
	>(
		document: TDocument,
		variables?: TVariables,
		options?: MutateEndpointOptions,
	): Observable<GraphQLResult<TResponse>> {
		const name = this.getRouteName();
		const endpoints = inject(EndpointsService, { optional: true });
		const route = endpoints?.getRoute(name);
		return this.withHooks(name, route, () =>
			this.graphql.mutate<TResponse, TVariables>(
				document, variables, this.endpointUrl,
				options?.optimistic, this.overrideConfig,
			),
		);
	}

	refetch<
		TDocument extends DocumentNode | TypedDocumentNode<unknown, Record<string, unknown>>,
		TResponse = InferResponse<TDocument>,
		TVariables extends Record<string, unknown> = InferVariables<TDocument> extends Record<string, unknown>
			? InferVariables<TDocument>
			: Record<string, unknown>,
	>(
		document: TDocument,
		variables?: TVariables,
	): Observable<GraphQLResult<TResponse>> {
		const name = this.getRouteName();
		const endpoints = inject(EndpointsService, { optional: true });
		const route = endpoints?.getRoute(name);
		return this.withHooks(name, route, () =>
			this.graphql.refetch<TResponse, TVariables>(
				document, variables, this.endpointUrl, this.overrideConfig,
			),
		);
	}

	poll<
		TDocument extends DocumentNode | TypedDocumentNode<unknown, Record<string, unknown>>,
		TResponse = InferResponse<TDocument>,
		TVariables extends Record<string, unknown> = InferVariables<TDocument> extends Record<string, unknown>
			? InferVariables<TDocument>
			: Record<string, unknown>,
	>(
		document: TDocument,
		intervalMs: number,
		variables?: TVariables,
	): Observable<GraphQLResult<TResponse>> {
		const name = this.getRouteName();
		const endpoints = inject(EndpointsService, { optional: true });
		const route = endpoints?.getRoute(name);
		return this.withHooks(name, route, () =>
			this.graphql.poll<TResponse, TVariables>(
				document, intervalMs, variables,
				this.endpointUrl, this.overrideConfig,
			),
		);
	}
}

const endpointTokens = new Map<string, InjectionToken<GraphqlEndpoint>>();

export function getEndpointToken(name: string): InjectionToken<GraphqlEndpoint> {
	if (!endpointTokens.has(name)) {
		endpointTokens.set(name, new InjectionToken<GraphqlEndpoint>(`ENDPOINT_${name}`));
	}
	return endpointTokens.get(name)!;
}

export function provideEndpoint(name: string, url: string): Provider[] {
	const token = getEndpointToken(name);
	return [
		{
			provide: token,
			useFactory: (graphql: GraphqlService) => new GraphqlEndpoint(graphql, url),
			deps: [GraphqlService],
		},
	];
}

export function injectEndpoint(name: string, di?: QuenetiqInjectOptions): GraphqlEndpoint {
	const token = getEndpointToken(name);
	const opts = di ?? {};
	return inject(token, opts)!;
}
