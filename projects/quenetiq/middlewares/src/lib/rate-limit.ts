import { of } from 'rxjs';
import { type GraphqlMiddleware, type GraphQLResult } from '@quenetiq/core';

export interface RateLimitConfig {
	maxRequests?: number;
	windowMs?: number;
	key?: (request: { query: string; variables?: Record<string, unknown> }) => string;
}

export function rateLimitMiddleware(config?: RateLimitConfig): GraphqlMiddleware {
	const maxRequests = config?.maxRequests ?? 10;
	const windowMs = config?.windowMs ?? 1000;
	const getKey = config?.key ?? (() => 'default');

	const windows = new Map<string, { count: number; resetAt: number }>();

	return (request, next) => {
		const key = getKey(request);
		const now = Date.now();

		let entry = windows.get(key);
		if (!entry || now >= entry.resetAt) {
			entry = { count: 0, resetAt: now + windowMs };
			windows.set(key, entry);
		}

		entry.count++;

		if (entry.count > maxRequests) {
			const retryAfter = entry.resetAt - now;
			const errorResult: GraphQLResult<never> = {
				status: 'error',
				error: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs}ms. Retry after ${retryAfter}ms.`,
				errorCode: 'RATE_LIMITED',
				networkError: true,
			};
			return of(errorResult);
		}

		return next(request);
	};
}
