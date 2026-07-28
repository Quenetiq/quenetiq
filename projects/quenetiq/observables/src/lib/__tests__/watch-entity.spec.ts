import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheStore } from '@quenetiq/cache';
import { watchEntity } from '../watch-entity';

describe('watchEntity', () => {
	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	it('emits null when entity does not exist', () => {
		const values: unknown[] = [];
		watchEntity(store, 'User', 'missing').subscribe({ next: (v) => values.push(v) });
		expect(values[0]).toBeNull();
	});

	it('emits existing entity immediately', () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });

		const values: unknown[] = [];
		watchEntity(store, 'User', '1').subscribe({ next: (v) => values.push(v) });

		expect(values[0]).not.toBeNull();
	});

	it('emits updated value when entity is written', async () => {
		const values: Record<string, unknown>[] = [];
		watchEntity(store, 'User', '1').subscribe({ next: (v) => values.push(v as Record<string, unknown>) });

		store.write({ __typename: 'User', id: '1', name: 'Bob' });

		await vi.waitFor(() => {
			expect(values.length).toBeGreaterThanOrEqual(2);
		});
		expect(values[1]?.name).toBe('Bob');
	});

	it('emits null when entity is evicted', async () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });

		const values: Record<string, unknown>[] = [];
		watchEntity(store, 'User', '1').subscribe({ next: (v) => values.push(v as Record<string, unknown>) });

		store.evict('User', '1');

		await vi.waitFor(() => {
			expect(values[values.length - 1]).toBeNull();
		});
	});

	it('ignores writes to other entities', () => {
		const values: Record<string, unknown>[] = [];
		watchEntity(store, 'User', '1').subscribe({ next: (v) => values.push(v as Record<string, unknown>) });

		store.write({ __typename: 'Note', id: '99', text: 'irrelevant' });

		expect(values.length).toBe(1);
	});
});
