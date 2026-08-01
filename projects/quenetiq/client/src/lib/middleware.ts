import type { GraphQLResult } from './result';

export type FetchPolicy = 'cache-first' | 'network-only' | 'cache-and-network' | 'no-cache';

export interface GraphqlRequestContext {
	query: string;
	variables: Record<string, unknown>;
	headers: Record<string, string>;
	type: 'query' | 'mutation';
	endpoint?: string;
	extensions?: Record<string, unknown>;
	onTypenamesExtracted?: (typenames: Set<string>) => void;
	/** HTTP method override. Defaults to POST. Use GET for CDN-cacheable hash-only persisted queries. */
	method?: 'GET' | 'POST';
	/** Controls how the cache middleware handles cached data. */
	fetchPolicy?: FetchPolicy;
	/** AbortSignal to cancel the request. */
	signal?: AbortSignal;
}

export type GraphqlMiddlewareNext<T = unknown> = (request: GraphqlRequestContext) => Promise<GraphQLResult<T>>;

export type GraphqlMiddleware<T = unknown> = (
	request: GraphqlRequestContext,
	next: GraphqlMiddlewareNext<T>,
) => Promise<GraphQLResult<T>>;

export type TypedPipeline = <T>(request: GraphqlRequestContext) => Promise<GraphQLResult<T>>;

export function buildTypedPipeline(
	middleware: GraphqlMiddleware[],
	final: GraphqlMiddlewareNext,
): TypedPipeline {
	if (middleware.length === 0) {
		return final as TypedPipeline;
	}

	const chain = middleware.reduceRight<GraphqlMiddlewareNext>(
		(next, mw) => (req) => mw(req, next),
		final as GraphqlMiddlewareNext,
	);

	return ((request: GraphqlRequestContext) => chain(request)) as TypedPipeline;
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
	return async (request, next) => {
		const start = performance.now();
		const result = await next(request);
		const duration = (performance.now() - start).toFixed(1);
		if (typeof console !== 'undefined') {
			// eslint-disable-next-line no-console
			console.log(`[${label ?? 'GraphQL'}] ${request.type} ${request.query.slice(0, 60)}… ${duration}ms`, result);
		}
		return result;
	};
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findFiles(value: unknown): boolean {
	if (value instanceof File || value instanceof Blob) return true;
	if (Array.isArray(value)) return value.some((item) => findFiles(item));
	if (isNonNullObject(value)) {
		return Object.values(value).some((v) => findFiles(v));
	}
	return false;
}

export function hasFiles(value: unknown): boolean {
	return findFiles(value);
}
