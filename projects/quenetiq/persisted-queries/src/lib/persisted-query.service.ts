import { Injectable, inject } from '@angular/core';
import { from, Observable, of, switchMap, tap } from 'rxjs';
import type { GraphQLResult, GraphqlMiddleware, GraphqlRequestContext } from '@quenetiq/core';
import { GraphqlService, type DocumentNode } from '@quenetiq/core';

async function sha256(message: string): Promise<string> {
	if (typeof crypto !== 'undefined' && crypto.subtle) {
		const encoder = new TextEncoder();
		const data = encoder.encode(message);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	let hash = 0;
	for (let i = 0; i < message.length; i++) {
		const char = message.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0;
	}
	return Math.abs(hash).toString(36);
}

function isPersistedQueryNotFound(result: GraphQLResult<unknown>): boolean {
	if (result.status === 'error' && result.graphQLErrors) {
		return result.graphQLErrors.some(
			(e) => e.message.includes('PersistedQueryNotFound') || e.message.includes('persistedQueryNotFound'),
		);
	}
	return false;
}

const hashCache = new Map<string, string>();
const registeredHashes = new Set<string>();

function withHashOnlyMethod(
	request: GraphqlRequestContext,
	config?: { useGetForHashedQueries?: boolean },
): Partial<GraphqlRequestContext> {
	return config?.useGetForHashedQueries ? { method: 'GET' } : {};
}

export function apqMiddleware(config?: { useGetForHashedQueries?: boolean }): GraphqlMiddleware {
	return (request, next) => {
		const hash = hashCache.get(request.query);
		if (hash && registeredHashes.has(hash)) {
			const extensions: Record<string, unknown> = {
				...request.extensions,
				persistedQuery: { version: 1, sha256Hash: hash },
			};
			return next({ ...request, query: '', extensions, ...withHashOnlyMethod(request, config) }).pipe(
				switchMap((result) => {
					if (isPersistedQueryNotFound(result)) {
						registeredHashes.delete(hash);
						return next({
							...request,
							query: request.query,
							extensions: { ...extensions, ...request.extensions },
						}).pipe(
							tap(() => {
								const h = hashCache.get(request.query);
								if (h) registeredHashes.add(h);
							}),
						);
					}
					return of(result);
				}),
			);
		}

		return from(sha256(request.query)).pipe(
			switchMap((computedHash) => {
				hashCache.set(request.query, computedHash);
				const extensions: Record<string, unknown> = {
					persistedQuery: { version: 1, sha256Hash: computedHash },
				};

				return next({ ...request, query: '', extensions, ...withHashOnlyMethod(request, config) }).pipe(
					switchMap((result) => {
						if (isPersistedQueryNotFound(result)) {
							return next({
								...request,
								query: request.query,
								extensions: { ...extensions, ...request.extensions },
							}).pipe(tap(() => registeredHashes.add(computedHash)));
						}
						registeredHashes.add(computedHash);
						return of(result);
					}),
				);
			}),
		);
	};
}

@Injectable({ providedIn: 'root' })
export class PersistedQueryService {
	private readonly svc = inject(GraphqlService);

	execute<T, TVars extends Record<string, unknown> = Record<string, unknown>>(
		document: DocumentNode,
		variables?: TVars,
	): Observable<GraphQLResult<T>> {
		return this.svc.query<T, TVars>(document, variables);
	}
}
