import { inject } from '@angular/core';
import { defer, Observable, timer, switchMap } from 'rxjs';
import { GraphqlService, type GraphQLResult } from './graphql.service';
import type { DocumentNode, TypedDocumentNode, TypedQueryString } from './gql';

export function poll<TResponse, TVariables extends Record<string, unknown> = Record<string, unknown>>(
	document: TypedQueryString<TResponse, TVariables> | DocumentNode | TypedDocumentNode<TResponse, TVariables>,
	intervalMs: number,
	variables?: TVariables,
): Observable<GraphQLResult<TResponse>> {
	return defer(() => {
		const svc = inject(GraphqlService);
		return timer(0, intervalMs).pipe(switchMap(() => svc.refetch<TResponse, TVariables>(document, variables)));
	});
}
