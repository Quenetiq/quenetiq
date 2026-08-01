import { useState, useCallback, useRef } from 'react';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, InferData, InferVars } from '@quenetiq/client';
import { useClient } from './provider';

export interface UseInfiniteQueryOptions<TData, TVariables> {
	/** Base variables for the initial query (excluding cursor). */
	readonly variables?: TVariables;
	/** Extract the cursor from the last page for the next page. */
	readonly getNextPageParam: (lastPage: TData) => TVariables | undefined;
	/** Merge all pages into a single value. Default: identity (returns pages array). */
	readonly mergePages?: (pages: TData[]) => TData;
	/** Called when all pages have been loaded. */
	readonly onCompleted?: (data: TData) => void;
	/** Called on error. */
	readonly onError?: (error: string, errorCode?: ErrorCode) => void;
}

export interface UseInfiniteQueryResult<TData> {
	/** The merged data from all loaded pages. */
	readonly data: TData | null;
	/** Whether the initial load is in progress. */
	readonly loading: boolean;
	/** Whether the next page is being fetched. */
	readonly isFetchingMore: boolean;
	/** Whether there are more pages to load. */
	readonly hasNextPage: boolean;
	/** The current error message, if any. */
	readonly error: string | null;
	/** The current error code, if any. */
	readonly errorCode: ErrorCode | undefined;
	/** Fetch the next page. */
	readonly fetchMore: () => Promise<void>;
}

export function useInfiniteQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options: UseInfiniteQueryOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseInfiniteQueryResult<InferData<TDocument>> {
	type TData = InferData<TDocument>;
	type TVariables = InferVars<TDocument>;

	const client = useClient();
	const [data, setData] = useState<TData | null>(null);
	const [loading, setLoading] = useState(true);
	const [isFetchingMore, setIsFetchingMore] = useState(false);
	const [hasNextPage, setHasNextPage] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);

	const pagesRef = useRef<TData[]>([]);
	const abortRef = useRef<AbortController | null>(null);
	const onCompletedRef = useRef(options.onCompleted);
	const onErrorRef = useRef(options.onError);
	onCompletedRef.current = options.onCompleted;
	onErrorRef.current = options.onError;

	const executePage = useCallback((variables: TVariables): Promise<GraphQLResult<TData>> => {
		abortRef.current?.abort();
		abortRef.current = new AbortController();
		return Promise.resolve(
			client.query<TDocument>(document, variables, undefined, { signal: abortRef.current.signal }),
		);
	}, [client, document]);

	const fetchMore = useCallback(async () => {
		if (isFetchingMore || !hasNextPage) return;

		setIsFetchingMore(true);
		setError(null);
		setErrorCode(undefined);

		try {
			const lastPage = pagesRef.current[pagesRef.current.length - 1];
			const nextPageVariables = options.getNextPageParam(lastPage);
			if (nextPageVariables === undefined) {
				setHasNextPage(false);
				setIsFetchingMore(false);
				return;
			}

			const result = await executePage(nextPageVariables as TVariables);

			if (result.status === 'success') {
				pagesRef.current = [...pagesRef.current, result.data];
				const merged = options.mergePages
					? options.mergePages(pagesRef.current)
					: pagesRef.current as unknown as TData;
				setData(merged);
				setLoading(false);

				// Check if there's a next page
				const nextCursor = options.getNextPageParam(result.data);
				if (nextCursor === undefined) {
					setHasNextPage(false);
					onCompletedRef.current?.(merged);
				}
			} else {
				setError(result.error);
				setErrorCode(result.errorCode);
				onErrorRef.current?.(result.error, result.errorCode);
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			setError(err instanceof Error ? err.message : 'Unknown error');
		} finally {
			setIsFetchingMore(false);
		}
	}, [isFetchingMore, hasNextPage, options, executePage]);

	// Initial query
	const initializedRef = useRef(false);
	if (!initializedRef.current) {
		initializedRef.current = true;
		executePage(options.variables as TVariables).then((result) => {
			if (result.status === 'success') {
				pagesRef.current = [result.data];
				const merged = options.mergePages
					? options.mergePages(pagesRef.current)
					: pagesRef.current as unknown as TData;
				setData(merged);
				setLoading(false);

				const nextCursor = options.getNextPageParam(result.data);
				if (nextCursor === undefined) {
					setHasNextPage(false);
					onCompletedRef.current?.(merged);
				}
			} else {
				setError(result.error);
				setErrorCode(result.errorCode);
				setLoading(false);
				onErrorRef.current?.(result.error, result.errorCode);
			}
		}).catch((err) => {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			setError(err instanceof Error ? err.message : 'Unknown error');
			setLoading(false);
		});
	}

	return { data, loading, isFetchingMore, hasNextPage, error, errorCode, fetchMore };
}
