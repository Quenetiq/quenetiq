import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, InferData, InferVars } from '@dumbql/client';
import { useClient } from './plugin';

export interface UseQueryOptions<TData, TVariables> {
	variables?: TVariables;
	pollInterval?: number;
	skip?: boolean;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
}

export type NetworkStatus = 'loading' | 'ready' | 'error' | 'refetching' | 'poll';

export interface UseQueryResult<TData, TVariables> {
	data: Ref<TData | null>;
	loading: Ref<boolean>;
	error: Ref<string | null>;
	errorCode: Ref<ErrorCode | undefined>;
	networkStatus: Ref<NetworkStatus>;
	called: Ref<boolean>;
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
	const onCompleted = options?.onCompleted;
	const onError = options?.onError;

	const data = ref<TData | null>(null) as Ref<TData | null>;
	const loading = ref(!skip);
	const error = ref<string | null>(null);
	const errorCode = ref<ErrorCode | undefined>(undefined);
	const networkStatus = ref<NetworkStatus>(skip ? 'ready' : 'loading');
	const called = ref(false);

	let cancelled = false;
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let lastVars = variables;

	const execute = async (vars?: TVariables, status?: NetworkStatus) => {
		if (skip) return;
		cancelled = false;
		loading.value = true;
		networkStatus.value = status ?? 'loading';
		called.value = true;
		lastVars = vars;

		const result = await client.query(document, vars ?? variables);
		if (cancelled) return;

		loading.value = false;
		if (result.status === 'success') {
			data.value = result.data;
			error.value = null;
			errorCode.value = undefined;
			networkStatus.value = 'ready';
			onCompleted?.(result.data);
		} else {
			error.value = result.error;
			errorCode.value = result.errorCode;
			networkStatus.value = 'error';
			onError?.(result.error, result.errorCode);
		}
	};

	onMounted(() => {
		if (!skip) {
			execute(variables);
		}

		if (pollInterval && pollInterval > 0 && !skip) {
			pollTimer = setInterval(async () => {
				networkStatus.value = 'poll';
				const result = await client.query(document, variables);
				loading.value = false;
				if (result.status === 'success') {
					data.value = result.data;
					error.value = null;
					errorCode.value = undefined;
					networkStatus.value = 'ready';
					onCompleted?.(result.data);
				} else {
					error.value = result.error;
					errorCode.value = result.errorCode;
					networkStatus.value = 'error';
					onError?.(result.error, result.errorCode);
				}
			}, pollInterval);
		}
	});

	watch(
		() => JSON.stringify(variables ?? {}),
		() => {
			if (!skip) {
				execute(variables);
			}
		},
	);

	const refetch = async (vars?: TVariables) => {
		networkStatus.value = 'refetching';
		const result = await client.refetch(document, vars ?? lastVars);
		loading.value = false;
		if (result.status === 'success') {
			data.value = result.data;
			error.value = null;
			errorCode.value = undefined;
			networkStatus.value = 'ready';
			onCompleted?.(result.data);
		} else {
			error.value = result.error;
			errorCode.value = result.errorCode;
			networkStatus.value = 'error';
			onError?.(result.error, result.errorCode);
		}
		return result;
	};

	const fetchMore = async (merge: (prev: TData, next: TData) => TData, vars?: TVariables) => {
		networkStatus.value = 'refetching';
		const result = await client.query(document, vars ?? lastVars);
		if (result.status === 'success' && data.value) {
			data.value = merge(data.value, result.data);
		}
		networkStatus.value = 'ready';
		return result;
	};

	onUnmounted(() => {
		cancelled = true;
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	});

	return { data, loading, error, errorCode, networkStatus, called, refetch, fetchMore };
}
