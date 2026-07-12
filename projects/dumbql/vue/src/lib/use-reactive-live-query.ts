import { reactive, onMounted, onUnmounted, type UnwrapNestedRefs } from 'vue';
import type { DocumentNode, TypedDocumentNode, ErrorCode, InferData, InferVars } from '@dumbql/client';
import { print } from '@dumbql/client';
import { useClient } from './plugin';

export interface UseReactiveLiveQueryOptions<TData> {
	variables?: Record<string, unknown>;
	wsEndpoint?: string;
	shouldSubscribe?: boolean;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
}

export interface UseReactiveLiveQueryState<TData> {
	data: TData | null;
	error: string | null;
	errorCode: ErrorCode | undefined;
	status: 'idle' | 'loading' | 'ready' | 'subscribing' | 'live' | 'error' | 'complete';
	isLoading: boolean;
	isLive: boolean;
	isError: boolean;
	isIdle: boolean;
}

export interface UseReactiveLiveQueryResult<TData>
	extends UnwrapNestedRefs<UseReactiveLiveQueryState<TData>> {
	$reset: () => void;
}

export function useReactiveLiveQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseReactiveLiveQueryOptions<InferData<TDocument>>,
): UseReactiveLiveQueryResult<InferData<TDocument>> {
	type TData = InferData<TDocument>;
	const client = useClient();
	const variables = options?.variables;

	const state = reactive<UseReactiveLiveQueryState<TData>>({
		data: null,
		error: null,
		errorCode: undefined,
		status: 'idle',
		isLoading: false,
		isLive: false,
		isError: false,
		isIdle: true,
	}) as UseReactiveLiveQueryState<TData>;

	const wsEndpoint = options?.wsEndpoint ?? client.endpoint.replace(/^http/, 'ws');
	const shouldSubscribe = options?.shouldSubscribe ?? true;
	const onCompleted = options?.onCompleted;
	const onError = options?.onError;

	let ws: WebSocket | null = null;
	let cancelled = false;

	const $reset = (): void => {
		state.data = null;
		state.error = null;
		state.errorCode = undefined;
		state.status = 'idle';
		state.isLoading = false;
		state.isLive = false;
		state.isError = false;
		state.isIdle = true;
	};

	onMounted(async () => {
		state.status = 'loading';
		state.isLoading = true;
		state.isIdle = false;

		const result = await client.query(document, variables as InferVars<TDocument>);

		if (cancelled) return;
		state.isLoading = false;

		if (result.status === 'success') {
			state.data = result.data;
			state.error = null;
			state.errorCode = undefined;
			state.status = 'ready';
			onCompleted?.(result.data);
		} else {
			state.error = result.error;
			state.errorCode = result.errorCode;
			state.status = 'error';
			state.isError = true;
			onError?.(result.error, result.errorCode);
			return;
		}

		if (!shouldSubscribe) return;

		state.status = 'subscribing';
		const queryStr = print(document);
		ws = new WebSocket(wsEndpoint, 'graphql-transport-ws');

		ws.onopen = () => {
			ws!.send(JSON.stringify({ type: 'connection_init' }));
		};

		ws.onmessage = (event) => {
			if (cancelled) return;
			try {
				const msg = JSON.parse(event.data) as {
					type: string;
					id?: string;
					payload?: { data?: TData; errors?: { message: string }[] };
				};

				switch (msg.type) {
				case 'connection_ack': {
						ws!.send(
							JSON.stringify({
								type: 'subscribe',
								id: 'live1',
								payload: { query: queryStr, variables: variables ?? {} },
							}),
						);
						state.status = 'live';
						state.isLive = true;
						break;
				}
				case 'next': {
					const payload = msg.payload;
					if (payload?.errors && payload.errors.length > 0) {
						state.error = payload.errors[0].message;
						state.errorCode = 'GRAPHQL_ERROR';
						state.status = 'error';
						state.isError = true;
						onError?.(payload.errors[0].message, 'GRAPHQL_ERROR');
					} else if (payload?.data !== undefined) {
						state.data = payload.data;
						state.status = 'live';
						state.isLive = true;
						onCompleted?.(payload.data);
					}
					break;
				}
				case 'error': {
					state.error = 'Live query subscription error';
					state.errorCode = 'GRAPHQL_ERROR';
					state.status = 'error';
					state.isError = true;
					onError?.('Live query subscription error', 'GRAPHQL_ERROR');
					break;
				}
				}
			} catch {
				// ignore malformed messages
			}
		};

		ws.onerror = () => {
			if (cancelled) return;
			state.error = 'WebSocket connection error';
			state.errorCode = 'NETWORK_ERROR';
			state.status = 'error';
			state.isError = true;
			onError?.('WebSocket connection error', 'NETWORK_ERROR');
		};
	});

	onUnmounted(() => {
		cancelled = true;
		if (ws) {
			ws.close(1000, 'unsubscribe');
			ws = null;
		}
	});

	return Object.assign(state, { $reset }) as UseReactiveLiveQueryResult<TData>;
}
