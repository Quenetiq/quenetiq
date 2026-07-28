import { describe, it, expect, beforeEach } from 'vitest';
import { CacheStore } from '@quenetiq/cache';
import { readHash } from '../read-hash';

describe('readHash', () => {
	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	it('returns null for missing entity', () => {
		expect(readHash(store, 'User', '1')).toBeNull();
	});

	it('returns entity by typename and id', () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		const data = readHash<{ __typename: string; id: string; name: string }>(store, 'User', '1');
		expect(data).not.toBeNull();
		expect((data as { name: string }).name).toBe('Alice');
	});

	it('returns all entities of a type when no id given', () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		store.write({ __typename: 'User', id: '2', name: 'Bob' });

		const users = readHash<{ __typename: string; id: string; name: string }>(store, 'User');
		expect(Array.isArray(users)).toBe(true);
		expect((users as unknown[]).length).toBe(2);
	});

	it('returns null for unknown typename', () => {
		expect(readHash(store, 'Unknown')).toBeNull();
	});
});
