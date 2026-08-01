import { ref, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode } from '@quenetiq/client';
import { useClient } from './plugin';

interface FragmentIdentifier {
	__typename: string;
	id?: string;
}

export interface UseReactiveFragmentResult<TData> {
	data: Ref<TData | null>;
	complete: Ref<boolean>;
}

export function useReactiveFragment<TData extends Record<string, unknown>>(
	_fragment: DocumentNode | TypedDocumentNode<TData>,
	identifier: FragmentIdentifier | null,
): UseReactiveFragmentResult<TData> {
	const client = useClient();
	const data = ref<TData | null>(null) as Ref<TData | null>;
	const complete = ref(false);

	const load = (): void => {
		if (!identifier) {
			data.value = null;
			complete.value = false;
			return;
		}
		const cache = client.getCacheService();
		const id = identifier.id ?? '';
		const entity = cache?.query(identifier.__typename, id);
		if (!entity) {
			data.value = null;
			complete.value = false;
		} else {
			data.value = entity as unknown as TData;
			complete.value = true;
		}
	};

	load();

	return { data, complete };
}
