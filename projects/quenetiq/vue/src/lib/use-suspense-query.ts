import { ref, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, InferData, InferVars } from '@quenetiq/client';
import { useClient } from './plugin';

export interface UseSuspenseQueryResult<TData> {
	data: Ref<TData | null>;
	error: Ref<string | null>;
	loading: Ref<boolean>;
	promise: Promise<TData | undefined>;
}

export function useSuspenseQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	variables?: InferVars<TDocument>,
): UseSuspenseQueryResult<InferData<TDocument>> {
	type TData = InferData<TDocument>;
	const client = useClient();
	const data = ref<TData | null>(null) as Ref<TData | null>;
	const error = ref<string | null>(null);
	const loading = ref(true);

	const promise = client.query(document, variables).then((result) => {
		loading.value = false;
		if (result.status === 'error') {
			error.value = result.error;
			return undefined;
		}
		data.value = result.data;
		return result.data;
	});

	return { data, error, loading, promise };
}

export interface QueryRef<TData> {
	data: Ref<TData | null>;
	error: Ref<string | null>;
	loading: Ref<boolean>;
	refetch: () => Promise<GraphQLResult<TData>>;
}

export function useBackgroundQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	variables?: InferVars<TDocument>,
): QueryRef<InferData<TDocument>> {
	type TData = InferData<TDocument>;
	const client = useClient();
	const data = ref<TData | null>(null) as Ref<TData | null>;
	const error = ref<string | null>(null);
	const loading = ref(true);

	loading.value = true;
	client.query(document, variables).then((result) => {
		loading.value = false;
		if (result.status === 'error') {
			error.value = result.error;
			return;
		}
		data.value = result.data;
	});

	const refetch = async (vars?: InferVars<TDocument>): Promise<GraphQLResult<TData>> => {
		const result = await client.refetch(document, vars ?? variables);
		if (result.status === 'success') {
			data.value = result.data;
			error.value = null;
		} else {
			error.value = result.error;
		}
		return result;
	};

	return { data, error, loading, refetch };
}

export function useReadQuery<TData>(queryRef: QueryRef<TData>): { data: Ref<TData | null> } {
	return { data: queryRef.data };
}
