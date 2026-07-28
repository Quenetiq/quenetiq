import { Observable, Subscriber } from 'rxjs';
import type { GraphQLResult } from './graphql.service';
import type { GraphqlMiddleware, GraphqlRequestContext } from './middleware';

// ── Types ────────────────────────────────────────────────────────────────────

export interface IncrementalPayload {
	data?: Record<string, unknown>;
	path?: (string | number)[];
	errors?: { message: string }[];
	items?: unknown[];
	label?: string;
	extensions?: Record<string, unknown>;
}

export interface IncrementalResponse<T> {
	data?: T;
	errors?: { message: string }[];
	incremental?: IncrementalPayload[];
	hasNext?: boolean;
}

// ── Stream parser ────────────────────────────────────────────────────────────

export function parseMultipartContentType(contentType: string): string | null {
	const match = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
	return match ? (match[1] ?? match[2]) : null;
}

/**
 * Parses a `multipart/mixed` response body into individual JSON chunks.
 * Each chunk is yielded as a parsed object.
 */
export function parseMultipartResponse(body: string, boundary: string): Observable<Record<string, unknown>> {
	return new Observable((subscriber: Subscriber<Record<string, unknown>>) => {
		const parts = body.split(`--${boundary}`);

		for (const part of parts) {
			const trimmed = part.trim();
			if (!trimmed || trimmed === '--') continue;

			const jsonStart = trimmed.indexOf('\n\n');
			if (jsonStart === -1) continue;

			const jsonStr = trimmed.slice(jsonStart + 2).trim();
			if (!jsonStr) continue;

			try {
				const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
				subscriber.next(parsed);
			} catch {
				// skip malformed chunks
			}
		}

		subscriber.complete();
	});
}

// ── Data patcher ─────────────────────────────────────────────────────────────

/**
 * Applies an incremental patch to the previous data object.
 * The `path` array describes the location in the data tree to patch.
 */
export function applyPatch<T>(data: T, path: (string | number)[], value: unknown): T {
	const result = structuredClone(data) as Record<string, unknown>;

	let current = result;
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i];
		if (current[key] === undefined || current[key] === null) {
			const next = path[i + 1];
			current[key] = typeof next === 'number' ? [] : {};
		}
		current = current[key] as Record<string, unknown>;
	}

	const lastKey = path[path.length - 1];
	current[lastKey] = value;

	return result as T;
}

/**
 * Applies `@stream` items to the data — appends items to an array at the given path.
 */
export function applyStreamItems<T>(data: T, path: (string | number)[], items: unknown[]): T {
	const result = structuredClone(data) as Record<string, unknown>;

	let current = result;
	for (const key of path) {
		if (current[key] === undefined) {
			current[key] = [];
		}
		current = current[key] as Record<string, unknown>;
	}

	if (Array.isArray(current)) {
		current.push(...items);
	}

	return result as T;
}

// ── Middleware ───────────────────────────────────────────────────────────────

/**
 * Middleware that handles GraphQL incremental delivery (`@defer` / `@stream`).
 *
 * When the response contains `incremental` patches, this middleware emits
 * updated `GraphQLResult` values for each patch, keeping the previous data
 * as base.
 */
export function streamingMiddleware(): GraphqlMiddleware {
	return (request: GraphqlRequestContext, next) => {
		return new Observable<GraphQLResult<unknown>>((subscriber) => {
			const result$ = next(request);
			let baseData: Record<string, unknown> | null = null;

			const sub = result$.subscribe({
				next: (result) => {
					if (result.status !== 'success') {
						subscriber.next(result);
						return;
					}

					const response = result.data as unknown as IncrementalResponse<unknown>;

					if (response.incremental) {
						if (!baseData) {
							baseData = (response.data as Record<string, unknown>) ?? {};
						}

						for (const patch of response.incremental) {
							if (patch.path !== undefined && patch.data !== undefined) {
								baseData = applyPatch(baseData, patch.path, patch.data);
							}
							if (patch.items !== undefined && patch.path !== undefined) {
								baseData = applyStreamItems(baseData, patch.path, patch.items);
							}
						}

						subscriber.next({ status: 'success', data: baseData } as GraphQLResult<unknown>);
					} else {
						subscriber.next(result);
					}
				},
				error: (err) => subscriber.error(err),
				complete: () => subscriber.complete(),
			});

			return () => sub.unsubscribe();
		});
	};
}
