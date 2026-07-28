import { describe, it, expect, beforeEach, vi } from 'vitest';
import { estimateQueryCost, costEstimationMiddleware } from './cost-estimation';
import type { GraphqlRequestContext, GraphQLResult } from '@quenetiq/core';
import { Observable, of } from 'rxjs';

describe('estimateQueryCost', () => {
	it('returns cost 0 for a parse error', () => {
		const cost = estimateQueryCost('not valid graphql {');
		expect(cost.cost).toBe(0);
		expect(cost.details).toContain('[parse error]');
	});

	it('returns cost for a simple scalar query', () => {
		const cost = estimateQueryCost('query { foo }', 0.5);
		expect(cost.fields).toBe(1);
		expect(cost.depth).toBe(1);
		expect(cost.cost).toBeGreaterThan(0);
	});

	it('counts multiple top-level fields', () => {
		const cost = estimateQueryCost('query { foo bar baz }', 0.5);
		expect(cost.fields).toBe(3);
		expect(cost.cost).toBeGreaterThan(0);
	});

	it('counts nested fields with depth', () => {
		const cost = estimateQueryCost('query { user { name email } }', 1);
		// depth=1: user cost = 1 + (1-1)*1 = 1
		// depth=2: name cost = 1 + (2-1)*1 = 2, email cost = 2
		// total = 5
		expect(cost.cost).toBe(5);
		expect(cost.depth).toBe(2);
	});

	it('cost grows with nesting depth', () => {
		const cost = estimateQueryCost('query { a { b { c } } }', 1);
		// a=1, b=2, c=3 → total=6
		expect(cost.cost).toBe(6);
		expect(cost.depth).toBe(3);
	});
});

describe('costEstimationMiddleware', () => {
	let request: GraphqlRequestContext;

	beforeEach(() => {
		request = {
			query: 'query { foo bar }',
			variables: {},
			headers: {},
			type: 'query',
		};
	});

	it('passes request through when mode is pass', () => {
		const mw = costEstimationMiddleware({ mode: 'pass' });
		const next = vi.fn((req) => of({ status: 'success', data: {} } as GraphQLResult<unknown>));
		const result = mw(request, next);
		expect(result).toBeDefined();
		expect(next).toHaveBeenCalled();
	});

	it('returns error when cost exceeds maxCost in block mode', () => {
		request.query = 'query { a { b { c { d { e } } } } }';
		const mw = costEstimationMiddleware({ maxCost: 3, depthFactor: 1, mode: 'block' });
		const next = vi.fn((req) => of({ status: 'success', data: {} } as GraphQLResult<unknown>));
		const result = mw(request, next) as Observable<GraphQLResult<unknown>>;
		const emitted: unknown[] = [];
		result.subscribe((v) => emitted.push(v));
		expect(emitted).toHaveLength(1);
		const err = emitted[0] as GraphQLResult<unknown>;
		expect(err.status).toBe('error');
		expect(err.error).toContain('exceeds maximum');
		expect(next).not.toHaveBeenCalled();
	});

	it('warns when cost exceeds warnAt in warn mode', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		request.query = 'query { a { b { c } } }';
		const mw = costEstimationMiddleware({ warnAt: 2, depthFactor: 1, mode: 'warn' });
		const next = vi.fn((req) => of({ status: 'success', data: {} } as GraphQLResult<unknown>));
		const result = mw(request, next) as Observable<GraphQLResult<unknown>>;
		const emitted: unknown[] = [];
		result.subscribe((v) => emitted.push(v));
		expect(emitted).toHaveLength(1);
		expect(emitted[0]).toEqual({ status: 'success', data: {} });
		expect(next).toHaveBeenCalled();
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});

	it('defaults to warn mode', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		request.query = 'query { a { b { c } } }';
		const mw = costEstimationMiddleware({ warnAt: 1, depthFactor: 1 });
		const next = vi.fn((req) => of({ status: 'success', data: {} } as GraphQLResult<unknown>));
		(mw(request, next) as Observable<GraphQLResult<unknown>>).subscribe(() => {});
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});
});
