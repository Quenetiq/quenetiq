import { describe, it, expect, vi } from 'vitest';
import { applyMiddleware, authMiddleware, loggingMiddleware, hasFiles } from './middleware';
import { Observable, of } from 'rxjs';
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
});
