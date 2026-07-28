import type { GraphqlMiddleware, GraphqlRequestContext } from './middleware';
import type { GraphQLResult } from './graphql.service';
import { Observable, throwError } from 'rxjs';

export interface CircuitBreakerConfig {
	/** Number of consecutive failures before opening the circuit. Default: 5 */
	failureThreshold?: number;
	/** Cooldown period (ms) before trying half-open. Default: 30000 */
	cooldownMs?: number;
	/** Max successes in half-open state before closing. Default: 2 */
	halfOpenSuccessThreshold?: number;
	/** Optional callback when circuit state changes */
	onStateChange?: (state: 'closed' | 'open' | 'half-open', endpoint?: string) => void;
}

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitRecord {
	state: CircuitState;
	consecutiveFailures: number;
	halfOpenSuccesses: number;
	lastFailureTime: number;
}

export function circuitBreakerMiddleware(config?: CircuitBreakerConfig): GraphqlMiddleware {
	const failureThreshold = config?.failureThreshold ?? 5;
	const cooldownMs = config?.cooldownMs ?? 30_000;
	const halfOpenSuccessThreshold = config?.halfOpenSuccessThreshold ?? 2;
	const circuits = new Map<string, CircuitRecord>();

	const getState = (key: string): CircuitRecord => {
		if (!circuits.has(key)) {
			circuits.set(key, {
				state: 'closed',
				consecutiveFailures: 0,
				halfOpenSuccesses: 0,
				lastFailureTime: 0,
			});
		}
		return circuits.get(key)!;
	};

	const setState = (key: string, state: CircuitState, record: CircuitRecord): void => {
		const prev = record.state;
		record.state = state;
		if (prev !== state) {
			config?.onStateChange?.(state, key);
		}
	};

	return (
		request: GraphqlRequestContext,
		next: (req: GraphqlRequestContext) => Observable<GraphQLResult<unknown>>,
	) => {
		const key = request.endpoint ?? 'default';
		const record = getState(key);

		if (record.state === 'open') {
			const elapsed = Date.now() - record.lastFailureTime;
			if (elapsed >= cooldownMs) {
				setState(key, 'half-open', record);
				record.halfOpenSuccesses = 0;
			} else {
				return throwError(() => new Error(
					`Quenetiq CircuitBreaker: endpoint "${key}" is open. ` +
						`Retry in ${Math.ceil((cooldownMs - elapsed) / 1000)}s.`,
				));
			}
		}

		return new Observable<GraphQLResult<unknown>>((subscriber) => {
			const sub = next(request).subscribe({
				next: (result) => {
					if (result.status === 'error') {
						record.consecutiveFailures++;
						record.lastFailureTime = Date.now();

						if (record.state === 'half-open') {
							setState(key, 'open', record);
						} else if (record.consecutiveFailures >= failureThreshold) {
							setState(key, 'open', record);
						}
					} else {
						if (record.state === 'half-open') {
							record.halfOpenSuccesses++;
							if (record.halfOpenSuccesses >= halfOpenSuccessThreshold) {
								record.consecutiveFailures = 0;
								setState(key, 'closed', record);
							}
						} else {
							record.consecutiveFailures = 0;
						}
					}
					subscriber.next(result);
				},
				error: (err: unknown) => {
					record.consecutiveFailures++;
					record.lastFailureTime = Date.now();
					if (record.state === 'half-open') {
						setState(key, 'open', record);
					} else if (record.consecutiveFailures >= failureThreshold) {
						setState(key, 'open', record);
					}
					subscriber.error(err);
				},
				complete: () => subscriber.complete(),
			});
			return () => sub.unsubscribe();
		});
	};
}
