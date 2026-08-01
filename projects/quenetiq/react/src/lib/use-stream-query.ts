import { useState, useCallback, useRef, useEffect } from 'react';
import type { DocumentNode, TypedDocumentNode, ErrorCode, InferData, InferVars } from '@quenetiq/client';
import { useClient } from './provider';

export interface UseStreamQueryOptions<TData, TVariables> {
	variables?: TVariables;
	onData?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
	onCompleted?: (data: TData) => void;
}

export type StreamStatus = 'idle' | 'streaming' | 'completed' | 'error';

export interface UseStreamQueryResult<TData> {
	data: TData | null;
	loading: boolean;
	status: StreamStatus;
	error: string | null;
	errorCode: ErrorCode | undefined;
	/** Start or restart the stream. */
	start: () => void;
	/** Abort the in-progress stream. */
	stop: () => void;
}

/**
 * Hook for `@defer`/`@stream` queries.
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

	const [data, setData] = useState<TData | null>(null);
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<StreamStatus>('idle');
	const [error, setError] = useState<string | null>(null);
	const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);

	const abortRef = useRef<AbortController | null>(null);
	const mountedRef = useRef(true);
	const latestDataRef = useRef<TData | null>(null);
	const onDataRef = useRef(options?.onData);
	const onErrorRef = useRef(options?.onError);
	const onCompletedRef = useRef(options?.onCompleted);
	onDataRef.current = options?.onData;
	onErrorRef.current = options?.onError;
	onCompletedRef.current = options?.onCompleted;

	useEffect(() => {
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const start = useCallback(() => {
		abortRef.current?.abort();
		abortRef.current = new AbortController();

		setLoading(true);
		setStatus('streaming');
		setError(null);
		setErrorCode(undefined);
		latestDataRef.current = null;

		const iterate = async (): Promise<void> => {
			try {
				const iterable = client.queryDefer<TDocument>(document, variables);

				for await (const result of iterable) {
					if (!mountedRef.current) return;

					if (result.status === 'success') {
						latestDataRef.current = result.data;
						setData(result.data);
						onDataRef.current?.(result.data);
					} else {
						setError(result.error);
						setErrorCode(result.errorCode);
						setStatus('error');
						onErrorRef.current?.(result.error, result.errorCode);
						setLoading(false);
						return;
					}
				}

				if (mountedRef.current) {
					setStatus('completed');
					setLoading(false);
					if (latestDataRef.current !== null) {
						onCompletedRef.current?.(latestDataRef.current);
					}
				}
			} catch (err) {
				if (!mountedRef.current) return;
				if (err instanceof DOMException && err.name === 'AbortError') return;
				const msg = err instanceof Error ? err.message : 'Stream failed';
				setError(msg);
				setStatus('error');
				setLoading(false);
				onErrorRef.current?.(msg);
			}
		};

		iterate();
	}, [client, document, variables]);

	const stop = useCallback(() => {
		abortRef.current?.abort();
		abortRef.current = null;
		setLoading(false);
		if (status === 'streaming') {
			setStatus('idle');
		}
	}, [status]);

	return { data, loading, status, error, errorCode, start, stop };
}
