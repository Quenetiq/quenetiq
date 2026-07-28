import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	buildTypedPipeline,
	authMiddleware,
	devAuthMiddleware,
	loggingMiddleware,
	hasFiles,
	type GraphqlRequestContext,
	type GraphqlMiddleware,
} from '../middleware';
import type { GraphQLResult } from '../result';

function createRequest(): GraphqlRequestContext {
	return {
		query: 'query { hello }',
		variables: {},
		headers: {},
		type: 'query',
	};
}

function okResult<T = unknown>(data: T): GraphQLResult<T> {
	return { status: 'success', data };
}

describe('buildTypedPipeline', () => {
	it('returns final function when middleware list is empty', () => {
		const final = vi.fn().mockResolvedValue(okResult({ ok: true }));
		const composed = buildTypedPipeline([], final);
		expect(composed).toBe(final);
	});

	it('chains middleware in order', async () => {
		const order: number[] = [];
		const mw1: GraphqlMiddleware = async (req, next) => {
			order.push(1);
			return next(req);
		};
		const mw2: GraphqlMiddleware = async (req, next) => {
			order.push(2);
			return next(req);
		};
		const final = async () => {
			order.push(3);
			return okResult({ ok: true });
		};

		const composed = buildTypedPipeline([mw1, mw2], final);
		await composed(createRequest());

		expect(order).toEqual([1, 2, 3]);
	});

	it('passes modified request through chain', async () => {
		const mw: GraphqlMiddleware = async (req, next) => {
			return next({ ...req, headers: { ...req.headers, 'x-custom': 'value' } });
		};
		const final = vi.fn().mockResolvedValue(okResult({ ok: true }));

		const composed = buildTypedPipeline([mw], final);
		await composed(createRequest());

		expect(final).toHaveBeenCalledWith(
			expect.objectContaining({ headers: expect.objectContaining({ 'x-custom': 'value' }) }),
		);
	});

	it('middleware can short-circuit and skip final', async () => {
		const mw: GraphqlMiddleware = async (_req, _next) => {
			return okResult({ cached: true });
		};
		const final = vi.fn();
		const composed = buildTypedPipeline([mw], final);

		const result = await composed(createRequest());

		expect(result).toEqual({ status: 'success', data: { cached: true } });
		expect(final).not.toHaveBeenCalled();
	});

	it('middleware can throw and propagate', async () => {
		const mw: GraphqlMiddleware = async (_req, _next) => {
			throw new Error('middleware error');
		};
		const composed = buildTypedPipeline([mw], async () => okResult({ ok: true }));

		await expect(composed(createRequest())).rejects.toThrow('middleware error');
	});
});

describe('authMiddleware', () => {
	it('adds Bearer prefix to token', async () => {
		const next = vi.fn().mockResolvedValue(okResult({ ok: true }));
		const mw = authMiddleware('my-token');

		await mw(createRequest(), next);

		expect(next).toHaveBeenCalledWith(expect.objectContaining({ headers: { Authorization: 'Bearer my-token' } }));
	});

	it('does not duplicate Bearer prefix', async () => {
		const next = vi.fn().mockResolvedValue(okResult({ ok: true }));
		const mw = authMiddleware('Bearer existing-token');

		await mw(createRequest(), next);

		expect(next).toHaveBeenCalledWith(expect.objectContaining({ headers: { Authorization: 'Bearer existing-token' } }));
	});

	it('uses custom header name', async () => {
		const next = vi.fn().mockResolvedValue(okResult({ ok: true }));
		const mw = authMiddleware('my-token', 'X-API-Key');

		await mw(createRequest(), next);

		expect(next).toHaveBeenCalledWith(expect.objectContaining({ headers: { 'X-API-Key': 'Bearer my-token' } }));
	});
});

describe('devAuthMiddleware', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', undefined);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('uses provided token when given', async () => {
		const next = vi.fn().mockResolvedValue(okResult({ ok: true }));
		const mw = devAuthMiddleware('provided-token');

		await mw(createRequest(), next);

		expect(next).toHaveBeenCalledWith(expect.objectContaining({ headers: { Authorization: 'Bearer provided-token' } }));
	});

	it('falls back to localStorage dev_token', async () => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => {
				if (key === 'dev_token') return 'stored-token';
				return null;
			}),
		});

		const next = vi.fn().mockResolvedValue(okResult({ ok: true }));
		const mw = devAuthMiddleware();

		await mw(createRequest(), next);

		expect(next).toHaveBeenCalledWith(expect.objectContaining({ headers: { Authorization: 'Bearer stored-token' } }));
	});

	it('falls back to dev-token when nothing else available', async () => {
		const next = vi.fn().mockResolvedValue(okResult({ ok: true }));
		const mw = devAuthMiddleware();

		await mw(createRequest(), next);

		expect(next).toHaveBeenCalledWith(expect.objectContaining({ headers: { Authorization: 'Bearer dev-token' } }));
	});
});

describe('loggingMiddleware', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(performance, 'now').mockReturnValue(1000);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('logs request with default label', async () => {
		const next = vi.fn().mockResolvedValue(okResult({ hello: 'world' }));
		const mw = loggingMiddleware();

		await mw({ ...createRequest(), query: 'query { hello }' }, next);

		expect(console.log).toHaveBeenCalledWith(
			expect.stringContaining('[GraphQL]'),
			expect.objectContaining({ status: 'success' }),
		);
	});

	it('uses custom label', async () => {
		const next = vi.fn().mockResolvedValue(okResult({ ok: true }));
		const mw = loggingMiddleware('MyApp');

		await mw(createRequest(), next);

		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[MyApp]'), expect.any(Object));
	});

	it('passes through result unchanged', async () => {
		const next = vi.fn().mockResolvedValue(okResult({ ok: true }));
		const mw = loggingMiddleware();

		const result = await mw(createRequest(), next);

		expect(result).toEqual({ status: 'success', data: { ok: true } });
	});
});

describe('hasFiles', () => {
	it('returns true for File', () => {
		expect(hasFiles(new File([''], 'test.txt'))).toBe(true);
	});

	it('returns true for Blob', () => {
		expect(hasFiles(new Blob(['']))).toBe(true);
	});

	it('returns true for nested File in object', () => {
		expect(hasFiles({ file: new File([''], 'x.txt') })).toBe(true);
	});

	it('returns true for File in array', () => {
		expect(hasFiles([1, new File([''], 'x.txt')])).toBe(true);
	});

	it('returns false for plain objects', () => {
		expect(hasFiles({ name: 'test', value: 42 })).toBe(false);
	});

	it('returns false for primitives', () => {
		expect(hasFiles(null)).toBe(false);
		expect(hasFiles(undefined)).toBe(false);
		expect(hasFiles('string')).toBe(false);
		expect(hasFiles(42)).toBe(false);
		expect(hasFiles(true)).toBe(false);
	});

	it('returns false for empty array', () => {
		expect(hasFiles([])).toBe(false);
	});
});
