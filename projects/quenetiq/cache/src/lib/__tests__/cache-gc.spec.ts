import { describe, it, expect, beforeEach } from 'vitest';
import { CacheGc } from '../cache-gc';
import { NormalizedCache } from '../normalized-cache';

describe('CacheGc', () => {
	let cache: NormalizedCache;
	let gc: CacheGc;

	beforeEach(() => {
		cache = new NormalizedCache();
		gc = new CacheGc(cache, 100); // 100ms TTL for tests
	});

	it('starts with zero refcounts', () => {
		expect(gc.refCountOf('User', '1')).toBe(0);
	});

	it('track increments refcount', () => {
		gc.track([{ __typename: 'User', id: '1' }]);
		expect(gc.refCountOf('User', '1')).toBe(1);

		gc.track([{ __typename: 'User', id: '1' }]);
		expect(gc.refCountOf('User', '1')).toBe(2);
	});

	it('release decrements refcount', () => {
		gc.track([{ __typename: 'User', id: '1' }]);
		gc.track([{ __typename: 'User', id: '1' }]);
		expect(gc.refCountOf('User', '1')).toBe(2);

		gc.release([{ __typename: 'User', id: '1' }]);
		expect(gc.refCountOf('User', '1')).toBe(1);
	});

	it('release to zero removes from refcount and adds to dangling', () => {
		gc.track([{ __typename: 'User', id: '1' }]);
		gc.release([{ __typename: 'User', id: '1' }]);
		expect(gc.refCountOf('User', '1')).toBe(0);
	});

	it('sweep evicts dangling entities after TTL', async () => {
		// Add entity to cache
		cache.set({ __typename: 'User', id: '1', name: 'Alice' });
		expect(cache.get('User', '1')).toBeDefined();

		// Track and release to make dangling
		gc.track([{ __typename: 'User', id: '1' }]);
		gc.release([{ __typename: 'User', id: '1' }]);

		// Sweep immediately — should not evict (TTL not expired)
		const evicted1 = gc.sweep();
		expect(evicted1.count).toBe(0);
		expect(evicted1.evicted).toEqual([]);
		expect(cache.get('User', '1')).toBeDefined();

		// Wait for TTL to expire
		await new Promise((r) => setTimeout(r, 150));

		// Sweep again — should evict
		const evicted2 = gc.sweep();
		expect(evicted2.count).toBe(1);
		expect(evicted2.evicted).toEqual(['User:1']);
		expect(cache.get('User', '1')).toBeUndefined();
	});

	it('sweep returns 0 when no dangling entities', () => {
		expect(gc.sweep().count).toBe(0);
	});

	it('sweep returns 0 when dangling entities are within TTL', () => {
		gc.track([{ __typename: 'User', id: '1' }]);
		gc.release([{ __typename: 'User', id: '1' }]);

		expect(gc.sweep().count).toBe(0);
	});

	it('sweep evicts multiple dangling entities', async () => {
		cache.set({ __typename: 'User', id: '1', name: 'Alice' });
		cache.set({ __typename: 'User', id: '2', name: 'Bob' });
		cache.set({ __typename: 'Post', id: '10', title: 'Hello' });

		gc.track([
			{ __typename: 'User', id: '1' },
			{ __typename: 'User', id: '2' },
			{ __typename: 'Post', id: '10' },
		]);
		gc.release([
			{ __typename: 'User', id: '1' },
			{ __typename: 'User', id: '2' },
		]);
		// Post:10 still has refcount 1, so it should NOT be evicted

		await new Promise((r) => setTimeout(r, 150));

		const evicted = gc.sweep();
		expect(evicted.count).toBe(2);
		expect(evicted.evicted).toEqual(expect.arrayContaining(['User:1', 'User:2']));
		expect(cache.get('User', '1')).toBeUndefined();
		expect(cache.get('User', '2')).toBeUndefined();
		expect(cache.get('Post', '10')).toBeDefined();
	});

	it('track after release resets dangling timer', async () => {
		cache.set({ __typename: 'User', id: '1', name: 'Alice' });

		gc.track([{ __typename: 'User', id: '1' }]);
		gc.release([{ __typename: 'User', id: '1' }]);

		await new Promise((r) => setTimeout(r, 60));

		// Re-track before TTL expires — should reset dangling timer
		gc.track([{ __typename: 'User', id: '1' }]);
		gc.release([{ __typename: 'User', id: '1' }]);

		await new Promise((r) => setTimeout(r, 60));

		// Total time since original release is 120ms, but since re-track
		// was at 60ms, dangling since is at 120ms, so not yet expired at 120ms
		// Actually 60+60=120ms > 100ms TTL... let's check
		const evicted = gc.sweep();
		// The entity was re-tracked at 60ms and released at ~120ms
		// sweep at ~120ms: dangling since ~120ms, TTL=100ms → 120-120=0 < 100 → not evicted
		expect(evicted.count).toBe(0);
		expect(cache.get('User', '1')).toBeDefined();
	});
});
