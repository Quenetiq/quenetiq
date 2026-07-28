import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheStore } from '@quenetiq/cache';
import { asCache } from '../as-cache';

describe('asCache', () => {
	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	it('emits cached data immediately', () => {
		store.writeQuery('q:test', { value: 'hello' });

		const values: unknown[] = [];
		asCache(store, 'q:test').subscribe({ next: (v) => values.push(v) });

		expect(values[0]).toEqual({ value: 'hello' });
	});

	it('emits null when cache is empty', () => {
		const values: unknown[] = [];
		asCache(store, 'q:none').subscribe({ next: (v) => values.push(v) });

		expect(values[0]).toBeNull();
	});

	it('re-emits when an entity affecting the query changes', async () => {
		store.writeQuery('q:entity', {
			user: { __typename: 'User', id: '1', name: 'Alice' },
		});

		const values: unknown[] = [];
		asCache(store, 'q:entity').subscribe({ next: (v) => values.push(v) });

		expect(values[0]).toEqual({ user: { __typename: 'User', id: '1', name: 'Alice' } });

		store.write({ __typename: 'User', id: '1', name: 'Bob' });

		await vi.waitFor(() => {
			expect(values.length).toBeGreaterThanOrEqual(2);
		});
	});

	it('completes when unsubscribed', () => {
		const values: unknown[] = [];
		const sub = asCache(store, 'q:test').subscribe({ next: (v) => values.push(v) });
		sub.unsubscribe();
		expect(values[0]).toBeNull();
	});
});
