import { BehaviorSubject, type Observable } from 'rxjs';
import { query, type DocumentNode, type GraphQLResult } from '@quenetiq/core';

export interface OffsetPaginationState<T> {
	items: T[];
	offset: number;
	limit: number;
	hasMore: boolean;
	loading: boolean;
	error: string | null;
}

export interface OffsetPaginationResult<T> {
	items: T[];
	totalCount: number;
	hasMore: boolean;
}

export interface OffsetPaginationConfig {
	limit?: number;
	offset?: number;
}

export function offsetPagination<T, TVars extends Record<string, unknown> = Record<string, unknown>>(
	document: DocumentNode,
	options: { limit?: number; variables?: TVars },
): {
	state: Observable<OffsetPaginationState<T>>;
	loadMore: () => void;
	refresh: () => void;
} {
	const state$ = new BehaviorSubject<OffsetPaginationState<T>>({
		items: [],
		offset: 0,
		limit: options.limit ?? 20,
		hasMore: true,
		loading: false,
		error: null,
	});

	function fetchPage(offset: number): void {
		const prev = state$.value;
		state$.next({ ...prev, loading: true, error: null });

		query<DocumentNode, T, TVars>(document, undefined, {
			...options.variables,
			offset,
			limit: prev.limit,
		} as unknown as TVars).result$.subscribe((result: GraphQLResult<T>) => {
			if (result.status === 'success') {
				const data = result.data as unknown as { items?: T[] };
				const items = data?.items ?? [];
				state$.next({
					items: offset === 0 ? items : [...prev.items, ...items],
					offset,
					limit: prev.limit,
					hasMore: ((data as Record<string, unknown>)?.['hasMore'] as boolean) ?? items.length === prev.limit,
					loading: false,
					error: null,
				});
			} else {
				state$.next({ ...prev, loading: false, error: result.error });
			}
		});
	}

	return {
		state: state$.asObservable(),
		loadMore: () => {
			const s = state$.value;
			if (!s.loading && s.hasMore) fetchPage(s.offset + s.limit);
		},
		refresh: () => fetchPage(0),
	};
}

export function offsetMerge<T = unknown>(
	existing: T[] | undefined,
	incoming: T[],
	_options?: { args?: Record<string, unknown> },
): T[] {
	if (!existing) return incoming;
	const offset = (_options?.args?.['offset'] as number | undefined) ?? 0;
	const merged = [...existing];
	for (let i = 0; i < incoming.length; i++) {
		merged[offset + i] = incoming[i];
	}
	return merged.filter((item) => item !== undefined);
}
