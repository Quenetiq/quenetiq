import { useState, useCallback, useRef } from 'react';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, InferData, InferVars } from '@dumbql/client';
import type { CacheStore } from '@dumbql/cache';
import { useClient, useCache } from './provider';

export interface UseMutationOptions<TData, TVariables> {
	variables?: TVariables;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
	update?: (cache: CacheStore, result: GraphQLResult<TData>) => void;
	optimistic?: (cache: CacheStore) => string;
}

export type UseMutationFn<TData, TVariables> = (variables?: TVariables) => Promise<GraphQLResult<TData>>;

export interface UseMutationResult<TData, TVariables> {
	data: TData | null;
	loading: boolean;
	error: string | null;
	errorCode?: ErrorCode;
	called: boolean;
	mutate: UseMutationFn<TData, TVariables>;
}

export function useMutation<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseMutationOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseMutationResult<InferData<TDocument>, InferVars<TDocument>> {
	type TData = InferData<TDocument>;
	type TVariables = InferVars<TDocument>;

	const client = useClient();
	const cache = useCache();
	const [result, setResult] = useState<GraphQLResult<TData> | null>(null);
	const [loading, setLoading] = useState(false);
	const [called, setCalled] = useState(false);

	const onCompletedRef = useRef(options?.onCompleted);
	const onErrorRef = useRef(options?.onError);
	const updateRef = useRef(options?.update);
	onCompletedRef.current = options?.onCompleted;
	onErrorRef.current = options?.onError;
	updateRef.current = options?.update;

	const optimisticIdRef = useRef<string | null>(null);

	const mutate = useCallback<UseMutationFn<TData, TVariables>>(
		async (variables?: TVariables) => {
			setLoading(true);
			setCalled(true);

			if (cache && options?.optimistic) {
				optimisticIdRef.current = options.optimistic(cache);
			}

			const opts = options?.variables as TVariables | undefined;
			const res = await client.mutate(document, variables ?? opts);
			setResult(res);
			setLoading(false);

			if (res.status === 'success') {
				onCompletedRef.current?.(res.data);
				if (cache && updateRef.current) {
					updateRef.current(cache, res);
				}
				if (cache && optimisticIdRef.current) {
					cache.commitOptimistic(optimisticIdRef.current);
					optimisticIdRef.current = null;
				}
			} else {
				onErrorRef.current?.(res.error, res.errorCode);
				if (cache && optimisticIdRef.current) {
					cache.rollbackOptimistic(optimisticIdRef.current);
					optimisticIdRef.current = null;
				}
			}

			return res;
		},
		[client, document, cache, options?.variables, options?.optimistic],
	);

	const data = result?.status === 'success' ? result.data : null;
	const error = result?.status === 'error' ? result.error : null;
	const errorCode = result?.status === 'error' ? result.errorCode : undefined;

	return { data, loading, error, errorCode, called, mutate };
}
