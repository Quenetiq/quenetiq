import { describe, it, expect, vi } from 'vitest';
import { devToolsMiddleware } from '../devtools';
import type { GraphqlRequestContext } from '../middleware';

function mockRequest(overrides?: Partial<GraphqlRequestContext>): GraphqlRequestContext {
	return {
		type: 'query',
		query: 'query GetUser { user { id name } }',
		variables: { id: '1' },
		headers: {},
		endpoint: '/graphql',
		...overrides,
	};
}

describe('devToolsMiddleware', () => {
	it('records successful queries', async () => {
		const { middleware, getLog } = devToolsMiddleware();
		const next = vi.fn().mockResolvedValue({ status: 'success', data: { user: { id: '1', name: 'Alice' } } });

		await middleware(mockRequest(), next);

		const log = getLog();
		expect(log).toHaveLength(1);
		expect(log[0].type).toBe('query');
		expect(log[0].status).toBe('success');
		expect(log[0].operationName).toBe('GetUser');
		expect(log[0].durationMs).toBeGreaterThanOrEqual(0);
		expect(log[0].fromCache).toBe(false);
	});

	it('records mutations', async () => {
		const { middleware, getLog } = devToolsMiddleware();
		const next = vi.fn().mockResolvedValue({ status: 'success', data: { createUser: { id: '1' } } });

		await middleware(mockRequest({ type: 'mutation', query: 'mutation CreateUser { createUser { id } }' }), next);

		const log = getLog();
		expect(log[0].type).toBe('mutation');
		expect(log[0].operationName).toBe('CreateUser');
	});

	it('records errors', async () => {
		const { middleware, getLog } = devToolsMiddleware();
		const next = vi.fn().mockResolvedValue({ status: 'error', error: 'Not found', errorCode: 'GRAPHQL_ERROR' });

		await middleware(mockRequest(), next);

		const log = getLog();
		expect(log[0].status).toBe('error');
		expect(log[0].error).toBe('Not found');
	});

	it('records thrown errors', async () => {
		const { middleware, getLog } = devToolsMiddleware();
		const next = vi.fn().mockRejectedValue(new Error('Network error'));

		await expect(middleware(mockRequest(), next)).rejects.toThrow('Network error');

		const log = getLog();
		expect(log[0].status).toBe('error');
		expect(log[0].error).toBe('Network error');
	});

	it('detects cache hits', async () => {
		const { middleware, getLog } = devToolsMiddleware();
		const next = vi.fn().mockResolvedValue({ status: 'success', data: { user: { id: '1' } }, fromCache: true });

		await middleware(mockRequest(), next);

		const log = getLog();
		expect(log[0].fromCache).toBe(true);
	});

	it('calls onEntry callback', async () => {
		const onEntry = vi.fn();
		const { middleware } = devToolsMiddleware({ onEntry });
		const next = vi.fn().mockResolvedValue({ status: 'success', data: { user: { id: '1' } } });

		await middleware(mockRequest(), next);

		expect(onEntry).toHaveBeenCalledTimes(1);
		expect(onEntry).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'query', status: 'success' }),
		);
	});

	it('respects maxEntries', async () => {
		const { middleware, getLog } = devToolsMiddleware({ maxEntries: 3 });
		const next = vi.fn().mockResolvedValue({ status: 'success', data: {} });

		for (let i = 0; i < 5; i++) {
			await middleware(mockRequest(), next);
		}

		expect(getLog()).toHaveLength(3);
	});

	it('clearLog resets state', async () => {
		const { middleware, getLog, clearLog, getState } = devToolsMiddleware();
		const next = vi.fn().mockResolvedValue({ status: 'success', data: {} });

		await middleware(mockRequest(), next);
		expect(getLog()).toHaveLength(1);

		clearLog();
		expect(getLog()).toHaveLength(0);
		expect(getState().cacheHits).toBe(0);
		expect(getState().networkRequests).toBe(0);
	});

	it('tracks network vs cache stats', async () => {
		const { middleware, getState } = devToolsMiddleware();
		const next = vi.fn()
			.mockResolvedValueOnce({ status: 'success', data: {}, fromCache: true })
			.mockResolvedValueOnce({ status: 'success', data: {}, fromCache: false })
			.mockResolvedValueOnce({ status: 'success', data: {}, fromCache: false });

		for (let i = 0; i < 3; i++) {
			await middleware(mockRequest(), next);
		}

		const state = getState();
		expect(state.cacheHits).toBe(1);
		expect(state.networkRequests).toBe(2);
		expect(state.totalDurationMs).toBeGreaterThanOrEqual(0);
	});
});
