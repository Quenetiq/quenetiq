import { ref, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, InferData, InferVars } from '@dumbql/client';
import type { CacheStore, CacheEntity, OptimisticUpdate } from '@dumbql/cache';
import { useClient } from './plugin';

function extractEntitiesFromData(data: unknown): { __typename: string; id: string }[] {
	const entities: { __typename: string; id: string }[] = [];
	if (!data || typeof data !== 'object') return entities;
	if (Array.isArray(data)) {
		for (const item of data) entities.push(...extractEntitiesFromData(item));
		return entities;
	}
	const obj = data as Record<string, unknown>;
	if (typeof obj['__typename'] === 'string' && (typeof obj['id'] === 'string' || typeof obj['id'] === 'number')) {
		entities.push({ __typename: obj['__typename'] as string, id: String(obj['id']) });
	}
	for (const v of Object.values(obj)) {
		if (v && typeof v === 'object') entities.push(...extractEntitiesFromData(v));
	}
	return entities;
}

function buildOptimisticUpdate(data: unknown, id: string): OptimisticUpdate {
	const entities = extractEntitiesFromData(data);
	return {
		id,
		apply: (cache: Map<string, CacheEntity>) => {
			for (const e of entities) {
				const key = `${e.__typename}:${e.id}`;
				const existing = cache.get(key);
				if (existing) {
					cache.set(key, { ...existing, ...e });
				} else {
					cache.set(key, e);
				}
			}
		},
		rollback: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
	};
}

export interface UseMutationOptions<TData, TVariables> {
	variables?: TVariables;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
	update?: (cache: CacheStore, result: GraphQLResult<TData>) => void;
	/** @deprecated Use optimisticResponse instead. Callback-based optimistic. */
	optimistic?: (cache: CacheStore) => string;
	/** Simpler API: pass the expected mutation response to apply optimistic entities. */
	optimisticResponse?: TData;
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
		} else if (cache && options?.optimisticResponse) {
			try {
				const id = `optimistic:${Date.now()}:${Math.random().toString(36).slice(2)}`;
				const update = buildOptimisticUpdate(options.optimisticResponse, id);
				cache.applyOptimistic(update);
				optimisticId = id;
			} catch { /* best-effort */ }
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
