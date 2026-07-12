import { ref, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, InferData, InferVars } from '@dumbql/client';
import type { CacheStore } from '@dumbql/cache';
import { useClient } from './plugin';

export interface UseMutationOptions<TData, TVariables> {
	variables?: TVariables;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
	update?: (cache: CacheStore, result: GraphQLResult<TData>) => void;
	optimistic?: (cache: CacheStore) => string;
}

export type UseMutationFn<TData, TVariables> = (variables?: TVariables) => Promise<GraphQLResult<TData>>;

export interface UseMutationResult<TData, TVariables> {
	data: Ref<TData | null>;
	loading: Ref<boolean>;
	error: Ref<string | null>;
	errorCode: Ref<ErrorCode | undefined>;
	called: Ref<boolean>;
	mutate: UseMutationFn<TData, TVariables>;
}

export function useMutation<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseMutationOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseMutationResult<InferData<TDocument>, InferVars<TDocument>> {
	type TData = InferData<TDocument>;
	type TVariables = InferVars<TDocument>;

	const client = useClient();
	const data = ref<TData | null>(null) as Ref<TData | null>;
	const loading = ref(false);
	const error = ref<string | null>(null);
	const errorCode = ref<ErrorCode | undefined>(undefined);
	const called = ref(false);

	let optimisticId: string | undefined;

	const mutate: UseMutationFn<TData, TVariables> = async (variables?: TVariables) => {
		loading.value = true;
		called.value = true;
		error.value = null;
		errorCode.value = undefined;
		data.value = null;

		const cache = client.getCacheService();
		if (cache && options?.optimistic) {
			optimisticId = options.optimistic(cache);
		}

		const result = await client.mutate(document, variables ?? options?.variables);

		if (result.status === 'success') {
			data.value = result.data;
			options?.onCompleted?.(result.data);
			if (cache && options?.update) {
				options.update(cache, result);
			}
			if (cache && optimisticId) {
				cache.commitOptimistic(optimisticId);
				optimisticId = undefined;
			}
		} else {
			error.value = result.error;
			errorCode.value = result.errorCode;
			options?.onError?.(result.error, result.errorCode);
			if (cache && optimisticId) {
				cache.rollbackOptimistic(optimisticId);
				optimisticId = undefined;
			}
		}

		loading.value = false;
		return result;
	};

	return { data, loading, error, errorCode, called, mutate };
}
