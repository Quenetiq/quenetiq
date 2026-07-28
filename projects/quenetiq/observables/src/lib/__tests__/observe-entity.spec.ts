import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { firstValueFrom, toArray } from 'rxjs';
import { CacheStore } from '@quenetiq/cache';
import { observeEntity } from '../observe-entity';

describe('observeEntity', () => {
	let store: CacheStore;
	let values: unknown[];

	beforeEach(() => {
		store = new CacheStore();
		values = [];
	});

	it('emits initial value if entity exists', async () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });

		const obs = observeEntity(store, 'User', '1');
		const result = await firstValueFrom(obs);

		expect((result as Record<string, unknown>).name).toBe('Alice');
	});

	it('emits undefined if entity does not exist', async () => {
		const obs = observeEntity(store, 'User', 'nonexistent');
		const result = await firstValueFrom(obs);

		expect(result).toBeUndefined();
	});

	it('emits new value on write', async () => {
		const obs = observeEntity(store, 'User', '1');

		obs.subscribe({ next: (v) => values.push(v) });
		store.write({ __typename: 'User', id: '1', name: 'Bob' });

		expect(values.length).toBe(2);
		expect((values[1] as Record<string, unknown>).name).toBe('Bob');
	});

	it('emits new value on merge', async () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		const obs = observeEntity(store, 'User', '1');

		obs.subscribe({ next: (v) => values.push(v) });
		store.merge({ __typename: 'User', id: '1', email: 'a@b.com' });

		expect(values.length).toBe(2);
		expect((values[1] as Record<string, unknown>).email).toBe('a@b.com');
	});

	it('emits undefined on evict', async () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		const obs = observeEntity(store, 'User', '1');

		obs.subscribe({ next: (v) => values.push(v) });
		store.evict('User', '1');

		expect(values[1]).toBeUndefined();
	});

	it('does not emit for different entity', async () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		const obs = observeEntity(store, 'User', '1');

		obs.subscribe({ next: (v) => values.push(v) });
		store.write({ __typename: 'Note', id: '99', text: 'irrelevant' });

		expect(values.length).toBe(1);
	});

	it('stops emitting after unsubscribe', () => {
		const obs = observeEntity(store, 'User', '1');
		const sub = obs.subscribe({ next: (v) => values.push(v) });

		sub.unsubscribe();
		store.write({ __typename: 'User', id: '1', name: 'Charlie' });

		expect(values.length).toBe(1);
	});
});
