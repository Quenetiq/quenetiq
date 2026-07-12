import { useState, useEffect, useCallback, useRef } from 'react';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, FetchPolicy, InferData, InferVars } from '@dumbql/client';
import { useClient } from './provider';

export type { FetchPolicy };

export interface UseQueryOptions<TData, TVariables> {
	variables?: TVariables;
	pollInterval?: number;
	skip?: boolean;
	fetchPolicy?: FetchPolicy;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
}

export type NetworkStatus = 'loading' | 'ready' | 'error' | 'refetching' | 'poll';

export interface UseQueryResult<TData, TVariables> {
	data: TData | null;
	loading: boolean;
	error: string | null;
	errorCode?: ErrorCode;
	networkStatus: NetworkStatus;
	called: boolean;
	refetch: (vars?: TVariables) => Promise<GraphQLResult<TData>>;
	fetchMore: (merge: (prev: TData, next: TData) => TData, vars?: TVariables) => Promise<GraphQLResult<TData>>;
}

export function useQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseQueryOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseQueryResult<InferData<TDocument>, InferVars<TDocument>> {
	type TData = InferData<TDocument>;
	type TVariables = InferVars<TDocument>;

	const client = useClient();
	const variables = options?.variables;
	const pollInterval = options?.pollInterval;
	const skip = options?.skip ?? false;
	const fetchPolicy = options?.fetchPolicy;

	const onCompletedRef = useRef(options?.onCompleted);
	const onErrorRef = useRef(options?.onError);
	onCompletedRef.current = options?.onCompleted;
	onErrorRef.current = options?.onError;

	const [result, setResult] = useState<GraphQLResult<TData> | null>(null);
	const [loading, setLoading] = useState(!skip);
	const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(skip ? 'ready' : 'loading');
	const [called, setCalled] = useState(false);

	useEffect(() => {
		if (skip) return;

		let cancelled = false;
		setLoading(true);
		setNetworkStatus('loading');
		setCalled(true);

		client
			.query(document, variables, undefined, { fetchPolicy })
			.then((res: GraphQLResult<TData>) => {
				if (cancelled) return;
				setResult(res);
				setLoading(false);
				if (res.status === 'success') {
					setNetworkStatus('ready');
					onCompletedRef.current?.(res.data);
				} else {
					setNetworkStatus('error');
					onErrorRef.current?.(res.error, res.errorCode);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [client, document, JSON.stringify(variables ?? {}), skip]);

	useEffect(() => {
		if (!pollInterval || pollInterval <= 0 || skip) return;

		const id = setInterval(async () => {
			setNetworkStatus('poll');
			const res = await client.query(document, variables);
			if (res.status === 'success') {
				setResult(res);
				setNetworkStatus('ready');
				onCompletedRef.current?.(res.data);
			} else {
				setNetworkStatus('error');
				onErrorRef.current?.(res.error, res.errorCode);
			}
		}, pollInterval);

		return () => clearInterval(id);
	}, [pollInterval, client, document, JSON.stringify(variables ?? {}), skip]);

	const refetch = useCallback(
		async (vars?: TVariables) => {
			setNetworkStatus('refetching');
			const res = await client.refetch(document, (vars ?? variables) as InferVars<TDocument>);
			setResult(res);
			setLoading(false);
			if (res.status === 'success') {
				setNetworkStatus('ready');
				onCompletedRef.current?.(res.data);
			} else {
				setNetworkStatus('error');
				onErrorRef.current?.(res.error, res.errorCode);
			}
			return res;
		},
		[client, document, variables],
	);

	const fetchMore = useCallback(
		async (merge: (prev: TData, next: TData) => TData, vars?: TVariables) => {
			setNetworkStatus('refetching');
			const res = await client.query(document, vars ?? variables);
			if (res.status === 'success' && result?.status === 'success' && result.data) {
				const merged = merge(result.data, res.data);
				setResult({ ...res, data: merged });
			} else {
				setResult(res);
			}
			setNetworkStatus('ready');
			return res;
		},
		[client, document, variables, result],
	);

	const data = result?.status === 'success' ? result.data : null;
	const error = result?.status === 'error' ? result.error : null;
	const errorCode = result?.status === 'error' ? result.errorCode : undefined;

	return { data, loading, error, errorCode, networkStatus, called, refetch, fetchMore };
}
