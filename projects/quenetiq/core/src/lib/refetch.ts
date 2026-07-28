import { inject } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { GraphqlService, type GraphQLResult } from './graphql.service';
import type { DocumentNode, TypedDocumentNode, TypedQueryString } from './gql';

export function refetch<TResponse, TVariables extends Record<string, unknown> = Record<string, unknown>>(
	document: TypedQueryString<TResponse, TVariables> | DocumentNode | TypedDocumentNode<TResponse, TVariables>,
	variables?: TVariables,
): Observable<GraphQLResult<TResponse>> {
	return defer(() => {
		const svc = inject(GraphqlService);
		return svc.refetch<TResponse, TVariables>(document, variables);
	});
}
