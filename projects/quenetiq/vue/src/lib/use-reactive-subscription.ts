import { reactive, onMounted, onUnmounted, type UnwrapNestedRefs } from 'vue';
import type { DocumentNode, TypedDocumentNode, ErrorCode, InferData } from '@quenetiq/client';
import { print } from '@quenetiq/client';
import { useClient } from './plugin';

export interface UseReactiveSubscriptionOptions<TData> {
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

interface GraphqlWsMessage<T = Record<string, unknown>> {
	type: 'next' | 'error' | 'complete';
	id?: string;
	payload?: { data?: T; errors?: { message: string }[] };
}

export interface UseReactiveSubscriptionState<TData> {
	data: TData | null;
	error: string | null;
	errorCode: ErrorCode | undefined;
	status: 'idle' | 'connecting' | 'open' | 'error' | 'complete';
	isConnecting: boolean;
	isOpen: boolean;
	isError: boolean;
	isComplete: boolean;
	isIdle: boolean;
}

export interface UseReactiveSubscriptionResult<TData>
	extends UnwrapNestedRefs<UseReactiveSubscriptionState<TData>> {
	$reset: () => void;
}

export function useReactiveSubscription<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseReactiveSubscriptionOptions<InferData<TDocument>>,
): UseReactiveSubscriptionResult<InferData<TDocument>> {
	type TData = InferData<TDocument>;
	const client = useClient();
	const variables = options?.variables;

	const state = reactive<UseReactiveSubscriptionState<TData>>({
		data: null,
		error: null,
		errorCode: undefined,
		status: 'idle',
		isConnecting: false,
		isOpen: false,
		isError: false,
		isComplete: false,
		isIdle: true,
	}) as UseReactiveSubscriptionState<TData>;

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

	const $reset = (): void => {
		state.data = null;
		state.error = null;
		state.errorCode = undefined;
		state.status = 'idle';
		state.isConnecting = false;
		state.isOpen = false;
		state.isError = false;
		state.isComplete = false;
		state.isIdle = true;
	};

	const connect = () => {
		if (unsubscribed) return;

		state.status = 'connecting';
		state.isConnecting = true;
		state.isOpen = false;
		state.isError = false;
		state.isIdle = false;
		state.data = null;
		state.error = null;
		state.errorCode = undefined;

		const queryStr = print(document);
		ws = new WebSocket(wsEndpoint);

		ws.onopen = () => {
			state.status = 'open';
			state.isConnecting = false;
			state.isOpen = true;
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
						state.error = errMsg;
						state.errorCode = 'GRAPHQL_ERROR';
						state.status = 'error';
						state.isError = true;
						state.isOpen = false;
						onError?.(errMsg, 'GRAPHQL_ERROR');
					} else if (msg.payload.data) {
						state.data = msg.payload.data;
						state.status = 'open';
						onNext?.(msg.payload.data);
					}
				} else if (msg.type === 'error') {
					const errMsg = msg.payload?.errors?.[0]?.message ?? 'Subscription error';
					state.error = errMsg;
					state.errorCode = 'GRAPHQL_ERROR';
					state.status = 'error';
					state.isError = true;
					state.isOpen = false;
					onError?.(errMsg, 'GRAPHQL_ERROR');
				} else if (msg.type === 'complete') {
					state.status = 'complete';
					state.isComplete = true;
					state.isOpen = false;
					onComplete?.();
				}
			} catch {
				// ignore malformed messages
			}
		};

		ws.onerror = () => {
			state.error = 'WebSocket connection error';
			state.errorCode = 'NETWORK_ERROR';
			state.status = 'error';
			state.isError = true;
			state.isOpen = false;
			onError?.('WebSocket connection error', 'NETWORK_ERROR');
		};

		ws.onclose = () => {
			state.isOpen = false;
			ws = null;
			if (!unsubscribed && shouldReconnect && reconnectAttempt < maxReconnects) {
				state.status = 'connecting';
				state.isConnecting = true;
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

	return Object.assign(state, { $reset }) as UseReactiveSubscriptionResult<TData>;
}
