import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, FetchPolicy, InferData, InferVars } from '@quenetiq/client';
import { useClient } from './plugin';

export interface UseQueryOptions<TData, TVariables> {
	variables?: TVariables;
	pollInterval?: number;
	skip?: boolean;
	fetchPolicy?: FetchPolicy;
	signal?: AbortSignal;
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
	abort: () => void;
	aborted: Ref<boolean>;
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
	const onCompleted = options?.onCompleted;
	const onError = options?.onError;

	const data = ref<TData | null>(null) as Ref<TData | null>;
	const loading = ref(!skip);
	const error = ref<string | null>(null);
	const errorCode = ref<ErrorCode | undefined>(undefined);
	const networkStatus = ref<NetworkStatus>(skip ? 'ready' : 'loading');
	const called = ref(false);
	const aborted = ref(false);

	let cancelled = false;
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let lastVars = variables;
	let currentController: AbortController | null = null;

	const abort = () => {
		currentController?.abort();
		currentController = null;
		aborted.value = true;
		loading.value = false;
		networkStatus.value = 'ready';
	};

	const execute = async (vars?: TVariables, status?: NetworkStatus) => {
		if (skip) return;
		currentController?.abort();
		const controller = new AbortController();
		currentController = controller;
		aborted.value = false;
		cancelled = false;
		loading.value = true;
		networkStatus.value = status ?? 'loading';
		called.value = true;
		lastVars = vars;

		const signal = options?.signal
			? AbortSignal.any([controller.signal, options.signal])
			: controller.signal;

		try {
			const result = await client.query(document, vars ?? variables, undefined, { fetchPolicy, signal });
			if (cancelled || controller.signal.aborted) return;

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
		} catch {
			if (cancelled || controller.signal.aborted) return;
			loading.value = false;
			networkStatus.value = 'error';
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
		currentController?.abort();
		const controller = new AbortController();
		currentController = controller;
		aborted.value = false;
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
		currentController?.abort();
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	});

	return { data, loading, error, errorCode, networkStatus, called, refetch, fetchMore, abort, aborted };
}
