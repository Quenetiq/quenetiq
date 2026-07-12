import { useState, useEffect, useRef } from 'react';
import type { DocumentNode, TypedDocumentNode, ErrorCode, InferData } from '@dumbql/client';
import { print } from '@dumbql/client';
import { useClient } from './provider';

export interface UseSubscriptionOptions<TData> {
	variables?: Record<string, unknown>;
	wsEndpoint?: string;
	shouldSubscribe?: boolean;
	reconnect?: boolean;
	reconnectInterval?: number;
	maxReconnects?: number;
	onNext?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
	onComplete?: () => void;
}

export interface UseSubscriptionResult<TData> {
	data: TData | null;
	loading: boolean;
	error: string | null;
	errorCode?: ErrorCode;
}

interface GraphqlWsMessage<T = Record<string, unknown>> {
	type: 'next' | 'error' | 'complete';
	id?: string;
	payload?: { data?: T; errors?: { message: string }[] };
}

export function useSubscription<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseSubscriptionOptions<InferData<TDocument>>,
): UseSubscriptionResult<InferData<TDocument>> {
	type TData = InferData<TDocument>;
	const client = useClient();
	const variables = options?.variables;
	const [data, setData] = useState<TData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
	const [loading, setLoading] = useState(true);
	const wsRef = useRef<WebSocket | null>(null);

	const wsEndpoint = options?.wsEndpoint ?? client.endpoint.replace(/^http/, 'ws');

	const shouldSubscribe = options?.shouldSubscribe ?? true;
	const reconnect = options?.reconnect ?? false;
	const reconnectInterval = options?.reconnectInterval ?? 2000;
	const maxReconnects = options?.maxReconnects ?? 5;
	const onNextRef = useRef(options?.onNext);
	const onErrorRef = useRef(options?.onError);
	const onCompleteRef = useRef(options?.onComplete);
	onNextRef.current = options?.onNext;
	onErrorRef.current = options?.onError;
	onCompleteRef.current = options?.onComplete;

	useEffect(() => {
		if (!shouldSubscribe) return;

		let ws: WebSocket | null = null;
		let reconnectAttempt = 0;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let unsubscribed = false;

		const connect = () => {
			if (unsubscribed) return;

			setLoading(true);
			setError(null);
			setErrorCode(undefined);

			const queryStr = print(document);
			ws = new WebSocket(wsEndpoint);
			wsRef.current = ws;

			ws.onopen = () => {
				setLoading(true);
				reconnectAttempt = 0;
				ws!.send(
					JSON.stringify({
						type: 'subscribe',
						id: '1',
						payload: { query: queryStr, variables: variables ?? {} },
					}),
				);
			};

			ws.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data) as GraphqlWsMessage<TData>;
					if (msg.type === 'next' && msg.payload) {
						if (msg.payload.errors) {
							const errMsg = msg.payload.errors[0].message;
							setError(errMsg);
							setErrorCode('GRAPHQL_ERROR');
							onErrorRef.current?.(errMsg, 'GRAPHQL_ERROR');
						} else if (msg.payload.data) {
							setData(msg.payload.data);
							onNextRef.current?.(msg.payload.data);
						}
						setLoading(false);
					} else if (msg.type === 'error') {
						const errMsg = msg.payload?.errors?.[0]?.message ?? 'Subscription error';
						setError(errMsg);
						setErrorCode('GRAPHQL_ERROR');
						setLoading(false);
						onErrorRef.current?.(errMsg, 'GRAPHQL_ERROR');
					} else if (msg.type === 'complete') {
						setLoading(false);
						onCompleteRef.current?.();
					}
				} catch {
					// ignore malformed messages
				}
			};

			ws.onerror = () => {
				const errMsg = 'WebSocket connection error';
				setError(errMsg);
				setErrorCode('NETWORK_ERROR');
				setLoading(false);
				onErrorRef.current?.(errMsg, 'NETWORK_ERROR');
			};

			ws.onclose = () => {
				setLoading(false);
				wsRef.current = null;
				if (!unsubscribed && reconnect && reconnectAttempt < maxReconnects) {
					const delay = reconnectInterval * Math.pow(2, reconnectAttempt) + Math.random() * 1000;
					reconnectAttempt++;
					reconnectTimer = setTimeout(connect, delay);
				}
			};
		};

		connect();

		return () => {
			unsubscribed = true;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			if (ws) {
				ws.close(1000, 'unsubscribe');
				ws = null;
			}
			wsRef.current = null;
		};
	}, [client, document, variables, wsEndpoint, shouldSubscribe, reconnect, reconnectInterval, maxReconnects]);

	return { data, loading, error, errorCode };
}
