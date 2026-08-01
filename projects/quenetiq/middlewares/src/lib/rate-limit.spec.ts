import { describe, it, expect, vi } from 'vitest';
import { type Observable, of } from 'rxjs';
import { rateLimitMiddleware } from './rate-limit';
import type { GraphqlRequestContext, GraphQLResult } from '@quenetiq/core';

describe('rateLimitMiddleware', () => {
	const makeRequest = (query: string, vars?: Record<string, unknown>): GraphqlRequestContext => ({
		query,
		variables: vars ?? {},
		headers: {},
		type: 'query',
	});

	const makeNext = () =>
		vi.fn((req: GraphqlRequestContext) => of({ status: 'success', data: null } as unknown as GraphQLResult<unknown>));

	it('allows requests within the rate limit', () => {
		const mw = rateLimitMiddleware({ maxRequests: 3, windowMs: 1000 });
		const next = makeNext();
		const req = makeRequest('query { hello }');

		for (let i = 0; i < 3; i++) {
			const result$ = mw(req, next);
			const result: GraphQLResult<unknown> = (result$ as Observable<GraphQLResult<unknown>>).pipe ? null : null;
		}

		expect(next).toHaveBeenCalledTimes(3);
	});

	it('blocks requests exceeding the rate limit', () => {
		const mw = rateLimitMiddleware({ maxRequests: 2, windowMs: 5000 });
		const next = makeNext();
		const req = makeRequest('query { hello }');

		let lastResult: GraphQLResult<unknown> | undefined;

		for (let i = 0; i < 3; i++) {
			const result$ = mw(req, next) as Observable<GraphQLResult<unknown>>;
			result$.subscribe((r) => {
				lastResult = r;
			});
		}

		expect(next).toHaveBeenCalledTimes(2);
		expect(lastResult?.status).toBe('error');
		expect(lastResult?.errorCode).toBe('RATE_LIMITED');
	});

	it('uses separate windows per key', () => {
		const mw = rateLimitMiddleware({
			maxRequests: 1,
			windowMs: 5000,
			key: (req) => req.query,
		});
		const next = makeNext();

		const reqA = makeRequest('query { a }');
		const reqB = makeRequest('query { b }');

		mw(reqA, next);
		mw(reqB, next);
		mw(reqA, next); // Should be blocked (key A exceeded)
		mw(reqB, next); // Should also be blocked (key B already used its 1/1)

		expect(next).toHaveBeenCalledTimes(2);
	});

	it('resets the window after windowMs', async () => {
		const mw = rateLimitMiddleware({ maxRequests: 1, windowMs: 50 });
		const next = makeNext();
		const req = makeRequest('query { hello }');

		// First request — allowed
		mw(req, next);
		expect(next).toHaveBeenCalledTimes(1);

		// Second request — blocked (within window)
		mw(req, next);
		expect(next).toHaveBeenCalledTimes(1);

		// Wait for window to reset
		await new Promise((r) => setTimeout(r, 60));

		// Third request — allowed (new window)
		mw(req, next);
		expect(next).toHaveBeenCalledTimes(2);
	});
});
