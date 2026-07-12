import { type ReactNode } from 'react';
import { useMutation, type UseMutationOptions, type UseMutationResult } from './use-mutation';
import type { DocumentNode, TypedDocumentNode, InferData, InferVars } from '@dumbql/client';
import type { GraphQLResult } from '@dumbql/client';

export interface MutationProps<TDocument extends DocumentNode | TypedDocumentNode> {
  document: TDocument;
  variables?: InferVars<TDocument>;
  update?: (result: GraphQLResult<InferData<TDocument>>) => void;
  children: (mutate: UseMutationResult<InferData<TDocument>, InferVars<TDocument>>['mutate'], result: UseMutationResult<InferData<TDocument>, InferVars<TDocument>>) => ReactNode;
}

export function Mutation<TDocument extends DocumentNode | TypedDocumentNode>({
  document,
  variables,
  update,
  children,
}: MutationProps<TDocument>): ReactNode {
  const options: UseMutationOptions<InferData<TDocument>, InferVars<TDocument>> = {};
  if (variables !== undefined) options.variables = variables;
  if (update !== undefined) {
    options.update = (_cache, result) => {
      update(result);
    };
  }

  const result = useMutation(document, options);
  return children(result.mutate, result);
}
