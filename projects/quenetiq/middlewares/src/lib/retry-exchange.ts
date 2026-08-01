import { type Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { type GraphqlMiddleware, type GraphQLResult } from '@quenetiq/core';

export interface RetryExchangeConfig {
	maxRetries?: number;
	initialDelay?: number;
	maxDelay?: number;
	exponent?: number;
	jitter?: boolean;
	shouldRetry?: (result: GraphQLResult<unknown>, attempt: number) => boolean;
}

function calculateDelay(attempt: number, config: RetryExchangeConfig): number {
	const initial = config.initialDelay ?? 1000;
	const exp = config.exponent ?? 2;
	const max = config.maxDelay ?? 30000;
	let delay = Math.min(initial * Math.pow(exp, attempt), max);
	if (config.jitter !== false) {
		delay = delay * (0.5 + Math.random() * 0.5);
	}
	return Math.floor(delay);
}

function defaultShouldRetry(result: GraphQLResult<unknown>): boolean {
	return result.status === 'error' && Boolean(result.networkError);
}

export function retryExchange(config?: RetryExchangeConfig): GraphqlMiddleware {
	const maxRetries = config?.maxRetries ?? 3;
	const shouldRetry = config?.shouldRetry ?? defaultShouldRetry;

	return (request, next) => {
		let attempts = 0;

		function attempt(): Observable<GraphQLResult<unknown>> {
			return next(request).pipe(
				mergeMap((result) => {
					if (attempts >= maxRetries || !shouldRetry(result, attempts)) {
						return of(result);
					}
					attempts++;
					const delay = calculateDelay(attempts, config ?? {});
					return timer(delay).pipe(mergeMap(() => attempt()));
				}),
			);
		}

		return attempt();
	};
}
