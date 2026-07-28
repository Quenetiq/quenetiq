import { describe, it, expect, beforeEach } from 'vitest';
import { NormalizedCache, CacheGc } from '@quenetiq/cache';

describe('CacheGc', () => {
	let cache: NormalizedCache;
	let gc: CacheGc;

	beforeEach(() => {
		cache = new NormalizedCache();
		gc = new CacheGc(cache, 60_000);
	});

	const user1 = { __typename: 'User', id: '1', name: 'Alice' };
	const user2 = { __typename: 'User', id: '2', name: 'Bob' };

	describe('track', () => {
		it('increments ref count for each entity', () => {
			gc.track([user1]);
			expect(gc.refCountOf('User', '1')).toBe(1);
		});

		it('increments ref count for multiple entities', () => {
			gc.track([user1, user2]);
			expect(gc.refCountOf('User', '1')).toBe(1);
			expect(gc.refCountOf('User', '2')).toBe(1);
		});

		it('increments ref count when tracked multiple times', () => {
			gc.track([user1]);
			gc.track([user1]);
			expect(gc.refCountOf('User', '1')).toBe(2);
		});

		it('removes dangling marker on re-track', () => {
			gc.track([user1]);
			gc.release([user1]);
			// Entity is now dangling
			gc.track([user1]);
			// Should no longer be dangling — sweep should not evict
			const evicted = gc.sweep();
			expect(evicted).toBe(0);
		});

		it('handles empty array', () => {
			expect(() => gc.track([])).not.toThrow();
		});
	});

	describe('release', () => {
		it('decrements ref count', () => {
			gc.track([user1]);
			gc.track([user1]);
			gc.release([user1]);
			expect(gc.refCountOf('User', '1')).toBe(1);
		});

		it('marks as dangling when ref count reaches zero', () => {
			gc.track([user1]);
			gc.release([user1]);
			expect(gc.refCountOf('User', '1')).toBe(0);
		});

		it('handles release of never-tracked entity gracefully', () => {
			expect(() => gc.release([{ __typename: 'Ghost', id: 'x' }])).not.toThrow();
			expect(gc.refCountOf('Ghost', 'x')).toBe(0);
		});

		it('handles release of partially tracked entities', () => {
			gc.track([user1]);
			gc.release([user1, user2]);
			expect(gc.refCountOf('User', '2')).toBe(0);
		});
	});

	describe('sweep', () => {
		it('evicts entities dangling longer than TTL', () => {
			cache.set(user1);
			const localGc = new CacheGc(cache, -1);
			localGc.track([user1]);
			localGc.release([user1]);

			const evicted = localGc.sweep();
			expect(evicted).toBe(1);
			expect(cache.get('User', '1')).toBeUndefined();
		});

		it('does not evict entities still within TTL', () => {
			cache.set(user1);
			// Use a GC with very long TTL
			const longGc = new CacheGc(cache, 3600_000);
			longGc.track([user1]);
			longGc.release([user1]);

			const evicted = longGc.sweep();
			expect(evicted).toBe(0);
			expect(cache.get('User', '1')).toBeDefined();
		});

		it('does not evict entities still referenced', () => {
			cache.set(user1);
			gc.track([user1]);
			// Not releasing — still referenced
			const evicted = gc.sweep();
			expect(evicted).toBe(0);
			expect(cache.get('User', '1')).toBeDefined();
		});

		it('returns number of evicted entities', () => {
			cache.set(user1);
			cache.set(user2);
			const localGc = new CacheGc(cache, -1);
			localGc.track([user1, user2]);
			localGc.release([user1, user2]);

			const evicted = localGc.sweep();
			expect(evicted).toBe(2);
		});
	});

	describe('refCountOf', () => {
		it('returns 0 for never-tracked entity', () => {
			expect(gc.refCountOf('User', 'new')).toBe(0);
		});

		it('returns current ref count', () => {
			gc.track([user1]);
			gc.track([user1]);
			expect(gc.refCountOf('User', '1')).toBe(2);
		});
	});

	describe('edge cases', () => {
		it('handles entities without id field in track', () => {
			const noId = { __typename: 'User', name: 'no-id' } as never;
			expect(() => gc.track([noId])).not.toThrow();
		});

		it('handles entities without id field in release', () => {
			const noId = { __typename: 'User', name: 'no-id' } as never;
			expect(() => gc.release([noId])).not.toThrow();
		});

		it('handles release more times than tracked without going negative', () => {
			gc.track([user1]);
			gc.release([user1]);
			gc.release([user1]); // second release — refCount already 0
			expect(gc.refCountOf('User', '1')).toBe(0);
		});

		it('track after release marks entity as not dangling', () => {
			gc.track([user1]);
			gc.release([user1]);
			// user1 is now dangling
			gc.track([user1]); // re-tracked
			const evicted = gc.sweep();
			expect(evicted).toBe(0); // should not evict because re-tracked
		});

		it('sweep with no dangling entities returns 0', () => {
			const evicted = gc.sweep();
			expect(evicted).toBe(0);
		});

		it('sweep does not evict entities still in cache when release not called', () => {
			cache.set(user1);
			gc.track([user1]);
			// never released — still referenced
			const evicted = gc.sweep();
			expect(evicted).toBe(0);
			expect(cache.get('User', '1')).toBeDefined();
		});
	});
});
