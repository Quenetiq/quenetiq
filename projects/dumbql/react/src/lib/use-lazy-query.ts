import { useState, useCallback, useRef } from 'react';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, FetchPolicy, InferData, InferVars } from '@dumbql/client';
import { useClient } from './provider';

export interface UseLazyQueryOptions<TData, TVariables> {
	variables?: TVariables;
	fetchPolicy?: FetchPolicy;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
}

export interface UseLazyQueryResult<TData, TVariables> {
	data: TData | null;
	loading: boolean;
	error: string | null;
	errorCode?: ErrorCode;
	called: boolean;
	execute: (vars?: TVariables) => Promise<GraphQLResult<TData>>;
}

export function useLazyQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseLazyQueryOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseLazyQueryResult<InferData<TDocument>, InferVars<TDocument>> {
	type TData = InferData<TDocument>;
	type TVariables = InferVars<TDocument>;

	const client = useClient();

	const onCompletedRef = useRef(options?.onCompleted);
	const onErrorRef = useRef(options?.onError);
	onCompletedRef.current = options?.onCompleted;
	onErrorRef.current = options?.onError;

	const [result, setResult] = useState<GraphQLResult<TData> | null>(null);
	const [loading, setLoading] = useState(false);
	const [called, setCalled] = useState(false);

	const execute = useCallback(
		async (vars?: TVariables): Promise<GraphQLResult<TData>> => {
			setLoading(true);
			setCalled(true);

			const res = await client.query(
				document,
				vars ?? options?.variables,
				undefined,
				{ fetchPolicy: options?.fetchPolicy },
			);

			setResult(res);
			setLoading(false);

			if (res.status === 'success') {
				onCompletedRef.current?.(res.data);
			} else {
				onErrorRef.current?.(res.error, res.errorCode);
			}

			return res;
		},
		[client, document, options?.variables, options?.fetchPolicy],
	);

	const data = result?.status === 'success' ? result.data : null;
	const error = result?.status === 'error' ? result.error : null;
	const errorCode = result?.status === 'error' ? result.errorCode : undefined;

	return { data, loading, error, errorCode, called, execute };
}
