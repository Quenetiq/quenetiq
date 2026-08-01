import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode, ErrorCode } from '@quenetiq/client';
import { print } from '@quenetiq/client';
import { useClient } from './plugin';

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
	data: Ref<TData | null>;
	loading: Ref<boolean>;
	error: Ref<string | null>;
	errorCode: Ref<ErrorCode | undefined>;
}

interface GraphqlWsMessage<T = Record<string, unknown>> {
	type: 'next' | 'error' | 'complete';
	id?: string;
	payload?: { data?: T; errors?: { message: string }[] };
}

export function useSubscription<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
	document: DocumentNode | TypedDocumentNode<TData, TVariables>,
	options?: UseSubscriptionOptions<TData>,
): UseSubscriptionResult<TData> {
	const client = useClient();
	const variables = options?.variables;
	const data = ref<TData | null>(null) as Ref<TData | null>;
	const loading = ref(true);
	const error = ref<string | null>(null);
	const errorCode = ref<ErrorCode | undefined>(undefined);

	const wsEndpoint = options?.wsEndpoint ?? client.endpoint.replace(/^http/, 'ws');

	const shouldSubscribe = options?.shouldSubscribe ?? true;
	const shouldReconnect = options?.reconnect ?? false;
	const reconnectInterval = options?.reconnectInterval ?? 2000;
	const maxReconnects = options?.maxReconnects ?? 5;
	const onNext = options?.onNext;
	const onError = options?.onError;
	const onComplete = options?.onComplete;

	let ws: WebSocket | null = null;
	let reconnectAttempt = 0;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let unsubscribed = false;

	const connect = (): void => {
		if (unsubscribed) return;

		loading.value = true;
		data.value = null;
		error.value = null;
		errorCode.value = undefined;

		const queryStr = print(document);
		ws = new WebSocket(wsEndpoint);

		ws.onopen = () => {
			loading.value = true;
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
						error.value = errMsg;
						errorCode.value = 'GRAPHQL_ERROR';
						onError?.(errMsg, 'GRAPHQL_ERROR');
					} else if (msg.payload.data) {
						data.value = msg.payload.data;
						onNext?.(msg.payload.data);
					}
					loading.value = false;
				} else if (msg.type === 'error') {
					const errMsg = msg.payload?.errors?.[0]?.message ?? 'Subscription error';
					error.value = errMsg;
					errorCode.value = 'GRAPHQL_ERROR';
					loading.value = false;
					onError?.(errMsg, 'GRAPHQL_ERROR');
				} else if (msg.type === 'complete') {
					loading.value = false;
					onComplete?.();
				}
			} catch {
				// ignore malformed messages
			}
		};

		ws.onerror = () => {
			const errMsg = 'WebSocket connection error';
			error.value = errMsg;
			errorCode.value = 'NETWORK_ERROR';
			loading.value = false;
			onError?.(errMsg, 'NETWORK_ERROR');
		};

		ws.onclose = () => {
			loading.value = false;
			ws = null;
			if (!unsubscribed && shouldReconnect && reconnectAttempt < maxReconnects) {
				const delay = reconnectInterval * Math.pow(2, reconnectAttempt) + Math.random() * 1000;
				reconnectAttempt++;
				reconnectTimer = setTimeout(connect, delay) as unknown as ReturnType<typeof setTimeout>;
			}
		};
	};

	onMounted(() => {
		if (!shouldSubscribe) return;
		connect();
	});

	onUnmounted(() => {
		unsubscribed = true;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		if (ws) {
			ws.close(1000, 'unsubscribe');
			ws = null;
		}
	});

	return { data, loading, error, errorCode };
}
