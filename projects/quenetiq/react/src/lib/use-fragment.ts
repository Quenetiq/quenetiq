import { useState, useEffect, useCallback, useRef } from 'react';
import type { DocumentNode, TypedDocumentNode } from '@quenetiq/client';
import { useCache } from './provider';

interface FragmentIdentifier {
	__typename: string;
	id?: string;
}

export interface UseFragmentResult<TData> {
	data: TData | null;
	complete: boolean;
}

function extractTopLevelFields(document: DocumentNode | TypedDocumentNode): string[] {
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
	identifier: FragmentIdentifier | null,
): UseFragmentResult<TData> {
	const cache = useCache();
	const [data, setData] = useState<TData | null>(null);
	const [complete, setComplete] = useState(false);
	const fragmentRef = useRef(fragment);
	fragmentRef.current = fragment;

	const identifierKey = identifier ? `${identifier.__typename}:${identifier.id ?? ''}` : null;
	const fieldsRef = useRef<string[]>([]);
	fieldsRef.current = useCallback(
		() => extractTopLevelFields(fragmentRef.current),
		[fragmentRef],
	)();

	const readFragment = useCallback(() => {
		if (!cache || !identifier) {
			setData(null);
			setComplete(false);
			return;
		}

		const currentFields = extractTopLevelFields(fragmentRef.current);
		if (currentFields.length > 0) {
			const masked = cache.readFragment<TData>(
				identifier.__typename,
				identifier.id ?? '',
				currentFields,
			);
			if (masked) {
				setData(masked);
				setComplete(true);
			} else {
				const full = cache.query(identifier.__typename, identifier.id ?? '');
				if (full) {
					const picked: Record<string, unknown> = {};
					for (const field of currentFields) {
						if (field in full) picked[field] = full[field];
					}
					setData(picked as TData);
					setComplete(true);
				} else {
					setData(null);
					setComplete(false);
				}
			}
		} else {
			const entity = cache.query(identifier.__typename, identifier.id ?? '');
			setData(entity as TData | null);
			setComplete(entity !== undefined);
		}
	}, [cache, identifier]);

	useEffect(() => {
		readFragment();

		if (!cache || !identifier) return;

		const unsub = cache.events.on((event) => {
			if (event.type === 'write' || event.type === 'merge') {
				const entity = event.data.entity;
				if (entity.__typename === identifier.__typename && entity.id === identifier.id) {
					readFragment();
				}
			} else if (event.type === 'evict') {
				if (event.data.typename === identifier.__typename && event.data.id === identifier.id) {
					setData(null);
					setComplete(false);
				}
			}
		});

		return unsub;
	}, [cache, identifierKey, readFragment]);

	return { data, complete };
}
