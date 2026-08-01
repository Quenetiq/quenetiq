import { ref, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, InferData, InferVars } from '@quenetiq/client';
import { useClient } from './plugin';

export interface UseInfiniteQueryOptions<TData, TVariables> {
	readonly variables?: TVariables;
	readonly getNextPageParam: (lastPage: TData) => TVariables | undefined;
	readonly mergePages?: (pages: TData[]) => TData;
	readonly onCompleted?: (data: TData) => void;
	readonly onError?: (error: string, errorCode?: ErrorCode) => void;
}

export interface UseInfiniteQueryResult<TData> {
	readonly data: Ref<TData | null>;
	readonly loading: Ref<boolean>;
	readonly isFetchingMore: Ref<boolean>;
	readonly hasNextPage: Ref<boolean>;
	readonly error: Ref<string | null>;
	readonly errorCode: Ref<ErrorCode | undefined>;
	readonly fetchMore: () => Promise<void>;
}

export function useInfiniteQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options: UseInfiniteQueryOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseInfiniteQueryResult<InferData<TDocument>> {
	type TData = InferData<TDocument>;
	type TVariables = InferVars<TDocument>;

	const client = useClient();
	const data = ref<TData | null>(null) as Ref<TData | null>;
	const loading = ref(true);
	const isFetchingMore = ref(false);
	const hasNextPage = ref(true);
	const error = ref<string | null>(null);
	const errorCode = ref<ErrorCode | undefined>(undefined);

	const pages: TData[] = [];
	let abortController: AbortController | null = null;

	const executePage = (variables: TVariables): Promise<GraphQLResult<TData>> => {
		abortController?.abort();
		abortController = new AbortController();
		return Promise.resolve(
			client.query<TDocument>(document, variables, undefined, { signal: abortController.signal }),
		);
	};

	const fetchMore = async (): Promise<void> => {
		if (isFetchingMore.value || !hasNextPage.value) return;

		isFetchingMore.value = true;
		error.value = null;
		errorCode.value = undefined;

		try {
			const lastPage = pages[pages.length - 1];
			const nextPageVariables = options.getNextPageParam(lastPage);
			if (nextPageVariables === undefined) {
				hasNextPage.value = false;
				isFetchingMore.value = false;
				return;
			}

			const result = await executePage(nextPageVariables as TVariables);

			if (result.status === 'success') {
				pages.push(result.data);
				data.value = options.mergePages
					? options.mergePages(pages)
					: (pages as unknown as TData);
				loading.value = false;

				const nextCursor = options.getNextPageParam(result.data);
				if (nextCursor === undefined) {
					hasNextPage.value = false;
					options.onCompleted?.(data.value);
				}
			} else {
				error.value = result.error;
				errorCode.value = result.errorCode;
				options.onError?.(result.error, result.errorCode);
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			error.value = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			isFetchingMore.value = false;
		}
	};

	// Initial query
	executePage(options.variables as TVariables).then((result) => {
		if (result.status === 'success') {
			pages.push(result.data);
			data.value = options.mergePages
				? options.mergePages(pages)
				: (pages as unknown as TData);
			loading.value = false;

			const nextCursor = options.getNextPageParam(result.data);
			if (nextCursor === undefined) {
				hasNextPage.value = false;
				options.onCompleted?.(data.value);
			}
		} else {
			error.value = result.error;
			errorCode.value = result.errorCode;
			loading.value = false;
			options.onError?.(result.error, result.errorCode);
		}
	}).catch((err) => {
		if (err instanceof DOMException && err.name === 'AbortError') return;
		error.value = err instanceof Error ? err.message : 'Unknown error';
		loading.value = false;
	});

	return { data, loading, isFetchingMore, hasNextPage, error, errorCode, fetchMore };
}
