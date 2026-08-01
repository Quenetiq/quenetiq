import { describe, it, expect, vi } from 'vitest';
import { applyMiddleware, authMiddleware, loggingMiddleware, hasFiles } from './middleware';
import { type Observable, of, throwError } from 'rxjs';
import type { GraphqlRequestContext, GraphQLResult } from './graphql.service';

describe('applyMiddleware', () => {
	it('calls the final function when no middleware', () => {
		const final = vi.fn((req: GraphqlRequestContext) => of({ status: 'success', data: {} } as GraphQLResult<unknown>));
		const pipeline = applyMiddleware([], final);
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		pipeline(request);
		expect(final).toHaveBeenCalledWith(request);
	});

	it('chains middleware in order', () => {
		const order: number[] = [];
		const mw1 = (
			req: GraphqlRequestContext,
			next: (req: GraphqlRequestContext) => Observable<GraphQLResult<unknown>>,
		) => {
			order.push(1);
			return next(req);
		};
		const mw2 = (
			req: GraphqlRequestContext,
			next: (req: GraphqlRequestContext) => Observable<GraphQLResult<unknown>>,
		) => {
			order.push(2);
			return next(req);
		};
		const final = vi.fn((req: GraphqlRequestContext) => {
			order.push(3);
			return of({ status: 'success', data: {} } as GraphQLResult<unknown>);
		});
		const pipeline = applyMiddleware([mw1, mw2], final);
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		pipeline(request);
		expect(order).toEqual([1, 2, 3]);
	});

	it('passes request modifications through the chain', () => {
		const mw: (
			req: GraphqlRequestContext,
			next: (req: GraphqlRequestContext) => Observable<GraphQLResult<unknown>>,
		) => Observable<GraphQLResult<unknown>> = (req, next) =>
			next({ ...req, headers: { ...req.headers, 'x-added': 'yes' } });
		const final = vi.fn((req: GraphqlRequestContext) =>
			of({ status: 'success', data: { header: req.headers['x-added'] } } as unknown as GraphQLResult<unknown>),
		);
		const pipeline = applyMiddleware([mw], final);
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		pipeline(request);
		expect(final).toHaveBeenCalledWith(
			expect.objectContaining({ headers: expect.objectContaining({ 'x-added': 'yes' }) }),
		);
	});

	it('propagates error from middleware', () => {
		const errorMw = (
			_req: GraphqlRequestContext,
			_next: (req: GraphqlRequestContext) => Observable<GraphQLResult<unknown>>,
		) => throwError(() => new Error('mw error'));
		const final = vi.fn();
		const pipeline = applyMiddleware([errorMw], final);
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		let error: unknown;
		pipeline(request).subscribe({ error: (e: unknown) => { error = e; } });
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toBe('mw error');
	});

	it('handles middleware that does not call next', () => {
		const noopMw = (
			_req: GraphqlRequestContext,
			_next: (req: GraphqlRequestContext) => Observable<GraphQLResult<unknown>>,
		) => of({ status: 'success', data: {} } as GraphQLResult<unknown>);
		const final = vi.fn();
		const pipeline = applyMiddleware([noopMw], final);
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		pipeline(request).subscribe();
		expect(final).not.toHaveBeenCalled();
	});
});

describe('authMiddleware', () => {
	it('adds Authorization header', () => {
		const mw = authMiddleware('my-token');
		const next = vi.fn((req: GraphqlRequestContext) => of({ status: 'success', data: {} } as GraphQLResult<unknown>));
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		mw(request, next);
		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer my-token' }) }),
		);
	});

	it('does not double-wrap Bearer prefix', () => {
		const mw = authMiddleware('Bearer existing-token', 'Authorization');
		const next = vi.fn((req: GraphqlRequestContext) => of({ status: 'success', data: {} } as GraphQLResult<unknown>));
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		mw(request, next);
		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer existing-token' }) }),
		);
	});

	it('handles empty token', () => {
		const mw = authMiddleware('');
		const next = vi.fn((req: GraphqlRequestContext) => of({ status: 'success', data: {} } as GraphQLResult<unknown>));
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		mw(request, next);
		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer ' }) }),
		);
	});

	it('uses custom header name', () => {
		const mw = authMiddleware('my-token', 'X-API-Key');
		const next = vi.fn((req: GraphqlRequestContext) => of({ status: 'success', data: {} } as GraphQLResult<unknown>));
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		mw(request, next);
		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ headers: expect.objectContaining({ 'X-API-Key': 'Bearer my-token' }) }),
		);
	});
});

describe('loggingMiddleware', () => {
	it('logs request and result', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const mw = loggingMiddleware('test');
		const next = vi.fn((req: GraphqlRequestContext) => of({ status: 'success', data: {} } as GraphQLResult<unknown>));
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		mw(request, next).subscribe(() => {
			expect(spy).toHaveBeenCalled();
			spy.mockRestore();
		});
	});

	it('logs error results', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const mw = loggingMiddleware('test');
		const next = vi.fn((req: GraphqlRequestContext) => of({ status: 'error', error: 'fail' } as GraphQLResult<unknown>));
		const request: GraphqlRequestContext = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query',
		};
		mw(request, next).subscribe(() => {
			expect(spy).toHaveBeenCalled();
			spy.mockRestore();
		});
	});
});

describe('hasFiles', () => {
	it('detects File objects', () => {
		const file = new File([''], 'test.txt', { type: 'text/plain' });
		expect(hasFiles({ file })).toBe(true);
	});

	it('detects Blob objects', () => {
		const blob = new Blob(['test']);
		expect(hasFiles({ blob })).toBe(true);
	});

	it('detects nested files', () => {
		const file = new File([''], 'test.txt', { type: 'text/plain' });
		expect(hasFiles({ nested: { file } })).toBe(true);
	});

	it('returns false for plain objects', () => {
		expect(hasFiles({ a: 1, b: 'hello' })).toBe(false);
	});

	it('returns false for arrays without files', () => {
		expect(hasFiles([1, 2, 3])).toBe(false);
	});

	it('detects file in arrays', () => {
		const file = new File([''], 'test.txt', { type: 'text/plain' });
		expect(hasFiles([file])).toBe(true);
	});

	it('returns false for null', () => {
		expect(hasFiles(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(hasFiles(undefined)).toBe(false);
	});
});
