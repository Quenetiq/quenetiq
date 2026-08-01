import { useCallback } from 'react';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, InferData, InferVars } from '@quenetiq/client';
import { useClient } from './provider';

export function usePrefetch<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
): (variables?: InferVars<TDocument>) => Promise<GraphQLResult<InferData<TDocument>>> {
	const client = useClient();
	return useCallback(
		(variables?: InferVars<TDocument>) => client.query(document, variables),
		[client, document],
	);
}
