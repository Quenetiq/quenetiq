import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { CacheStore } from '@quenetiq/cache';
import { watchQuery } from '../watch-query';

describe('watchQuery', () => {
	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	it('emits initial fetch result', async () => {
		const fetch = vi.fn().mockResolvedValue({ users: [{ __typename: 'User', id: '1' }] });

		const result = await firstValueFrom(
			watchQuery(store, { queryHash: 'q:users', fetch }),
		);

		expect(result).toEqual({ users: [{ __typename: 'User', id: '1' }] });
	});

	it('emits cached data if available', async () => {
		store.writeQuery('q:users', { users: [{ __typename: 'User', id: '1' }] });
		const fetch = vi.fn().mockResolvedValue({ users: [{ __typename: 'User', id: '1', name: 'Fresh' }] });

		const values: unknown[] = [];
		watchQuery(store, { queryHash: 'q:users', fetch }).subscribe({ next: (v) => values.push(v) });

		await vi.waitFor(() => expect(values.length).toBeGreaterThanOrEqual(1));
	});

	it('propagates fetch error', async () => {
		const fetch = vi.fn().mockRejectedValue(new Error('fail'));

		await expect(
			firstValueFrom(watchQuery(store, { queryHash: 'q:fail', fetch })),
		).rejects.toThrow('fail');
	});
});
