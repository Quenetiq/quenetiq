import { ref, onUnmounted, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode, ErrorCode, InferData, InferVars } from '@quenetiq/client';
import { useClient } from './plugin';

export interface UseStreamQueryOptions<TData, TVariables> {
	variables?: TVariables;
	onData?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
	onCompleted?: (data: TData) => void;
}

export type StreamStatus = 'idle' | 'streaming' | 'completed' | 'error';

export interface UseStreamQueryResult<TData> {
	data: Ref<TData | null>;
	loading: Ref<boolean>;
	status: Ref<StreamStatus>;
	error: Ref<string | null>;
	errorCode: Ref<ErrorCode | undefined>;
	start: () => void;
	stop: () => void;
}

/**
 * Composable for `@defer`/`@stream` queries.
 *
 * Wraps `client.queryDefer()` which auto-merges incremental patches.
 * Each emission is the full merged result up to that point.
 */
export function useStreamQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseStreamQueryOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseStreamQueryResult<InferData<TDocument>> {
	type TData = InferData<TDocument>;

	const client = useClient();
	const variables = options?.variables;

	const data = ref<TData | null>(null) as Ref<TData | null>;
	const loading = ref(false);
	const status = ref<StreamStatus>('idle');
	const error = ref<string | null>(null);
	const errorCode = ref<ErrorCode | undefined>(undefined);

	let cancelled = false;
	let abortController: AbortController | null = null;
	let latestData: TData | null = null;

	const iterate = async (): Promise<void> => {
		try {
			const iterable = client.queryDefer<TDocument>(document, variables);

			for await (const result of iterable) {
				if (cancelled) return;

				if (result.status === 'success') {
					latestData = result.data;
					data.value = result.data;
					options?.onData?.(result.data);
				} else {
					error.value = result.error;
					errorCode.value = result.errorCode;
					status.value = 'error';
					loading.value = false;
					options?.onError?.(result.error, result.errorCode);
					return;
				}
			}

			if (!cancelled) {
				status.value = 'completed';
				loading.value = false;
				if (latestData !== null) {
					options?.onCompleted?.(latestData);
				}
			}
		} catch (err) {
			if (cancelled) return;
			if (err instanceof DOMException && err.name === 'AbortError') return;
			const msg = err instanceof Error ? err.message : 'Stream failed';
			error.value = msg;
			status.value = 'error';
			loading.value = false;
			options?.onError?.(msg);
		}
	};

	const start = (): void => {
		abortController?.abort();
		abortController = new AbortController();
		cancelled = false;

		loading.value = true;
		status.value = 'streaming';
		error.value = null;
		errorCode.value = undefined;
		latestData = null;

		iterate();
	};

	const stop = (): void => {
		abortController?.abort();
		abortController = null;
		cancelled = true;
		loading.value = false;
		if (status.value === 'streaming') {
			status.value = 'idle';
		}
	};

	onUnmounted(() => {
		cancelled = true;
		abortController?.abort();
	});

	return { data, loading, status, error, errorCode, start, stop };
}
