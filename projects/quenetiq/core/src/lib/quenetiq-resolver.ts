import { inject } from '@angular/core';
import { type ActivatedRoute, type ActivatedRouteSnapshot, type ResolveFn, type Route } from '@angular/router';
import { type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GraphqlService, type GraphQLResult } from './graphql.service';
import { type DocumentNode, type TypedDocumentNode } from './gql';

export interface PrefetchDefinition<TVariables extends Record<string, unknown> = Record<string, unknown>> {
	document: DocumentNode | TypedDocumentNode<unknown, TVariables>;
	variables?: TVariables | ((route: ActivatedRouteSnapshot) => TVariables);
}

export type PrefetchDefinitions = PrefetchDefinition | PrefetchDefinition[];

function resolveVariables<TVars extends Record<string, unknown>>(
	def: PrefetchDefinition<TVars>,
	route: ActivatedRouteSnapshot,
): TVars | undefined {
	return typeof def.variables === 'function'
		? (def.variables as (r: ActivatedRouteSnapshot) => TVars)(route)
		: def.variables;
}

function prefetchResolverFn(def: PrefetchDefinition): ResolveFn<GraphQLResult<unknown>> {
	return (route) => {
		const graphql = inject(GraphqlService);
		return graphql.query(def.document, resolveVariables(def, route));
	};
}

export function prefetchedRoute(route: Route, prefetch: PrefetchDefinitions): Route {
	const defs = Array.isArray(prefetch) ? prefetch : [prefetch];
	const resolve: Record<string, ResolveFn<GraphQLResult<unknown>>> = {};
	for (const def of defs) {
		const name = extractQueryName(def.document) ?? `graphql_${Object.keys(resolve).length}`;
		resolve[name] = prefetchResolverFn(def);
	}
	return { ...route, resolve: { ...route.resolve, ...resolve } };
}

export function fromPrefetched<T>(route: ActivatedRoute, key: string): Observable<GraphQLResult<T>> {
	return route.data.pipe(map((d) => d[key] as GraphQLResult<T>));
}

function extractQueryName(doc: DocumentNode): string | null {
	for (const def of doc.definitions) {
		if (def.kind === 'OperationDefinition' && def.name?.value) {
			return def.name.value;
		}
	}
	return null;
}
