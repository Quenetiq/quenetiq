import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode, ErrorCode, InferData, InferVars } from '@dumbql/client';
import { print } from '@dumbql/client';
import { useClient } from './plugin';

export interface UseLiveQueryOptions<TData, TVariables = Record<string, unknown>> {
	variables?: TVariables;
	wsEndpoint?: string;
	shouldSubscribe?: boolean;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
}

export interface UseLiveQueryResult<TData> {
	data: Ref<TData | null>;
	loading: Ref<boolean>;
	error: Ref<string | null>;
	errorCode: Ref<ErrorCode | undefined>;
}

export function useLiveQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseLiveQueryOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseLiveQueryResult<InferData<TDocument>> {
	type TData = InferData<TDocument>;

	const client = useClient();
	const variables = options?.variables;
	const data = ref<TData | null>(null) as Ref<TData | null>;
	const loading = ref(true);
	const error = ref<string | null>(null);
	const errorCode = ref<ErrorCode | undefined>(undefined);

	const wsEndpoint = options?.wsEndpoint ?? client.endpoint.replace(/^http/, 'ws');
	const shouldSubscribe = options?.shouldSubscribe ?? true;
	const onCompleted = options?.onCompleted;
	const onError = options?.onError;

	let ws: WebSocket | null = null;
	let cancelled = false;

	onMounted(async () => {
		loading.value = true;

		const result = await client.query(document, variables);

		if (cancelled) return;
		loading.value = false;

		if (result.status === 'success') {
			data.value = result.data;
			error.value = null;
			errorCode.value = undefined;
			onCompleted?.(result.data);
		} else {
			error.value = result.error;
			errorCode.value = result.errorCode;
			onError?.(result.error, result.errorCode);
			return;
		}

		if (!shouldSubscribe) return;

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
						break;
				}
				case 'next': {
					const payload = msg.payload;
					if (payload?.errors && payload.errors.length > 0) {
						error.value = payload.errors[0].message;
						errorCode.value = 'GRAPHQL_ERROR';
						onError?.(payload.errors[0].message, 'GRAPHQL_ERROR');
					} else if (payload?.data !== undefined) {
						data.value = payload.data;
						onCompleted?.(payload.data);
					}
					break;
				}
				case 'error': {
					error.value = 'Live query subscription error';
					errorCode.value = 'GRAPHQL_ERROR';
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
			error.value = 'WebSocket connection error';
			errorCode.value = 'NETWORK_ERROR';
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

	return { data, loading, error, errorCode };
}
