import { ref, readonly, watch, onMounted, onUnmounted, type Ref } from 'vue';
import type { DocumentNode, TypedDocumentNode } from '@quenetiq/client';
import { useClient } from './plugin';

interface FragmentIdentifier {
	__typename: string;
	id?: string;
}

export interface UseFragmentResult<TData> {
	data: Readonly<Ref<TData | null>>;
	complete: Readonly<Ref<boolean>>;
}

function extractTopLevelFields(document: DocumentNode | TypedDocumentNode): string[] {
	if (!document.definitions) return [];
	const fields: string[] = [];
	for (const def of document.definitions) {
		if (def.kind === 'FragmentDefinition' || def.kind === 'OperationDefinition') {
			for (const sel of def.selectionSet?.selections ?? []) {
				if (sel.kind === 'Field' && sel.name.value !== '__typename') {
					fields.push(sel.name.value);
				}
			}
		}
	}
	return fields;
}

export function useFragment<TData extends Record<string, unknown>>(
	fragment: DocumentNode | TypedDocumentNode<TData>,
	identifier: Ref<FragmentIdentifier | null> | FragmentIdentifier | null,
): UseFragmentResult<TData> {
	const client = useClient();
	const data = ref<TData | null>(null) as Ref<TData | null>;
	const complete = ref(false);

	let unsub: (() => void) | null = null;

	const readFragment = (): void => {
		const cache = client.getCacheService();
		const idRef = identifier && 'value' in identifier ? identifier.value : identifier;

		if (!cache || !idRef) {
			data.value = null;
			complete.value = false;
			return;
		}

		const currentFields = extractTopLevelFields(fragment);
		if (currentFields.length > 0) {
			const masked = cache.readFragment<TData>(
				idRef.__typename,
				idRef.id ?? '',
				currentFields,
			);
			if (masked) {
				data.value = masked;
				complete.value = true;
			} else {
				const full = cache.query(idRef.__typename, idRef.id ?? '');
				if (full) {
					const picked: Record<string, unknown> = {};
					for (const field of currentFields) {
						if (field in full) picked[field] = full[field];
					}
					data.value = picked as TData;
					complete.value = true;
				} else {
					data.value = null;
					complete.value = false;
				}
			}
		} else {
			const entity = cache.query(idRef.__typename, idRef.id ?? '');
			data.value = entity as TData | null;
			complete.value = entity != null;
		}
	};

	const subscribe = (): void => {
		const cache = client.getCacheService();
		const idRef = identifier && 'value' in identifier ? identifier.value : identifier;

		if (!cache || !idRef) return;

		unsub?.();
		unsub = cache.events.on((event) => {
			const currentId = identifier && 'value' in identifier ? identifier.value : identifier;
			if (!currentId) return;

			if (event.type === 'write' || event.type === 'merge') {
				const entity = event.data.entity;
				if (entity.__typename === currentId.__typename && entity.id === currentId.id) {
					readFragment();
				}
			} else if (event.type === 'evict') {
				if (event.data.typename === currentId.__typename && event.data.id === currentId.id) {
					data.value = null;
					complete.value = false;
				}
			}
		});
	};

	readFragment();
	onMounted(() => {
		subscribe();
	});

	onUnmounted(() => {
		unsub?.();
	});

	if (identifier && 'value' in identifier) {
		watch(identifier, () => {
			readFragment();
			subscribe();
		});
	}

	return { data: readonly(data), complete: readonly(complete) };
}
