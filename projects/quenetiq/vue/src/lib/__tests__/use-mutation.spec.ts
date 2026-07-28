import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CacheStore } from '@quenetiq/cache';
import { useMutation } from '../use-mutation';

vi.mock('../plugin', () => ({
	useClient: vi.fn(),
}));

import { useClient } from '../plugin';

describe('useMutation optimistic (Vue)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls optimistic callback with cache before mutation', async () => {
		const cache = { commitOptimistic: vi.fn(), rollbackOptimistic: vi.fn() } as unknown as CacheStore;
		const client = {
			mutate: vi.fn().mockResolvedValue({ status: 'success', data: { x: 1 } }),
			getCacheService: vi.fn().mockReturnValue(cache),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const optimistic = vi.fn().mockReturnValue('opt-1');
		const { mutate } = useMutation('mutation { x }' as any, { optimistic });

		await mutate();

		expect(optimistic).toHaveBeenCalledWith(cache);
	});

	it('commits optimistic on success', async () => {
		const cache = { commitOptimistic: vi.fn(), rollbackOptimistic: vi.fn() } as unknown as CacheStore;
		const client = {
			mutate: vi.fn().mockResolvedValue({ status: 'success', data: { x: 1 } }),
			getCacheService: vi.fn().mockReturnValue(cache),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { mutate } = useMutation('mutation { x }' as any, { optimistic: () => 'opt-1' });

		await mutate();

		expect(cache.commitOptimistic).toHaveBeenCalledWith('opt-1');
		expect(cache.rollbackOptimistic).not.toHaveBeenCalled();
	});

	it('rolls back optimistic on error', async () => {
		const cache = { commitOptimistic: vi.fn(), rollbackOptimistic: vi.fn() } as unknown as CacheStore;
		const client = {
			mutate: vi.fn().mockResolvedValue({ status: 'error', error: 'fail', errorCode: 'GRAPHQL_ERROR' }),
			getCacheService: vi.fn().mockReturnValue(cache),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { mutate } = useMutation('mutation { x }' as any, { optimistic: () => 'opt-2' });

		await mutate();

		expect(cache.rollbackOptimistic).toHaveBeenCalledWith('opt-2');
		expect(cache.commitOptimistic).not.toHaveBeenCalled();
	});

	it('does nothing with optimistic when no cache', async () => {
		const client = {
			mutate: vi.fn().mockResolvedValue({ status: 'success', data: { x: 1 } }),
			getCacheService: vi.fn().mockReturnValue(null),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const optimistic = vi.fn().mockReturnValue('opt-1');
		const { mutate } = useMutation('mutation { x }' as any, { optimistic });

		await mutate();

		expect(optimistic).not.toHaveBeenCalled();
	});

	it('calls update on success when cache is available', async () => {
		const cache = { commitOptimistic: vi.fn(), rollbackOptimistic: vi.fn() } as unknown as CacheStore;
		const client = {
			mutate: vi.fn().mockResolvedValue({ status: 'success', data: { x: 1 } }),
			getCacheService: vi.fn().mockReturnValue(cache),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const update = vi.fn();
		const { mutate } = useMutation('mutation { x }' as any, { update });

		await mutate();

		expect(update).toHaveBeenCalledWith(cache, { status: 'success', data: { x: 1 } });
	});

	it('updates reactive refs on success', async () => {
		const cache = { commitOptimistic: vi.fn(), rollbackOptimistic: vi.fn() } as unknown as CacheStore;
		const client = {
			mutate: vi.fn().mockResolvedValue({ status: 'success', data: { x: 1 } }),
			getCacheService: vi.fn().mockReturnValue(cache),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { mutate, data, loading, error, called } = useMutation('mutation { x }' as any);

		expect(called.value).toBe(false);

		const result = await mutate();

		expect(data.value).toEqual({ x: 1 });
		expect(loading.value).toBe(false);
		expect(error.value).toBeNull();
		expect(called.value).toBe(true);
		expect(result).toEqual({ status: 'success', data: { x: 1 } });
	});

	it('updates reactive refs on error', async () => {
		const cache = { commitOptimistic: vi.fn(), rollbackOptimistic: vi.fn() } as unknown as CacheStore;
		const client = {
			mutate: vi.fn().mockResolvedValue({ status: 'error', error: 'Something went wrong', errorCode: 'GRAPHQL_ERROR' }),
			getCacheService: vi.fn().mockReturnValue(cache),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { mutate, data, loading, error, errorCode, called } = useMutation('mutation { x }' as any);

		const result = await mutate();

		expect(data.value).toBeNull();
		expect(error.value).toBe('Something went wrong');
		expect(errorCode.value).toBe('GRAPHQL_ERROR');
		expect(loading.value).toBe(false);
		expect(called.value).toBe(true);
		expect(result).toEqual({ status: 'error', error: 'Something went wrong', errorCode: 'GRAPHQL_ERROR' });
	});

	it('passes variables to client.mutate', async () => {
		const client = {
			mutate: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
			getCacheService: vi.fn().mockReturnValue(null),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { mutate } = useMutation('mutation { x }' as any, { variables: { preset: 1 } });

		await mutate({ override: 2 });

		expect(client.mutate).toHaveBeenCalledWith('mutation { x }' as any, { override: 2 });
	});
});
