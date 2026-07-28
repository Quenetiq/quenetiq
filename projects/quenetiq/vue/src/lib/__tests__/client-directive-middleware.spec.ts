import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clientDirectiveMiddleware, setVar, resolveVar } from '../client-directive-middleware';
import type { GraphqlRequestContext } from '@quenetiq/client';

function mockRequest(overrides?: Partial<GraphqlRequestContext>): GraphqlRequestContext {
	return {
		query: '{ viewer { name @client } }',
		variables: {},
		headers: {},
		type: 'query',
		...overrides,
	};
}

describe('clientDirectiveMiddleware (Vue)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('passes through when query has no @client', async () => {
		const next = vi.fn().mockResolvedValue({ status: 'success', data: { viewer: { name: 'Alice' } } });
		const mw = clientDirectiveMiddleware();

		const result = await mw(mockRequest({ query: '{ viewer { name } }' }), next);

		expect(next).toHaveBeenCalled();
		expect(result).toEqual({ status: 'success', data: { viewer: { name: 'Alice' } } });
	});

	it('skips network when query is @client-only', async () => {
		setVar('name', 'Local Alice');
		const next = vi.fn();
		const mw = clientDirectiveMiddleware();

		const result = await mw(mockRequest({ query: '{ name @client }' }), next);

		expect(next).not.toHaveBeenCalled();
		expect(result).toEqual({ status: 'success', data: { name: 'Local Alice' } });
	});

	it('strips @client and merges local fields for mixed queries', async () => {
		setVar('localField', 'local-value');
		const next = vi.fn().mockResolvedValue({
			status: 'success',
			data: { serverField: 'server-value' },
		});
		const mw = clientDirectiveMiddleware();

		const result = await mw(
			mockRequest({ query: '{ serverField localField @client }' }),
			next,
		);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ query: '{ serverField localField  }' }),
		);
		expect(result).toEqual({
			status: 'success',
			data: { serverField: 'server-value', localField: 'local-value' },
		});
	});

	it('returns error result from next when server fails', async () => {
		setVar('name', 'Local');
		const next = vi.fn().mockResolvedValue({ status: 'error', error: 'Server down' });
		const mw = clientDirectiveMiddleware();

		const result = await mw(
			mockRequest({ query: '{ name @client serverData }' }),
			next,
		);

		expect(result).toEqual({ status: 'error', error: 'Server down' });
	});

	it('setVar / resolveVar round-trip', () => {
		setVar('myKey', 42);
		expect(resolveVar('myKey')).toBe(42);
		expect(resolveVar('nonexistent')).toBeUndefined();
	});
});
