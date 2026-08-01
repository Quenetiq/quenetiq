import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NormalizedCache } from '../normalized-cache';

function createCache(
	policies?: Record<string, { keyFields?: string[]; merge?: (...args: unknown[]) => unknown; resolve?: (...args: unknown[]) => unknown }>,
) {
	return new NormalizedCache(policies as never);
}

const user1 = { __typename: 'User', id: '1', name: 'Alice', age: 30 };
const user2 = { __typename: 'User', id: '2', name: 'Bob', age: 25 };
const post1 = { __typename: 'Post', id: '10', title: 'Hello' };

describe('NormalizedCache — untested methods', () => {
	describe('allMeta', () => {
		it('returns a copy of all entity metadata', () => {
			const cache = createCache();
			cache.set(user1);
			const meta = cache.allMeta();
			expect(meta.size).toBe(1);
			const key = cache.key('User', '1');
			expect(meta.get(key)).toBeDefined();
			expect(meta.get(key)!.source).toBe('');
		});

		it('returns empty map for empty cache', () => {
			const cache = createCache();
			expect(cache.allMeta().size).toBe(0);
		});
	});

	describe('getMeta', () => {
		it('returns metadata for a specific key', () => {
			const cache = createCache();
			cache.set(user1);
			const meta = cache.getMeta(cache.key('User', '1'));
			expect(meta).toBeDefined();
			expect(meta!.source).toBe('');
		});

		it('returns undefined for unknown key', () => {
			const cache = createCache();
			expect(cache.getMeta('Nonexistent:99')).toBeUndefined();
		});
	});

	describe('resolveField', () => {
		it('returns a field value from an entity', () => {
			const cache = createCache();
			cache.set(user1);
			expect(cache.resolveField('User', '1', 'name')).toBe('Alice');
			expect(cache.resolveField('User', '1', 'age')).toBe(30);
		});

		it('returns undefined for missing field', () => {
			const cache = createCache();
			cache.set(user1);
			expect(cache.resolveField('User', '1', 'nonexistent')).toBeUndefined();
		});

		it('uses custom resolve function from type policy', () => {
			const cache = createCache({
				User: {
					resolve: (_field: string, _args: Record<string, unknown>) => 'resolved',
				},
			});
			cache.set(user1);
			expect(cache.resolveField('User', '1', 'name')).toBe('resolved');
		});

		it('returns undefined for missing entity', () => {
			const cache = createCache();
			expect(cache.resolveField('User', 'ghost', 'name')).toBeUndefined();
		});
	});

	describe('isStale', () => {
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it('returns true for entity older than maxAge', () => {
			vi.setSystemTime(2000);
			const cache = createCache();
			cache.set(user1);
			vi.setSystemTime(5000);
			expect(cache.isStale('User', '1', 1000)).toBe(true);
		});

		it('returns false for entity within maxAge', () => {
			vi.setSystemTime(1000);
			const cache = createCache();
			cache.set(user1);
			vi.setSystemTime(1500);
			expect(cache.isStale('User', '1', 1000)).toBe(false);
		});

		it('returns true for missing entity', () => {
			const cache = createCache();
			expect(cache.isStale('User', 'ghost', 1000)).toBe(true);
		});
	});

	describe('getEntityAge', () => {
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it('returns ms since entity was last updated', () => {
			vi.setSystemTime(1000);
			const cache = createCache();
			cache.set(user1);
			vi.setSystemTime(2500);
			const age = cache.getEntityAge('User', '1');
			expect(age).toBeGreaterThanOrEqual(1499);
		});

		it('returns undefined for missing entity', () => {
			const cache = createCache();
			expect(cache.getEntityAge('User', 'ghost')).toBeUndefined();
		});
	});

	describe('optimisticCount', () => {
		it('returns 0 when no optimistic updates are active', () => {
			const cache = createCache();
			expect(cache.optimisticCount()).toBe(0);
		});

		it('returns number of active optimistic updates', () => {
			const cache = createCache();
			cache.applyOptimistic({
				id: 'opt-1', apply: () => {}, rollback: () => {},
			});
			cache.applyOptimistic({
				id: 'opt-2', apply: () => {}, rollback: () => {},
			});
			expect(cache.optimisticCount()).toBe(2);
		});

		it('decrements after commit', () => {
			const cache = createCache();
			cache.applyOptimistic({
				id: 'opt-1', apply: () => {}, rollback: () => {},
			});
			cache.commitOptimistic('opt-1');
			expect(cache.optimisticCount()).toBe(0);
		});
	});

	describe('explain', () => {
		it('returns entity info with key, meta, age, staleness, size', () => {
			vi.useFakeTimers();
			vi.setSystemTime(1000);
			const cache = createCache();
			cache.set(user1);

			const info = cache.explain('User', '1');
			expect(info).toBeDefined();
			expect(info!.key).toBe('User:1');
			expect(info!.entity).toEqual(user1);
			expect(info!.meta).toBeDefined();
			expect(typeof info!.ageMs).toBe('number');
			expect(info!.staleness).toMatch(/fresh|stale/);
			expect(typeof info!.sizeBytes).toBe('number');
			expect(info!.sizeBytes).toBeGreaterThan(0);
			vi.useRealTimers();
		});

		it('returns undefined for missing entity', () => {
			const cache = createCache();
			expect(cache.explain('User', 'ghost')).toBeUndefined();
		});
	});

	describe('mergeDry', () => {
		it('returns merge info for new entity', () => {
			const cache = createCache();
			const result = cache.mergeDry({ __typename: 'User', id: '1', name: 'New' });
			expect(result.key).toBe('User:1');
			expect(result.existed).toBe(false);
			expect(result.changedFields).toContain('name');
			expect(result.previousValues).toEqual({});
			expect(result.result).toEqual({ __typename: 'User', id: '1', name: 'New' });
		});

		it('returns merge info for existing entity', () => {
			const cache = createCache();
			cache.set(user1);
			const result = cache.mergeDry({ __typename: 'User', id: '1', age: 31, role: 'admin' });
			expect(result.existed).toBe(true);
			expect(result.changedFields).toContain('age');
			expect(result.changedFields).toContain('role');
			expect(result.previousValues['age']).toBe(30);
			expect(result.previousValues['name']).toBeUndefined();
			expect(result.result['age']).toBe(31);
			expect(result.result['name']).toBe('Alice');
		});

		it('returns empty changedFields and previousValues when nothing changed', () => {
			const cache = createCache();
			cache.set(user1);
			const result = cache.mergeDry({ __typename: 'User', id: '1', name: 'Alice', age: 30 });
			expect(result.changedFields).toEqual([]);
			expect(result.previousValues).toEqual({});
		});

		it('uses custom merge function from type policy', () => {
			const cache = createCache({
				User: {
					merge: (_existing: unknown, incoming: unknown) => ({
						...(incoming as Record<string, unknown>),
						merged: true,
					}),
				},
			});
			cache.set(user1);
			const result = cache.mergeDry({ __typename: 'User', id: '1', extra: 'value' });
			expect(result.result['merged']).toBe(true);
			expect(result.result['extra']).toBe('value');
		});
	});

	describe('allKeys', () => {
		it('returns all entity keys', () => {
			const cache = createCache();
			cache.set(user1);
			cache.set(user2);
			cache.set(post1);
			const keys = cache.allKeys();
			expect(keys).toContain('User:1');
			expect(keys).toContain('User:2');
			expect(keys).toContain('Post:10');
		});

		it('returns empty array for empty cache', () => {
			const cache = createCache();
			expect(cache.allKeys()).toEqual([]);
		});
	});

	describe('keysByType', () => {
		it('returns keys for a specific typename', () => {
			const cache = createCache();
			cache.set(user1);
			cache.set(user2);
			cache.set(post1);
			const userKeys = cache.keysByType('User');
			expect(userKeys).toHaveLength(2);
			expect(userKeys).toContain('User:1');
			expect(userKeys).toContain('User:2');
		});

		it('returns empty array for type with no entities', () => {
			const cache = createCache();
			cache.set(user1);
			expect(cache.keysByType('Post')).toEqual([]);
		});
	});

	describe('getEntityTypes', () => {
		it('returns all unique typenames in cache', () => {
			const cache = createCache();
			cache.set(user1);
			cache.set(post1);
			const types = cache.getEntityTypes();
			expect(types).toHaveLength(2);
			expect(types).toContain('User');
			expect(types).toContain('Post');
		});
	});

	describe('setTypePolicies', () => {
		it('updates keyFields after construction', () => {
			const cache = createCache();
			cache.setTypePolicies({ Post: { keyFields: ['slug'] } });
			cache.set({ __typename: 'Post', id: '1', slug: 'my-post', title: 'Hello' } as never);
			expect(cache.get('Post', 'my-post')).toBeDefined();
			expect(cache.get('Post', '1')).toBeUndefined();
		});

		it('does not affect existing entities', () => {
			const cache = createCache();
			cache.set({ __typename: 'Post', id: '1', slug: 'old', title: 'Before' } as never);
			cache.setTypePolicies({ Post: { keyFields: ['slug'] } });
			expect(cache.get('Post', '1')).toBeDefined();
		});
	});

	describe('merge with custom policy', () => {
		it('uses custom merge function and returns changed fields', () => {
			const cache = createCache({
				User: {
					merge: (existing, incoming) => ({
						...(typeof existing === 'object' && existing !== null ? existing as Record<string, unknown> : {}),
						...(incoming as Record<string, unknown>),
						mergedBy: 'custom',
					}),
				},
			});
			cache.set(user1);
			const result = cache.merge({ __typename: 'User', id: '1', age: 35 });
			expect(cache.get('User', '1')!['age']).toBe(35);
			expect(cache.get('User', '1')!['mergedBy']).toBe('custom');
			expect(result.changedFields).toContain('age');
		});

		it('throws when custom merge returns non-entity', () => {
			const cache = createCache({
				User: {
					merge: () => null,
				},
			});
			cache.set(user1);
			expect(() => cache.merge({ __typename: 'User', id: '1', age: 99 })).toThrow();
		});
	});
});
