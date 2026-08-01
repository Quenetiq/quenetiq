import { describe, it, expect } from 'vitest';
import { CacheStore } from '../cache-store';

describe('CacheStore query entity dependency tracking', () => {
	it('records query-entity dependencies', () => {
		const store = new CacheStore();
		const entityKeys = new Set(['Post:1', 'Post:2', 'User:5']);

		store.recordQueryDependencies('query:hash:1', entityKeys);

		expect(store.getEntitiesForQuery('query:hash:1')).toEqual(['Post:1', 'Post:2', 'User:5']);
		expect(store.getQueriesForEntity('Post:1')).toEqual(['query:hash:1']);
		expect(store.getQueriesForEntity('Post:2')).toEqual(['query:hash:1']);
		expect(store.getQueriesForEntity('User:5')).toEqual(['query:hash:1']);
	});

	it('returns empty array for unknown query', () => {
		const store = new CacheStore();
		expect(store.getEntitiesForQuery('nonexistent')).toEqual([]);
	});

	it('returns empty array for unknown entity', () => {
		const store = new CacheStore();
		expect(store.getQueriesForEntity('Post:999')).toEqual([]);
	});

	it('tracks multiple queries for the same entity', () => {
		const store = new CacheStore();
		store.recordQueryDependencies('q1', new Set(['Post:1']));
		store.recordQueryDependencies('q2', new Set(['Post:1', 'User:2']));

		expect(store.getQueriesForEntity('Post:1')).toEqual(['q1', 'q2']);
		expect(store.getQueriesForEntity('User:2')).toEqual(['q2']);
		expect(store.getEntitiesForQuery('q1')).toEqual(['Post:1']);
		expect(store.getEntitiesForQuery('q2')).toEqual(['Post:1', 'User:2']);
	});

	it('updates dependencies when re-recorded', () => {
		const store = new CacheStore();
		store.recordQueryDependencies('q1', new Set(['Post:1']));
		store.recordQueryDependencies('q1', new Set(['Post:2', 'User:3']));

		expect(store.getEntitiesForQuery('q1')).toEqual(['Post:2', 'User:3']);
		// Old dependency should be removed
		expect(store.getQueriesForEntity('Post:1')).toEqual([]);
		expect(store.getQueriesForEntity('Post:2')).toEqual(['q1']);
		expect(store.getQueriesForEntity('User:3')).toEqual(['q1']);
	});

	it('records empty dependency set', () => {
		const store = new CacheStore();
		store.recordQueryDependencies('q1', new Set());
		expect(store.getEntitiesForQuery('q1')).toEqual([]);
	});

	it('removes stale reverse mapping on re-record with empty set', () => {
		const store = new CacheStore();
		store.recordQueryDependencies('q1', new Set(['Post:1']));
		store.recordQueryDependencies('q1', new Set());
		expect(store.getEntitiesForQuery('q1')).toEqual([]);
		expect(store.getQueriesForEntity('Post:1')).toEqual([]);
	});

	it('notifyQueryChanged triggers listeners', () => {
		const store = new CacheStore();
		let notified = false;
		store.watchLocal('test:hash', () => {
			notified = true;
		});
		store.writeLocal('test:hash', { status: 'success', data: {} });
		store.notifyQueryChanged('test:hash');
		expect(notified).toBe(true);
	});

	it('notifyQueryChanged is no-op for unknown query', () => {
		const store = new CacheStore();
		// Should not throw
		store.notifyQueryChanged('nonexistent');
	});

	it('watchLocal unsubscription stops notifications', () => {
		const store = new CacheStore();
		let count = 0;
		const unsub = store.watchLocal('test:hash', () => { count++; });
		store.writeLocal('test:hash', { status: 'success', data: { v: 1 } });
		store.notifyQueryChanged('test:hash');
		const called = count;
		unsub();
		store.notifyQueryChanged('test:hash');
		expect(count).toBe(called);
	});

	it('multiple watchLocal listeners all fire', () => {
		const store = new CacheStore();
		let a = 0;
		let b = 0;
		store.watchLocal('test:hash', () => { a++; });
		store.watchLocal('test:hash', () => { b++; });
		store.writeLocal('test:hash', { status: 'success', data: { v: 1 } });
		store.notifyQueryChanged('test:hash');
		expect(a).toBeGreaterThanOrEqual(1);
		expect(b).toBeGreaterThanOrEqual(1);
	});
});
