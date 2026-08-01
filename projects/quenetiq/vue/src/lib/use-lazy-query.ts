import { ref, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode, GraphQLResult, ErrorCode, InferData, InferVars } from '@quenetiq/client';
import { useClient } from './plugin';

export interface UseLazyQueryOptions<TData, TVariables> {
	variables?: TVariables;
	onCompleted?: (data: TData) => void;
	onError?: (error: string, errorCode?: ErrorCode) => void;
}

export interface UseLazyQueryResult<TData, TVariables> {
	data: Ref<TData | null>;
	loading: Ref<boolean>;
	error: Ref<string | null>;
	errorCode: Ref<ErrorCode | undefined>;
	called: Ref<boolean>;
	execute: (vars?: TVariables) => Promise<GraphQLResult<TData>>;
}

/**
 * Lazy query composable — does not execute until `execute()` is called.
 */
export function useLazyQuery<TDocument extends DocumentNode | TypedDocumentNode>(
	document: TDocument,
	options?: UseLazyQueryOptions<InferData<TDocument>, InferVars<TDocument>>,
): UseLazyQueryResult<InferData<TDocument>, InferVars<TDocument>> {
	type TData = InferData<TDocument>;
	type TVariables = InferVars<TDocument>;

	const client = useClient();

	const data = ref<TData | null>(null) as Ref<TData | null>;
	const loading = ref(false);
	const error = ref<string | null>(null);
	const errorCode = ref<ErrorCode | undefined>(undefined);
	const called = ref(false);

	const execute = async (vars?: TVariables): Promise<GraphQLResult<TData>> => {
		loading.value = true;
		called.value = true;
		error.value = null;
		errorCode.value = undefined;

		const result = await client.query(document, vars ?? options?.variables);

		loading.value = false;

		if (result.status === 'success') {
			data.value = result.data;
			error.value = null;
			errorCode.value = undefined;
			options?.onCompleted?.(result.data);
		} else {
			error.value = result.error;
			errorCode.value = result.errorCode;
			options?.onError?.(result.error, result.errorCode);
		}

		return result;
	};

	return { data, loading, error, errorCode, called, execute };
}
