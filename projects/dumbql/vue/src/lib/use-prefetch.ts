import type { DocumentNode, TypedDocumentNode, GraphQLResult, InferData, InferVars } from '@dumbql/client';
import { useClient } from './plugin';

export function usePrefetch<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
): (variables?: InferVars<TDocument>) => Promise<GraphQLResult<InferData<TDocument>>> {
	const client = useClient();
	return (variables?: InferVars<TDocument>) => client.query(document, variables);
}
