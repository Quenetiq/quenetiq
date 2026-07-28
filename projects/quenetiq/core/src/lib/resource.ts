import { resource, type ResourceRef } from '@angular/core';
import { lastValueFrom, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type { DocumentNode, TypedDocumentNode } from './gql';
import { GraphqlService } from './graphql.service';

export interface GraphqlResourceOptions<TData, TVariables extends Record<string, unknown>> {
	client: GraphqlService;
	params: () => TVariables | undefined;
	query: DocumentNode | TypedDocumentNode<TData, TVariables>;
	id?: string;
	defaultValue?: TData;
}

export function graphqlResource<TData, TVariables extends Record<string, unknown>>(
	options: GraphqlResourceOptions<TData, TVariables>,
): ResourceRef<TData> {
	return resource({
		...(options.defaultValue !== undefined && { defaultValue: options.defaultValue }),
		id: options.id,
		params: options.params,
		loader: ({ params, abortSignal }) => {
			return lastValueFrom(
				options.client.query<TData>(options.query, params).pipe(takeUntil(fromEvent(abortSignal, 'abort'))),
			).then((result) => {
				if (result.status === 'error') {
					throw new Error(result.error);
				}
				return result.data;
			});
		},
	}) as ResourceRef<TData>;
}
