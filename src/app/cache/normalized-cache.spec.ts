import { describe, it, expect } from 'vitest';
import { NormalizedCache } from '@quenetiq/cache';

describe('NormalizedCache', () => {
	function createCache(): NormalizedCache {
		return new NormalizedCache();
	}

	const user1 = { __typename: 'User', id: '1', name: 'Alice', age: 30 };
	const user2 = { __typename: 'User', id: '2', name: 'Bob', age: 25 };
	const post1 = { __typename: 'Post', id: '10', title: 'Hello' };

	describe('key', () => {
		it('generates composite key from typename and id', () => {
			const cache = createCache();
			expect(cache.key('User', '1')).toBe('User:1');
			expect(cache.key('Post', 'abc')).toBe('Post:abc');
		});
	});

	describe('set / get', () => {
		it('stores and retrieves entities by typename + id', () => {
			const cache = createCache();
			cache.set(user1);
			expect(cache.get('User', '1')).toEqual(user1);
		});

		it('returns undefined for missing entity', () => {
			const cache = createCache();
			expect(cache.get('User', 'nonexistent')).toBeUndefined();
		});

		it('overwrites existing entity with same key', () => {
			const cache = createCache();
			cache.set(user1);
			cache.set({ ...user1, age: 31 });
			expect(cache.get('User', '1')!['age']).toBe(31);
		});

		it('stores entities with different types separately', () => {
			const cache = createCache();
			cache.set(user1);
			cache.set(post1);
			expect(cache.get('User', '1')).toEqual(user1);
			expect(cache.get('Post', '10')).toEqual(post1);
		});

		it('ignores entity without __typename', () => {
			const cache = createCache();
			cache.set({ id: '1', name: 'no-type' } as never);
			expect(cache.get('User', '1')).toBeUndefined();
			expect(cache.count()).toBe(0);
		});

		it('stores entity without id using inline key', () => {
			const cache = createCache();
			cache.set({ __typename: 'User', name: 'no-id' } as never);
			expect(cache.count()).toBe(1);
		});

		it('get with only typename returns all entities of that type', () => {
			const cache = createCache();
			cache.set({ __typename: 'User', name: 'inline-user' } as never);
			cache.set(user1);
			const users = cache.get('User') as Record<string, unknown>[];
			expect(users).toHaveLength(2);
			expect(users.some((u) => u['name'] === 'inline-user')).toBe(true);
			expect(users.some((u) => u['name'] === 'Alice')).toBe(true);
		});
	});

	describe('merge', () => {
		it('adds new entity when key does not exist', () => {
			const cache = createCache();
			cache.merge({ __typename: 'User', id: '1', name: 'Alice' });
			expect(cache.get('User', '1')).toEqual({ __typename: 'User', id: '1', name: 'Alice' });
		});

		it('deep-merges fields into existing entity', () => {
			const cache = createCache();
			cache.set(user1);
			cache.merge({ __typename: 'User', id: '1', age: 31, role: 'admin' });
			const merged = cache.get('User', '1')!;
			expect(merged['name']).toBe('Alice');
			expect(merged['age']).toBe(31);
			expect(merged['role']).toBe('admin');
		});

		it('overwrites existing field with new value', () => {
			const cache = createCache();
			cache.set(user1);
			cache.merge({ __typename: 'User', id: '1', name: 'Alicia' });
			expect(cache.get('User', '1')!['name']).toBe('Alicia');
		});
	});

	describe('remove', () => {
		it('removes entity from cache', () => {
			const cache = createCache();
			cache.set(user1);
			cache.remove('User', '1');
			expect(cache.get('User', '1')).toBeUndefined();
		});

		it('does nothing when removing nonexistent entity', () => {
			const cache = createCache();
			expect(() => cache.remove('User', 'ghost')).not.toThrow();
		});

		it('remove with only typename removes all entities of that type', () => {
			const cache = createCache();
			cache.set(user1);
			cache.set(user2);
			cache.set(post1);
			cache.remove('User');
			expect(cache.count()).toBe(1);
			expect(cache.get('Post', '10')).toEqual(post1);
		});
	});

	describe('all', () => {
		it('returns all entities as a map copy', () => {
			const cache = createCache();
			cache.set(user1);
			cache.set(user2);
			const all = cache.all();
			expect(all.size).toBe(2);
			expect(all.get('User:1')).toEqual(user1);
			expect(all.get('User:2')).toEqual(user2);
		});

		it('returns a copy not a reference', () => {
			const cache = createCache();
			cache.set(user1);
			const all = cache.all();
			all.clear();
			expect(cache.count()).toBe(1);
		});
	});

	describe('clear', () => {
		it('removes all entities and optimistic updates', () => {
			const cache = createCache();
			cache.set(user1);
			cache.set(user2);
			cache.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => entities.set('Custom:1', { __typename: 'Custom', id: '1' }),
				rollback: () => {},
			});
			// applyOptimistic adds one more entity via apply()
			expect(cache.count()).toBe(3);
			cache.clear();
			expect(cache.count()).toBe(0);
			expect(cache.get('User', '1')).toBeUndefined();
		});
	});

	describe('optimistic updates', () => {
		it('applyOptimistic applies mutation to entities', () => {
			const cache = createCache();
			cache.set(user1);
			cache.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'Optimistic Alice' });
				},
				rollback: () => {},
			});
			expect(cache.get('User', '1')!['name']).toBe('Optimistic Alice');
		});

		it('rollbackOptimistic restores previous state', () => {
			const cache = createCache();
			cache.set(user1);
			cache.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'Optimistic Alice' });
				},
				rollback: () => {},
			});
			cache.rollbackOptimistic('opt-1');
			expect(cache.get('User', '1')!['name']).toBe('Alice');
		});

		it('commitOptimistic keeps changes and removes tracking', () => {
			const cache = createCache();
			cache.set(user1);
			cache.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'Committed' });
				},
				rollback: () => {},
			});
			cache.commitOptimistic('opt-1');
			expect(cache.get('User', '1')!['name']).toBe('Committed');
		});

		it('can apply multiple optimistic updates', () => {
			const cache = createCache();
			cache.set(user1);
			cache.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'First' });
				},
				rollback: () => {},
			});
			cache.applyOptimistic({
				id: 'opt-2',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'Second' });
				},
				rollback: () => {},
			});
			expect(cache.get('User', '1')!['name']).toBe('Second');
		});

		it('rollback of first optimistic reverts to snapshot before both', () => {
			const cache = createCache();
			cache.set(user1);
			cache.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => entities.set('User:1', { ...user1, name: 'First' }),
				rollback: () => {},
			});
			cache.applyOptimistic({
				id: 'opt-2',
				apply: (entities) => entities.set('User:1', { ...user1, name: 'Second' }),
				rollback: () => {},
			});
			cache.rollbackOptimistic('opt-1');
			expect(cache.get('User', '1')!['name']).toBe('Alice');
		});
	});

	describe('snapshot / restore', () => {
		it('serializes and deserializes entities', () => {
			const cache = createCache();
			cache.set(user1);
			cache.set(user2);
			const json = cache.snapshot();
			const cache2 = createCache();
			cache2.restore(json);
			expect(cache2.count()).toBe(2);
			expect(cache2.get('User', '1')).toEqual(user1);
			expect(cache2.get('User', '2')).toEqual(user2);
		});

		it('restore replaces all entities', () => {
			const cache = createCache();
			cache.set(user1);
			cache.restore({ entities: [['Post:10', post1]], meta: [] });
			expect(cache.count()).toBe(1);
			expect(cache.get('Post', '10')).toEqual(post1);
			expect(cache.get('User', '1')).toBeUndefined();
		});
	});

	describe('count', () => {
		it('returns correct entity count', () => {
			const cache = createCache();
			expect(cache.count()).toBe(0);
			cache.set(user1);
			expect(cache.count()).toBe(1);
			cache.set(user2);
			expect(cache.count()).toBe(2);
			cache.remove('User', '1');
			expect(cache.count()).toBe(1);
		});
	});

	describe('inline keys', () => {
		it('auto-assigns inline keys for entities without id', () => {
			const a = { __typename: 'User', name: 'A' } as never;
			const b = { __typename: 'User', name: 'B' } as never;
			const cache = createCache();
			cache.set(a);
			cache.set(b);
			expect(cache.count()).toBe(2);
			const users = cache.get('User')!;
			expect(users).toHaveLength(2);
			expect(users.some((u) => u['name'] === 'A')).toBe(true);
			expect(users.some((u) => u['name'] === 'B')).toBe(true);
		});

		it('remove with only typename removes both id and inline entities', () => {
			const cache = createCache();
			cache.set(user1);
			cache.set({ __typename: 'User', name: 'inline' } as never);
			cache.remove('User');
			expect(cache.count()).toBe(0);
		});

		it('snapshot and restore includes inline counter', () => {
			const cache = createCache();
			cache.set({ __typename: 'User', name: 'inline' } as never);
			const json = cache.snapshot();
			const cache2 = new NormalizedCache();
			cache2.restore(json);
			expect(cache2.count()).toBe(1);
		});
	});

	describe('edge cases', () => {
		it('get with typename returns undefined when no entities of that type', () => {
			const cache = createCache();
			cache.set(user1);
			expect(cache.get('Post')).toBeUndefined();
		});

		it('set with both id and keyFields policy uses keyFields', () => {
			const cache = new NormalizedCache({ Post: { keyFields: ['slug'] } });
			cache.set({ __typename: 'Post', id: '1', slug: 'hello', title: 'World' } as never);
			// Should be keyed by slug, not id
			expect(cache.get('Post', 'hello')).toBeDefined();
			expect(cache.get('Post', '1')).toBeUndefined();
		});

		it('set with null __typename is ignored', () => {
			const cache = createCache();
			cache.set({ __typename: null as unknown as string, id: '1', name: 'no-type' } as never);
			expect(cache.count()).toBe(0);
		});

		it('set with undefined __typename is ignored', () => {
			const cache = createCache();
			cache.set({ id: '1', name: 'no-type' } as never);
			expect(cache.count()).toBe(0);
		});

		it('merge with entity without id uses inline key', () => {
			const cache = createCache();
			cache.merge({ __typename: 'User', name: 'inline-merge' } as never);
			expect(cache.count()).toBe(1);
			const users = cache.get('User')!;
			expect(users).toHaveLength(1);
		});

		it('rollbackOptimistic with non-existent id does nothing', () => {
			const cache = createCache();
			expect(() => cache.rollbackOptimistic('non-existent')).not.toThrow();
		});

		it('commitOptimistic with non-existent id does nothing', () => {
			const cache = createCache();
			expect(() => cache.commitOptimistic('non-existent')).not.toThrow();
		});
	});
});
