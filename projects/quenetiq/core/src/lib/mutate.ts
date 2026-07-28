import { inject, type Signal } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { GraphqlService, type GraphQLResult, type RequestOverrideConfig, type RefetchQueryDef } from './graphql.service';
import { EndpointsService } from './endpoints.service';
import type { DocumentNode, TypedDocumentNode, TypedQueryString } from './gql';
import type { GraphqlCacheLike } from './quenetiq-config';
import type { GraphqlMiddleware } from './middleware';
import type { InferResponse, InferVariables, InferEndpointNames } from './types';
import type { EndpointsYaml } from './endpoints-config';

export type MutateEndpointParam<Yaml extends EndpointsYaml | undefined = undefined> =
	[Yaml] extends [EndpointsYaml]
		? InferEndpointNames<Yaml>
		: string | Signal<string>;

interface EntityRef {
	__typename: string;
	id: string;
}

function extractEntitiesFromData(data: unknown): EntityRef[] {
	const entities: EntityRef[] = [];
	if (!data || typeof data !== 'object') return entities;
	if (Array.isArray(data)) {
		for (const item of data) entities.push(...extractEntitiesFromData(item));
		return entities;
	}
	const obj = data as Record<string, unknown>;
	if (typeof obj['__typename'] === 'string' && (typeof obj['id'] === 'string' || typeof obj['id'] === 'number')) {
		entities.push({ __typename: obj['__typename'] as string, id: String(obj['id']) });
	}
	for (const v of Object.values(obj)) {
		if (v && typeof v === 'object') entities.push(...extractEntitiesFromData(v));
	}
	return entities;
}

export interface MutateOptions<TData = unknown> {
	/** @deprecated Use optimisticResponse instead. Callback-based optimistic. */
	readonly optimistic?: (cache: GraphqlCacheLike) => string;
	/** Simpler API: pass the expected mutation response to apply optimistic entities. */
	readonly optimisticResponse?: TData;
	/** Re-execute these queries after a successful mutation. */
	readonly refetchQueries?: readonly RefetchQueryDef[];
}

export function mutate<
	TDocument extends TypedQueryString<unknown, Record<string, unknown>>
		| DocumentNode
		| TypedDocumentNode<unknown, Record<string, unknown>>,
	TResponse = InferResponse<TDocument>,
	TVariables extends Record<string, unknown> = InferVariables<TDocument> extends Record<string, unknown>
		? InferVariables<TDocument>
		: Record<string, unknown>,
>(
	document: TDocument,
	endpoint?: MutateEndpointParam,
	variables?: TVariables,
	options?: MutateOptions<TResponse>,
): Observable<GraphQLResult<TResponse>> {
	return defer(() => {
		const svc = inject(GraphqlService);
		const endpoints = inject(EndpointsService, { optional: true });

		let epName = typeof endpoint === 'string' ? endpoint : undefined;

		if (endpoints) {
			epName = endpoints.throwIfMultiEndpointMissing(epName);
		}

		let url: string | undefined;
		let overrideCfg: RequestOverrideConfig | undefined;
		if (epName && endpoints) {
			const route = endpoints.getRoute(epName);
			url = route?.url;
			if (route) {
				const has = route.middleware || route.errorPolicy ||
					route.retryCount !== undefined || route.retryDelay !== undefined;
				if (has) {
					overrideCfg = {
						middleware: route.middleware?.filter((m): m is GraphqlMiddleware => typeof m !== 'string'),
						errorPolicy: route.errorPolicy,
						retryCount: route.retryCount,
						retryDelay: route.retryDelay,
					};
				}
			}
		}

		const optimistic: ((cache: GraphqlCacheLike) => string) | undefined = options?.optimistic
			?? (options?.optimisticResponse
				? (cache: GraphqlCacheLike) => {
					const entities = extractEntitiesFromData(options.optimisticResponse);
					if (entities.length === 0) return '';
					const id = `optimistic:${Date.now()}:${Math.random().toString(36).slice(2)}`;
					return cache.applyOptimistic({ id, entities });
				}
				: undefined);

		return svc.mutate<TResponse, TVariables>(
			document as TypedDocumentNode<TResponse, TVariables>, variables, url, optimistic, overrideCfg,
			options?.refetchQueries,
		);
	});
}
