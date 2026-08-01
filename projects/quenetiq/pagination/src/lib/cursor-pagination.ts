import { query, type DocumentNode, type QueryHandle } from '@quenetiq/core';

export interface PageInfo {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startCursor: string | null;
	endCursor: string | null;
}

export interface CursorEdge<T> {
	node: T;
	cursor: string;
}

export interface CursorConnection<T> {
	edges: CursorEdge<T>[];
	pageInfo: PageInfo;
	totalCount?: number;
}

export interface CursorPaginationResult<T> {
	items: T[];
	cursor: string | null;
	hasMore: boolean;
}

export interface CursorPaginationConfig {
	first?: number;
	after?: string;
}

export function cursorPagination<T, TVars extends Record<string, unknown> = Record<string, unknown>>(
	document: DocumentNode,
	variables?: TVars,
): QueryHandle<CursorConnection<T>> {
	return query<DocumentNode, CursorConnection<T>, TVars>(document, undefined, variables);
}

export function cursorMerge<T = unknown>(existing: T[] | undefined, incoming: T[]): T[] {
	if (!existing) return incoming;
	return [...existing, ...incoming];
}
