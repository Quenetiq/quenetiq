import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheStore } from '../cache-store';

describe('CacheStore invalidation', () => {
	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	it('invalidateEntity clears query results that depend on the entity', () => {
		store.writeQuery('q:users', { users: [{ __typename: 'User', id: '1' }] });
		store.recordQueryDependencies('q:users', new Set(['User:1']));

		store.invalidateEntity('User', '1');

		expect(store.readQuery('q:users')).toBeUndefined();
	});

	it('invalidateEntity does not clear unrelated queries', () => {
		store.writeQuery('q:users', { users: [{ __typename: 'User', id: '1' }] });
		store.writeQuery('q:notes', { notes: [{ __typename: 'Note', id: '42' }] });
		store.recordQueryDependencies('q:users', new Set(['User:1']));
		store.recordQueryDependencies('q:notes', new Set(['Note:42']));

		store.invalidateEntity('User', '1');

		expect(store.readQuery('q:users')).toBeUndefined();
		expect(store.readQuery('q:notes')).toBeDefined();
	});

	it('write auto-invalidates entities from same entity key', () => {
		store.writeQuery('q:users', { users: [{ __typename: 'User', id: '1' }] });
		store.recordQueryDependencies('q:users', new Set(['User:1']));

		store.write({ __typename: 'User', id: '1', name: 'Alice' });

		expect(store.readQuery('q:users')).toBeUndefined();
	});

	it('merge auto-invalidates entities from same entity key', () => {
		store.writeQuery('q:users', { users: [{ __typename: 'User', id: '1' }] });
		store.recordQueryDependencies('q:users', new Set(['User:1']));

		store.merge({ __typename: 'User', id: '1', name: 'Bob' });

		expect(store.readQuery('q:users')).toBeUndefined();
	});

	it('evict auto-invalidates entities from same entity key', () => {
		store.writeQuery('q:users', { users: [{ __typename: 'User', id: '1' }] });
		store.recordQueryDependencies('q:users', new Set(['User:1']));
		store.merge({ __typename: 'User', id: '1', name: 'Alice' });

		store.evict('User', '1');

		expect(store.readQuery('q:users')).toBeUndefined();
	});

	it('notifyQueryChanged triggers query watchers', () => {
		const listener = vi.fn();
		store.writeQuery('q:test', { value: 1 });
		store.watchLocal('q:test', listener);

		store.notifyQueryChanged('q:test');

		expect(listener).toHaveBeenCalled();
	});

	it('notifyQueryChanged does nothing for unknown hash', () => {
		expect(() => store.notifyQueryChanged('nonexistent')).not.toThrow();
	});

	it('getQueriesForEntity returns empty array for unknown entity', () => {
		expect(store.getQueriesForEntity('Unknown:id')).toEqual([]);
	});

	it('getEntitiesForQuery returns empty array for unknown query', () => {
		expect(store.getEntitiesForQuery('q:unknown')).toEqual([]);
	});
});

describe('CacheStore clear', () => {
	it('clears all data and emits clear event', () => {
		const store = new CacheStore();
		const listener = vi.fn();
		store.events.on(listener);
		store.write({ __typename: 'User', id: '1', name: 'A' });
		store.writeQuery('q:test', { value: 1 });

		store.clear();

		expect(store.query('User', '1')).toBeUndefined();
		expect(store.readQuery('q:test')).toBeUndefined();
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'clear' }),
		);
	});

	it('still works when no persist service is set', () => {
		const store = new CacheStore();
		store.write({ __typename: 'User', id: '1' });
		expect(() => store.clear()).not.toThrow();
	});
});
