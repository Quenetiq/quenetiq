import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { CacheStore } from '@quenetiq/cache';
import { cacheFirst } from '../cache-first';

describe('cacheFirst', () => {
	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	it('emits cached data first, then fetched data', async () => {
		store.writeQuery('q:test', { value: 'cached' });
		const fetch = vi.fn().mockResolvedValue({ value: 'fresh' });

		const values: unknown[] = [];
		cacheFirst(store, 'q:test', fetch).subscribe({ next: (v) => values.push(v) });

		await vi.waitFor(() => expect(values.length).toBeGreaterThanOrEqual(1));

		expect(values[0]).toEqual({ value: 'cached' });
	});

	it('emits fetched data when no cache exists', async () => {
		const fetch = vi.fn().mockResolvedValue({ value: 'fresh' });

		const result = await firstValueFrom(cacheFirst(store, 'q:nocache', fetch));

		expect(result).toEqual({ value: 'fresh' });
	});

	it('passes fetch errors to subscriber', async () => {
		const fetch = vi.fn().mockRejectedValue(new Error('network error'));

		await expect(
			firstValueFrom(cacheFirst(store, 'q:fail', fetch)),
		).rejects.toThrow('network error');
	});
});
