import { type ReactNode } from 'react';
import { useQuery, type UseQueryOptions, type UseQueryResult } from './use-query';
import type { DocumentNode, TypedDocumentNode, InferData, InferVars } from '@dumbql/client';

export interface QueryProps<TDocument extends DocumentNode | TypedDocumentNode> {
  document: TDocument;
  variables?: InferVars<TDocument>;
  pollInterval?: number;
  skip?: boolean;
  children: (result: UseQueryResult<InferData<TDocument>, InferVars<TDocument>>) => ReactNode;
}

export function Query<TDocument extends DocumentNode | TypedDocumentNode>({
  document,
  variables,
  pollInterval,
  skip,
  children,
}: QueryProps<TDocument>): ReactNode {
  const options: UseQueryOptions<InferData<TDocument>, InferVars<TDocument>> = {};
  if (variables !== undefined) options.variables = variables;
  if (pollInterval !== undefined) options.pollInterval = pollInterval;
  if (skip !== undefined) options.skip = skip;

  const result = useQuery(document, options);
  return children(result);
}
