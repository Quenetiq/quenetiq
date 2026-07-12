import { type ReactNode } from 'react';
import { useSubscription, type UseSubscriptionOptions, type UseSubscriptionResult } from './use-subscription';
import type { DocumentNode, TypedDocumentNode, InferData } from '@dumbql/client';

export interface SubscriptionProps<TDocument extends DocumentNode | TypedDocumentNode> {
  document: TDocument;
  variables?: Record<string, unknown>;
  wsEndpoint?: string;
  shouldSubscribe?: boolean;
  children: (result: UseSubscriptionResult<InferData<TDocument>>) => ReactNode;
}

export function Subscription<TDocument extends DocumentNode | TypedDocumentNode>({
  document,
  variables,
  wsEndpoint,
  shouldSubscribe,
  children,
}: SubscriptionProps<TDocument>): ReactNode {
  const options: UseSubscriptionOptions<InferData<TDocument>> = {
    variables,
    wsEndpoint,
    shouldSubscribe,
  };
  const result = useSubscription(document, options);
  return children(result);
}
