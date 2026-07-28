import { inject } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { GraphqlService, type GraphQLResult } from './graphql.service';
import type { DocumentNode, TypedDocumentNode, TypedQueryString } from './gql';

export function injectPrefetch<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
	document: TypedQueryString<TData, TVariables> | DocumentNode | TypedDocumentNode<TData, TVariables>,
): (variables?: TVariables) => Observable<GraphQLResult<TData>> {
	return (variables?: TVariables) =>
		defer(() => {
			const graphql = inject(GraphqlService);
			return graphql.query<TData>(document, variables);
		});
}
