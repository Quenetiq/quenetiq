import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePrefetch } from '../use-prefetch';

vi.mock('../plugin', () => ({
	useClient: vi.fn(),
}));

import { useClient } from '../plugin';

describe('usePrefetch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns a function that calls client.query', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({
				status: 'success',
				data: { items: [1, 2, 3] },
			}),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const prefetch = usePrefetch('query { items }' as any);

		expect(typeof prefetch).toBe('function');

		const result = await prefetch();

		expect(client.query).toHaveBeenCalledWith('query { items }' as any, undefined);
		expect(result).toEqual({ status: 'success', data: { items: [1, 2, 3] } });
	});

	it('passes variables to client.query', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({
				status: 'success',
				data: { user: { name: 'Alice' } },
			}),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const prefetch = usePrefetch('query { user }' as any);

		const result = await prefetch({ userId: '42' });

		expect(client.query).toHaveBeenCalledWith('query { user }' as any, { userId: '42' });
		expect(result).toEqual({ status: 'success', data: { user: { name: 'Alice' } } });
	});

	it('propagates error results from client.query', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({
				status: 'error',
				error: 'Not found',
				errorCode: 'GRAPHQL_ERROR',
			}),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const prefetch = usePrefetch('query { missing }' as any);

		const result = await prefetch();

		expect(result).toEqual({
			status: 'error',
			error: 'Not found',
			errorCode: 'GRAPHQL_ERROR',
		});
	});

	it('propagates thrown errors from client.query', async () => {
		const client = {
			query: vi.fn().mockRejectedValue(new Error('Network failure')),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const prefetch = usePrefetch('query { items }' as any);

		await expect(prefetch()).rejects.toThrow('Network failure');
	});

	it('can be called multiple times', async () => {
		const client = {
			query: vi.fn()
				.mockResolvedValueOnce({ status: 'success', data: { a: 1 } })
				.mockResolvedValueOnce({ status: 'success', data: { a: 2 } }),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const prefetch = usePrefetch('query { a }' as any);

		const r1 = await prefetch();
		const r2 = await prefetch();

		expect(r1).toEqual({ status: 'success', data: { a: 1 } });
		expect(r2).toEqual({ status: 'success', data: { a: 2 } });
		expect(client.query).toHaveBeenCalledTimes(2);
	});

	it('calls useClient each time usePrefetch is invoked', () => {
		const client = { query: vi.fn() };
		vi.mocked(useClient).mockReturnValue(client as never);

		usePrefetch('query { a }' as any);
		usePrefetch('query { b }' as any);

		expect(useClient).toHaveBeenCalledTimes(2);
	});

	it('works when variables is omitted (undefined)', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({
				status: 'success',
				data: { count: 0 },
			}),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const prefetch = usePrefetch('query { count }' as any);
		const result = await prefetch();

		expect(client.query).toHaveBeenCalledWith('query { count }' as any, undefined);
		expect(result.data).toEqual({ count: 0 });
	});
});
