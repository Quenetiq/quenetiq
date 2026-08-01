import { useState, useCallback, useRef } from 'react';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, InferData, InferVars } from '@quenetiq/client';
import type { CacheStore, CacheEntity, OptimisticUpdate } from '@quenetiq/cache';
import { useClient, useCache } from './provider';

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
	data: TData | null;
	loading: boolean;
	error: string | null;
	errorCode?: ErrorCode;
	called: boolean;
	mutate: UseMutationFn<TData, TVariables>;
}

export function useMutation<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseMutationOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseMutationResult<InferData<TDocument>, InferVars<TDocument>> {
	type TData = InferData<TDocument>;
	type TVariables = InferVars<TDocument>;

	const client = useClient();
	const cache = useCache();
	const [result, setResult] = useState<GraphQLResult<TData> | null>(null);
	const [loading, setLoading] = useState(false);
	const [called, setCalled] = useState(false);

	const onCompletedRef = useRef(options?.onCompleted);
	const onErrorRef = useRef(options?.onError);
	const updateRef = useRef(options?.update);
	onCompletedRef.current = options?.onCompleted;
	onErrorRef.current = options?.onError;
	updateRef.current = options?.update;

	const optimisticIdRef = useRef<string | null>(null);

	const mutate = useCallback<UseMutationFn<TData, TVariables>>(
		async (variables?: TVariables) => {
			setLoading(true);
			setCalled(true);

			if (cache && options?.optimistic) {
				optimisticIdRef.current = options.optimistic(cache);
			} else if (cache && options?.optimisticResponse) {
				try {
					const id = `optimistic:${Date.now()}:${Math.random().toString(36).slice(2)}`;
					const update = buildOptimisticUpdate(options.optimisticResponse, id);
					cache.applyOptimistic(update);
					optimisticIdRef.current = id;
				} catch { /* best-effort */ }
			}

			const opts = options?.variables as TVariables | undefined;
			const res = await client.mutate(document, variables ?? opts);
			setResult(res);
			setLoading(false);

			if (res.status === 'success') {
				onCompletedRef.current?.(res.data);
				if (cache && updateRef.current) {
					updateRef.current(cache, res);
				}
				if (cache && optimisticIdRef.current) {
					cache.commitOptimistic(optimisticIdRef.current);
					optimisticIdRef.current = null;
				}
			} else {
				onErrorRef.current?.(res.error, res.errorCode);
				if (cache && optimisticIdRef.current) {
					cache.rollbackOptimistic(optimisticIdRef.current);
					optimisticIdRef.current = null;
				}
			}

			return res;
		},
		[client, document, cache, options?.variables, options?.optimistic, options?.optimisticResponse],
	);

	const data = result?.status === 'success' ? result.data : null;
	const error = result?.status === 'error' ? result.error : null;
	const errorCode = result?.status === 'error' ? result.errorCode : undefined;

	return { data, loading, error, errorCode, called, mutate };
}
