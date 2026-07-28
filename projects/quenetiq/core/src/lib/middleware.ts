import { Observable, map } from 'rxjs';
import type { GraphQLResult } from './graphql.service';

export interface GraphqlRequestContext {
	query: string;
	variables: Record<string, unknown>;
	headers: Record<string, string>;
	type: 'query' | 'mutation';
	/** Override the endpoint for this request. Falls back to config.endpoint. */
	endpoint?: string;
	/** Arbitrary JSON extensions sent in the request body (e.g. persisted queries). */
	extensions?: Record<string, unknown>;
	/** Optional callback when typenames are extracted from query or mutation results. */
	onTypenamesExtracted?: (typenames: Set<string>) => void;
	/** HTTP method override. Defaults to POST. Use GET for CDN-cacheable hash-only persisted queries. */
	method?: 'GET' | 'POST';
	/** Per-request middleware override. Applied after global middleware. */
	overrideMiddleware?: GraphqlMiddleware[];
	/** Per-request error policy override. */
	overrideErrorPolicy?: 'none' | 'all' | 'ignore';
	/** Per-request retry count override. */
	overrideRetryCount?: number;
	/** Per-request retry delay override (ms). */
	overrideRetryDelay?: number;
}

export type GraphqlMiddlewareNext = (request: GraphqlRequestContext) => Observable<GraphQLResult<unknown>>;

export type GraphqlMiddleware = (
	request: GraphqlRequestContext,
	next: GraphqlMiddlewareNext,
) => Observable<GraphQLResult<unknown>>;

export function applyMiddleware(
	middleware: GraphqlMiddleware[],
	final: (request: GraphqlRequestContext) => Observable<GraphQLResult<unknown>>,
): (request: GraphqlRequestContext) => Observable<GraphQLResult<unknown>> {
	if (middleware.length === 0) return final;

	const chain = middleware.reduceRight<GraphqlMiddlewareNext>(
		(next, mw) => (req) => mw(req, next),
		final as GraphqlMiddlewareNext,
	);

	return (request) => chain(request);
}

export function authMiddleware(token: string, headerName = 'Authorization'): GraphqlMiddleware {
	return (request, next) => {
		request.headers[headerName] = /Bearer\s/.test(token) ? token : `Bearer ${token}`;
		return next(request);
	};
}

export function devAuthMiddleware(token?: string): GraphqlMiddleware {
	return (request, next) => {
		const resolved =
			token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('dev_token') : undefined) ?? 'dev-token';
		request.headers['Authorization'] = `Bearer ${resolved}`;
		return next(request);
	};
}

export function loggingMiddleware(label?: string): GraphqlMiddleware {
	return (request, next) => {
		const start = performance.now();
		return next(request).pipe(
			map((result) => {
				const duration = (performance.now() - start).toFixed(1);
				if (typeof console !== 'undefined') {
					// eslint-disable-next-line no-console
					console.log(`[${label ?? 'GraphQL'}] ${request.type} ${request.query.slice(0, 60)}… ${duration}ms`, result);
				}
				return result;
			}),
		);
	};
}

function findFiles(value: unknown): boolean {
	if (value instanceof File || value instanceof Blob) return true;
	if (Array.isArray(value)) return value.some((item) => findFiles(item));
	if (value !== null && typeof value === 'object') {
		return Object.values(value as Record<string, unknown>).some((v) => findFiles(v));
	}
	return false;
}

export function hasFiles(value: unknown): boolean {
	return findFiles(value);
}
