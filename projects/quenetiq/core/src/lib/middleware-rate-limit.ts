import type { GraphqlMiddleware, GraphqlRequestContext } from './middleware';
import type { GraphQLResult } from './graphql.service';
import { type Observable, throwError } from 'rxjs';

export interface RateLimitConfig {
	/** Max requests allowed within the window. Default: 10 */
	maxRequests?: number;
	/** Window size in milliseconds. Default: 60000 (1 min) */
	windowMs?: number;
	/** Custom key function. Default: endpoint name */
	key?: (request: GraphqlRequestContext) => string;
	/** Callback when rate limited */
	onRateLimited?: (key: string, retryAfterMs: number) => void;
}

interface RateLimitEntry {
	timestamps: number[];
}

export function rateLimitMiddleware(config?: RateLimitConfig): GraphqlMiddleware {
	const maxRequests = config?.maxRequests ?? 10;
	const windowMs = config?.windowMs ?? 60_000;
	const buckets = new Map<string, RateLimitEntry>();

	const getKey = config?.key ?? ((req: GraphqlRequestContext) => req.endpoint ?? 'default');

	const cleanup = (entry: RateLimitEntry): void => {
		const cutoff = Date.now() - windowMs;
		entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
	};

	return (
		request: GraphqlRequestContext,
		next: (req: GraphqlRequestContext) => Observable<GraphQLResult<unknown>>,
	) => {
		const key = getKey(request);

		if (!buckets.has(key)) {
			buckets.set(key, { timestamps: [] });
		}

		const entry = buckets.get(key)!;
		cleanup(entry);

		if (entry.timestamps.length >= maxRequests) {
			const oldest = entry.timestamps[0];
			const retryAfterMs = oldest + windowMs - Date.now();
			config?.onRateLimited?.(key, retryAfterMs);

			return throwError(() => new Error(
				`Quenetiq RateLimit: endpoint "${key}" rate limited. ` +
					`${entry.timestamps.length}/${maxRequests} requests in ${windowMs}ms window. ` +
					`Retry in ${Math.ceil(retryAfterMs / 1000)}s.`,
			));
		}

		entry.timestamps.push(Date.now());
		return next(request);
	};
}
