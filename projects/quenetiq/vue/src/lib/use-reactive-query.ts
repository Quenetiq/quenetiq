import { reactive, onMounted, onUnmounted, watch, type UnwrapNestedRefs } from 'vue';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, InferData, InferVars } from '@quenetiq/client';
import { useClient } from './plugin';

export interface UseReactiveQueryOptions<TData, TVariables> {
	variables?: TVariables;
	pollInterval?: number;
	skip?: boolean;
	placeholderData?: TData;
	initialData?: TData;
	select?: (data: TData) => unknown;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
}

export type NetworkStatus = 'idle' | 'loading' | 'success' | 'error' | 'refetching' | 'poll';

export interface UseReactiveQueryState<TData> {
	data: TData | null;
	previousData: TData | null;
	error: string | null;
	errorCode: ErrorCode | undefined;
	status: NetworkStatus;
	isLoading: boolean;
	isSuccess: boolean;
	isError: boolean;
	isIdle: boolean;
	isRefetching: boolean;
	called: boolean;
}

export interface UseReactiveQueryResult<TData, TVariables>
	extends UnwrapNestedRefs<UseReactiveQueryState<TData>> {
	refetch: (vars?: TVariables) => Promise<GraphQLResult<TData>>;
	fetchMore: (merge: (prev: TData, next: TData) => TData, vars?: TVariables) => Promise<GraphQLResult<TData>>;
	$reset: () => void;
}

export function useReactiveQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseReactiveQueryOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseReactiveQueryResult<InferData<TDocument>, InferVars<TDocument>> {
	type TData = InferData<TDocument>;
	type TVariables = InferVars<TDocument>;

	const client = useClient();
	const variables = options?.variables;
	const pollInterval = options?.pollInterval;
	const skip = options?.skip ?? false;
	const onCompleted = options?.onCompleted;
	const onError = options?.onError;
	const select = options?.select;

	const state = reactive<UseReactiveQueryState<TData>>({
		data: options?.initialData ?? null,
		previousData: null,
		error: null,
		errorCode: undefined,
		status: skip ? 'idle' : 'loading',
		isLoading: !skip,
		isSuccess: false,
		isError: false,
		isIdle: skip,
		isRefetching: false,
		called: false,
	}) as UseReactiveQueryState<TData>;

	const updateState = (result: GraphQLResult<TData>): void => {
		state.previousData = state.data;
		if (result.status === 'success') {
			const selected = select ? select(result.data) as TData : result.data;
			state.data = selected;
			state.error = null;
			state.errorCode = undefined;
			state.status = 'success';
			state.isSuccess = true;
			state.isError = false;
			state.isLoading = false;
			state.isRefetching = false;
			onCompleted?.(result.data);
		} else {
			state.error = result.error;
			state.errorCode = result.errorCode;
			state.status = 'error';
			state.isError = true;
			state.isSuccess = false;
			state.isLoading = false;
			state.isRefetching = false;
			onError?.(result.error, result.errorCode);
		}
	};

	let cancelled = false;
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let lastVars = variables;

	const execute = async (vars?: TVariables, status?: NetworkStatus) => {
		if (skip) return;
		cancelled = false;
		state.status = status ?? 'loading';
		state.isLoading = true;
		state.isRefetching = status === 'refetching';
		state.called = true;
		lastVars = vars;

		const result = await client.query(document, vars ?? variables);
		if (cancelled) return;
		updateState(result);
	};

	const refetch = async (vars?: TVariables) => {
		state.status = 'refetching';
		state.isRefetching = true;
		const result = await client.refetch(document, (vars ?? lastVars) as InferVars<TDocument>);
		updateState(result);
		return result;
	};

	const fetchMore = async (merge: (prev: TData, next: TData) => TData, vars?: TVariables) => {
		state.status = 'refetching';
		state.isRefetching = true;
		const result = await client.query(document, vars ?? lastVars);
		if (result.status === 'success' && state.data) {
			state.data = merge(state.data, result.data);
		}
		state.status = 'success';
		state.isRefetching = false;
		return result;
	};

	const $reset = (): void => {
		state.data = options?.initialData ?? null;
		state.previousData = null;
		state.error = null;
		state.errorCode = undefined;
		state.status = 'idle';
		state.isLoading = false;
		state.isSuccess = false;
		state.isError = false;
		state.isIdle = true;
		state.isRefetching = false;
		state.called = false;
	};

	onMounted(() => {
		if (!skip) {
			execute(variables);
		}
		if (pollInterval && pollInterval > 0 && !skip) {
			pollTimer = setInterval(async () => {
				const result = await client.query(document, variables);
				updateState(result);
			}, pollInterval);
		}
	});

	watch(
		() => JSON.stringify(variables ?? {}),
		() => {
			if (!skip) execute(variables);
		},
	);

	onUnmounted(() => {
		cancelled = true;
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	});

	return Object.assign(state, { refetch, fetchMore, $reset }) as UseReactiveQueryResult<TData, TVariables>;
}
