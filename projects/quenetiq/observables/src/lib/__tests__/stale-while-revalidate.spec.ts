import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { CacheStore } from '@quenetiq/cache';
import { staleWhileRevalidate } from '../stale-while-revalidate';

describe('staleWhileRevalidate', () => {
	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	it('emits cached data then fresh data', async () => {
		store.writeQuery('q:test', { value: 'stale' });
		const fetch = vi.fn().mockResolvedValue({ value: 'fresh' });

		const values: unknown[] = [];
		staleWhileRevalidate(store, 'q:test', fetch).subscribe({ next: (v) => values.push(v) });

		await vi.waitFor(() => expect(values.length).toBeGreaterThanOrEqual(1));
		expect(values[0]).toEqual({ value: 'stale' });
	});

	it('completes even when fetch fails but cached data exists', async () => {
		store.writeQuery('q:test', { value: 'stale' });
		const fetch = vi.fn().mockRejectedValue(new Error('fail'));

		const result = await firstValueFrom(staleWhileRevalidate(store, 'q:test', fetch));
		expect(result).toEqual({ value: 'stale' });
	});

	it('throws when fetch fails and no cache exists', async () => {
		const fetch = vi.fn().mockRejectedValue(new Error('fail'));

		await expect(
			firstValueFrom(staleWhileRevalidate(store, 'q:none', fetch)),
		).rejects.toThrow('fail');
	});
});
