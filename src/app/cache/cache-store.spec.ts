import { describe, it, expect, beforeEach } from 'vitest';
import { CacheStore, createCache, CachePersistence } from '@quenetiq/cache';

describe('CacheStore', () => {
	const user1 = { __typename: 'User', id: '1', name: 'Alice', age: 30 };
	const user2 = { __typename: 'User', id: '2', name: 'Bob', age: 25 };
	const post1 = { __typename: 'Post', id: '10', title: 'Hello' };

	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	describe('query / write', () => {
		it('stores and retrieves entities', () => {
			store.write(user1);
			expect(store.query('User', '1')).toEqual(user1);
		});

		it('query returns undefined for missing entity', () => {
			expect(store.query('User', 'nonexistent')).toBeUndefined();
		});

		it('overwrites existing entity', () => {
			store.write(user1);
			store.write({ ...user1, name: 'Alicia' });
			const result = store.query('User', '1') as Record<string, unknown>;
			expect(result['name']).toBe('Alicia');
		});
	});

	describe('merge', () => {
		it('adds new entity when key does not exist', () => {
			store.merge({ __typename: 'User', id: '1', name: 'Alice' });
			expect(store.query('User', '1')).toBeDefined();
		});

		it('partial merges into existing entity', () => {
			store.write(user1);
			store.merge({ __typename: 'User', id: '1', age: 31, role: 'admin' });
			const merged = store.query('User', '1') as Record<string, unknown>;
			expect(merged['name']).toBe('Alice');
			expect(merged['age']).toBe(31);
			expect(merged['role']).toBe('admin');
		});
	});

	describe('evict', () => {
		it('removes entity from cache', () => {
			store.write(user1);
			store.evict('User', '1');
			expect(store.query('User', '1')).toBeUndefined();
		});

		it('does nothing when evicting nonexistent entity', () => {
			expect(() => store.evict('User', 'ghost')).not.toThrow();
		});
	});

	describe('optimistic updates', () => {
		it('applyOptimistic modifies entity optimistically', () => {
			store.write(user1);
			store.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'Optimistic' });
				},
				rollback: () => {},
			});
			expect((store.query('User', '1') as Record<string, unknown>)['name']).toBe('Optimistic');
		});

		it('rollbackOptimistic restores state', () => {
			store.write(user1);
			store.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'Optimistic' });
				},
				rollback: () => {},
			});
			store.rollbackOptimistic('opt-1');
			expect((store.query('User', '1') as Record<string, unknown>)['name']).toBe('Alice');
		});

		it('commitOptimistic keeps changes', () => {
			store.write(user1);
			store.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'Committed' });
				},
				rollback: () => {},
			});
			store.commitOptimistic('opt-1');
			expect((store.query('User', '1') as Record<string, unknown>)['name']).toBe('Committed');
		});
	});

	describe('local state', () => {
		it('writeLocal / readLocal round-trip', () => {
			store.writeLocal('theme', 'dark');
			expect(store.readLocal('theme')).toBe('dark');
		});

		it('readLocal returns undefined for missing key', () => {
			expect(store.readLocal('missing')).toBeUndefined();
		});

		it('watchLocal fires callback on write', () => {
			const values: unknown[] = [];
			store.watchLocal('key', () => values.push(store.readLocal('key')));
			store.writeLocal('key', 'v1');
			store.writeLocal('key', 'v2');
			expect(values).toEqual(['v1', 'v2']);
		});

		it('clearLocalState removes all local entries', () => {
			store.writeLocal('a', 1);
			store.writeLocal('b', 2);
			store.clearLocalState();
			expect(store.readLocal('a')).toBeUndefined();
			expect(store.readLocal('b')).toBeUndefined();
		});

		it('writeLocalWithTypes scopes state to entity types', () => {
			store.writeLocalWithTypes('selected', '42', new Set(['Post']));
			store.clearLocalStateByTypes(['Post']);
			expect(store.readLocal('selected')).toBeUndefined();
		});

		it('writeLocalWithTypes does not clear unrelated types', () => {
			store.writeLocalWithTypes('selected', '42', new Set(['Post']));
			store.clearLocalStateByTypes(['User']);
			expect(store.readLocal('selected')).toBe('42');
		});
	});

	describe('serialize / deserialize', () => {
		it('serialize produces JSON with entities and local state', () => {
			store.write(user1);
			store.writeLocal('theme', 'dark');
			const json = store.serialize();
			const parsed = JSON.parse(json);
			expect(parsed.entities).toBeDefined();
			expect(parsed.localState).toBeDefined();
		});

		it('deserialize restores entities and local state', () => {
			store.write(user1);
			store.writeLocal('theme', 'dark');
			const json = store.serialize();

			const store2 = new CacheStore();
			store2.deserialize(json);

			expect(store2.query('User', '1')).toEqual(user1);
			expect(store2.readLocal('theme')).toBe('dark');
		});

		it('deserialize overwrites matching keys, preserves others', () => {
			store.write(user1);
			store.writeLocal('theme', 'dark');
			const json = store.serialize();

			const store2 = new CacheStore();
			store2.write(post1);
			store2.writeLocal('other', 'value');
			store2.deserialize(json);

			expect(store2.query('User', '1')).toEqual(user1);
			expect(store2.query('Post', '10')).toEqual(post1);
			expect(store2.readLocal('theme')).toBe('dark');
			expect(store2.readLocal('other')).toBe('value');
		});
	});

	describe('setTypePolicies', () => {
		it('updates type policies post-construction', () => {
			store.setTypePolicies({
				Post: { keyFields: ['slug'] },
			});
			store.write({ __typename: 'Post', slug: 'hello', title: 'World' } as never);
			expect(store.query('Post', 'hello')).toBeDefined();
		});
	});

	describe('collectGarbage', () => {
		it('returns number of evicted entities', () => {
			store.write(user1);
			store.cache.set(user1);
			// Track and release to make it dangling
			store.gc.track([user1]);
			store.gc.release([user1]);
			const count = store.collectGarbage();
			expect(typeof count).toBe('number');
		});
	});

	describe('persist', () => {
		it('does not throw when persistence is not configured', () => {
			expect(() => store.persist()).not.toThrow();
		});

		it('persists and restores entities when configured', async () => {
			const persist = new CachePersistence({ storage: 'memory' });
			const persistedStore = new CacheStore({ persist });
			persistedStore.write(user1);
			await persistedStore.persist();

			const restoredStore = new CacheStore({ persist });
			expect(restoredStore.query('User', '1')).toEqual(user1);
		});

		it('persists and restores entities', async () => {
			const persist = new CachePersistence({ storage: 'memory' });
			const persistedStore = new CacheStore({ persist });
			persistedStore.write(user1);
			await persistedStore.persist();

			const restoredStore = new CacheStore({ persist });
			expect(restoredStore.query('User', '1')).toEqual(user1);
		});

		it('persists config via plain object in createCache', async () => {
			const persist = new CachePersistence({ storage: 'memory' });
			const cache1 = createCache({ persist });
			cache1.write(user1);
			await cache1.persist();

			const cache2 = createCache({ persist });
			expect(cache2.query('User', '1')).toEqual(user1);
		});
	});

	describe('constructor with typePolicies', () => {
		it('uses custom keyFields from config', () => {
			const policyStore = new CacheStore({
				typePolicies: { Post: { keyFields: ['slug'] } },
			});
			policyStore.write({ __typename: 'Post', slug: 'hello', title: 'World' } as never);
			expect(policyStore.query('Post', 'hello')).toBeDefined();
		});

		it('uses custom merge from config', () => {
			const policyStore = new CacheStore({
				typePolicies: {
					Page: {
						merge: (existing, incoming) => ({
							...(incoming as Record<string, unknown>),
							items: [
								...(((existing as Record<string, unknown> | undefined)?.['items'] as unknown[]) ?? []),
								...((incoming as Record<string, unknown>)['items'] as unknown[]),
							],
						}),
					},
				},
			});

			policyStore.merge({ __typename: 'Page', id: '1', items: [{ id: 'a' }] } as never);
			policyStore.merge({ __typename: 'Page', id: '1', items: [{ id: 'b' }] } as never);

			const result = policyStore.query('Page', '1') as Record<string, unknown>;
			expect(result['items'] as unknown[]).toHaveLength(2);
		});
	});
});

describe('createCache', () => {
	it('returns a CacheStore instance', () => {
		const cache = createCache();
		expect(cache).toBeInstanceOf(CacheStore);
	});

	it('persist round-trip with CachePersistence instance', async () => {
		const persist = new CachePersistence({ storage: 'memory' });
		const cache = createCache({ persist });
		cache.write({ __typename: 'User', id: '1', name: 'Alice' });
		await cache.persist();

		const cache2 = createCache({ persist });
		expect(cache2.query('User', '1')).toEqual({ __typename: 'User', id: '1', name: 'Alice' });
	});

	it('accepts typePolicies', () => {
		const cache = createCache({
			typePolicies: { Post: { keyFields: ['slug'] } },
		});
		cache.write({ __typename: 'Post', slug: 'hello', title: 'World' } as never);
		expect(cache.query('Post', 'hello')).toBeDefined();
	});
});
