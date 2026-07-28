import { useState, useEffect, useCallback, useRef } from 'react';
import type { DocumentNode, TypedDocumentNode, ErrorCode, InferData, InferVars } from '@quenetiq/client';
import { print } from '@quenetiq/client';
import { useClient } from './provider';

export interface UseLiveQueryOptions<TData, TVariables = Record<string, unknown>> {
	variables?: TVariables;
	wsEndpoint?: string;
	shouldSubscribe?: boolean;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
}

export interface UseLiveQueryResult<TData> {
	data: TData | null;
	loading: boolean;
	error: string | null;
	errorCode?: ErrorCode;
}

export function useLiveQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseLiveQueryOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseLiveQueryResult<InferData<TDocument>> {
	type TData = InferData<TDocument>;
	const client = useClient();
	const variables = options?.variables;
	const [data, setData] = useState<TData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
	const [loading, setLoading] = useState(true);
	const wsRef = useRef<WebSocket | null>(null);
	const cancelledRef = useRef(false);

	const wsEndpoint = options?.wsEndpoint ?? client.endpoint.replace(/^http/, 'ws');
	const shouldSubscribe = options?.shouldSubscribe ?? true;
	const onCompletedRef = useRef(options?.onCompleted);
	const onErrorRef = useRef(options?.onError);
	onCompletedRef.current = options?.onCompleted;
	onErrorRef.current = options?.onError;

	const execute = useCallback(async () => {
		cancelledRef.current = false;
		setLoading(true);

		const result = await client.query(document, variables as InferVars<TDocument> | undefined);

		if (cancelledRef.current) return;
		setLoading(false);

		if (result.status === 'success') {
			setData(result.data);
			setError(null);
			setErrorCode(undefined);
			onCompletedRef.current?.(result.data);
		} else {
			setError(result.error);
			setErrorCode(result.errorCode);
			onErrorRef.current?.(result.error, result.errorCode);
			return;
		}

		if (!shouldSubscribe) return;

		const queryStr = print(document);
		const ws = new WebSocket(wsEndpoint, 'graphql-transport-ws');
		wsRef.current = ws;

		ws.onopen = () => {
			ws.send(JSON.stringify({ type: 'connection_init' }));
		};

		ws.onmessage = (event) => {
			if (cancelledRef.current) return;
			try {
				const msg = JSON.parse(event.data) as {
					type: string;
					id?: string;
					payload?: { data?: TData; errors?: { message: string }[] };
				};

				switch (msg.type) {
				case 'connection_ack': {
					ws.send(
						JSON.stringify({
							type: 'subscribe',
							id: 'live1',
							payload: { query: queryStr, variables: variables ?? {} },
						}),
					);
					break;
				}
				case 'next': {
					const payload = msg.payload;
					if (payload?.errors && payload.errors.length > 0) {
						setError(payload.errors[0].message);
						setErrorCode('GRAPHQL_ERROR');
						onErrorRef.current?.(payload.errors[0].message, 'GRAPHQL_ERROR');
					} else if (payload?.data !== undefined) {
						setData(payload.data);
						onCompletedRef.current?.(payload.data);
					}
					break;
				}
				case 'error': {
					const errMsg = 'Live query subscription error';
					setError(errMsg);
					setErrorCode('GRAPHQL_ERROR');
					onErrorRef.current?.(errMsg, 'GRAPHQL_ERROR');
					break;
				}
				}
			} catch {
				// ignore malformed messages
			}
		};

		ws.onerror = () => {
			if (cancelledRef.current) return;
			const errMsg = 'WebSocket connection error';
			setError(errMsg);
			setErrorCode('NETWORK_ERROR');
			onErrorRef.current?.(errMsg, 'NETWORK_ERROR');
		};

		ws.onclose = () => {
			// connection closed
		};
	}, [client, document, variables, wsEndpoint, shouldSubscribe]);

	useEffect(() => {
		execute();

		return () => {
			cancelledRef.current = true;
			if (wsRef.current) {
				wsRef.current.close(1000, 'unsubscribe');
				wsRef.current = null;
			}
		};
	}, [execute]);

	return { data, loading, error, errorCode };
}
