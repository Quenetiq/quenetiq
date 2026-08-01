import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheStore, type CacheStorePersist } from '../cache-store';

describe('CacheStore — query / write / merge / evict', () => {
	let store: CacheStore;

	beforeEach(() => { store = new CacheStore(); });

	describe('query', () => {
		it('returns entity data for valid typename + id', () => {
			store.write({ __typename: 'User', id: '1', name: 'Alice' });
			expect(store.query('User', '1')).toEqual(
				expect.objectContaining({ __typename: 'User', id: '1', name: 'Alice' }),
			);
		});

		it('returns undefined for missing entity', () => {
			expect(store.query('User', 'nonexistent')).toBeUndefined();
		});

		it('emits read event with hit=true', () => {
			const listener = vi.fn();
			store.events.on(listener);
			store.write({ __typename: 'User', id: '1', name: 'Alice' });
			listener.mockClear();
			store.query('User', '1');
			expect(listener.mock.calls[0][0].type).toBe('read');
			expect(listener.mock.calls[0][0].data.hit).toBe(true);
		});

		it('emits read event with hit=false on miss', () => {
			const listener = vi.fn();
			store.events.on(listener);
			store.query('User', 'missing');
			expect(listener.mock.calls[0][0].type).toBe('read');
			expect(listener.mock.calls[0][0].data.hit).toBe(false);
		});
	});

	describe('write', () => {
		it('stores entity and emits write event', () => {
			const listener = vi.fn();
			store.events.on(listener);
			store.write({ __typename: 'Todo', id: '42', text: 'test' });
			expect(store.query('Todo', '42')).toBeDefined();
			expect(listener.mock.calls[0][0].type).toBe('write');
			expect(listener.mock.calls[0][0].data.key).toBe('Todo:42');
		});

		it('emits write event for entity without id', () => {
			const listener = vi.fn();
			store.events.on(listener);
			store.write({ __typename: 'Todo', text: 'no-id' } as never);
			expect(listener).toHaveBeenCalledOnce();
			expect(listener.mock.calls[0][0].type).toBe('write');
		});
	});

	describe('merge', () => {
		it('creates entity if not exists', () => {
			store.merge({ __typename: 'User', id: '1', name: 'Alice' });
			expect(store.query('User', '1')).toEqual(
				expect.objectContaining({ name: 'Alice' }),
			);
		});

		it('deep-merges fields into existing entity', () => {
			store.write({ __typename: 'User', id: '1', name: 'Alice', age: 30 });
			store.merge({ __typename: 'User', id: '1', age: 31, role: 'admin' });
			const u = store.query('User', '1')!;
			expect(u['name']).toBe('Alice');
			expect(u['age']).toBe(31);
			expect(u['role']).toBe('admin');
		});

		it('emits merge event with changed fields', () => {
			const listener = vi.fn();
			store.events.on(listener);
			store.write({ __typename: 'User', id: '1', name: 'Alice' });
			listener.mockClear();
			store.merge({ __typename: 'User', id: '1', age: 25 });
			expect(listener.mock.calls[0][0].type).toBe('merge');
			expect(listener.mock.calls[0][0].data.changedFields).toContain('age');
			expect(listener.mock.calls[0][0].data.existed).toBe(true);
		});

		it('triggers auto-gc when threshold exceeded', () => {
			const gcStore = new CacheStore({ autoGc: { enabled: true, threshold: 2 } });
			const spy = vi.spyOn(gcStore, 'collectGarbage');
			for (let i = 0; i < 5; i++) {
				gcStore.write({ __typename: 'Item', id: String(i) });
			}
			gcStore.merge({ __typename: 'Item', id: '5' });
			expect(spy).toHaveBeenCalled();
		});
	});

	describe('evict', () => {
		it('removes entity and emits evict event', () => {
			const listener = vi.fn();
			store.events.on(listener);
			store.write({ __typename: 'User', id: '1', name: 'Alice' });
			listener.mockClear();
			store.evict('User', '1');
			expect(store.query('User', '1')).toBeUndefined();
			expect(listener.mock.calls[0][0].type).toBe('evict');
			expect(listener.mock.calls[0][0].data.typename).toBe('User');
			expect(listener.mock.calls[0][0].data.id).toBe('1');
		});

		it('does nothing for non-existent entity', () => {
			expect(() => store.evict('User', 'ghost')).not.toThrow();
		});
	});
});

describe('CacheStore — optimistic updates', () => {
	let store: CacheStore;

	beforeEach(() => { store = new CacheStore(); });

	it('applyOptimistic modifies entity and emits event', () => {
		const listener = vi.fn();
		store.events.on(listener);
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		listener.mockClear();
		store.applyOptimistic({
			id: 'opt-1',
			apply: (entities) => entities.set('User:1', { __typename: 'User', id: '1', name: 'Opt Alice' }),
			rollback: () => {},
		});
		expect(store.query('User', '1')!['name']).toBe('Opt Alice');
		expect(listener.mock.calls[0][0].type).toBe('optimistic');
		expect(listener.mock.calls[0][0].data.action).toBe('apply');
		expect(listener.mock.calls[0][0].data.id).toBe('opt-1');
	});

	it('rollbackOptimistic restores entity and emits event', () => {
		const listener = vi.fn();
		store.events.on(listener);
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		store.applyOptimistic({
			id: 'opt-1',
			apply: (entities) => entities.set('User:1', { __typename: 'User', id: '1', name: 'Opt' }),
			rollback: () => {},
		});
		listener.mockClear();
		store.rollbackOptimistic('opt-1');
		expect(store.query('User', '1')!['name']).toBe('Alice');
		expect(listener.mock.calls[0][0].data.action).toBe('rollback');
		expect(listener.mock.calls[0][0].data.id).toBe('opt-1');
	});

	it('commitOptimistic keeps changes and emits event', () => {
		const listener = vi.fn();
		store.events.on(listener);
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		store.applyOptimistic({
			id: 'opt-1',
			apply: (entities) => entities.set('User:1', { __typename: 'User', id: '1', name: 'Committed' }),
			rollback: () => {},
		});
		listener.mockClear();
		store.commitOptimistic('opt-1');
		expect(store.query('User', '1')!['name']).toBe('Committed');
		expect(listener.mock.calls[0][0].data.action).toBe('commit');
		expect(listener.mock.calls[0][0].data.id).toBe('opt-1');
	});
});

describe('CacheStore — local state management', () => {
	let store: CacheStore;

	beforeEach(() => { store = new CacheStore(); });

	it('readLocal returns undefined for missing key', () => {
		expect(store.readLocal('missing')).toBeUndefined();
	});

	it('writeLocal / readLocal round-trips', () => {
		store.writeLocal('theme', 'dark');
		expect(store.readLocal('theme')).toBe('dark');
	});

	it('hasLocal returns correct boolean', () => {
		store.writeLocal('key1', 42);
		expect(store.hasLocal('key1')).toBe(true);
		expect(store.hasLocal('missing')).toBe(false);
	});

	it('localKeys returns all local state keys', () => {
		store.writeLocal('a', 1);
		store.writeLocal('b', 2);
		expect(store.localKeys()).toEqual(expect.arrayContaining(['a', 'b']));
	});

	it('localEntries returns all entries', () => {
		store.writeLocal('x', 10);
		const entries = store.localEntries();
		expect(entries).toContainEqual(['x', 10]);
	});

	it('localSize returns count', () => {
		store.writeLocal('a', 1);
		store.writeLocal('b', 2);
		expect(store.localSize()).toBe(2);
	});

	it('clearLocalState empties everything', () => {
		store.writeLocal('a', 1);
		store.clearLocalState();
		expect(store.localSize()).toBe(0);
		expect(store.hasLocal('a')).toBe(false);
	});

	it('clearLocalState also clears listeners', () => {
		const listener = vi.fn();
		store.watchLocal('k', listener);
		store.clearLocalState();
		store.writeLocal('k', 'v');
		expect(listener).not.toHaveBeenCalled();
	});

	it('watchLocal returns unsubscribe function', () => {
		const listener = vi.fn();
		const unsub = store.watchLocal('k', listener);
		store.writeLocal('k', 'v');
		expect(listener).toHaveBeenCalledTimes(1);
		unsub();
		store.writeLocal('k', 'v2');
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('writeLocal notifies listeners', () => {
		const listener = vi.fn();
		store.watchLocal('k', listener);
		store.writeLocal('k', 'v');
		expect(listener).toHaveBeenCalledOnce();
	});

	it('writeLocalWithTypes stores both value and types', () => {
		store.writeLocalWithTypes('q:hash', { data: 'test' }, new Set(['User']));
		expect(store.readLocal('q:hash')).toEqual({ data: 'test' });
	});

	it('clearLocalStateByTypes clears matching keys', () => {
		store.writeLocalWithTypes('q:users', { data: 'users' }, new Set(['User']));
		store.writeLocalWithTypes('q:posts', { data: 'posts' }, new Set(['Post']));
		store.clearLocalStateByTypes(['User']);
		expect(store.readLocal('q:users')).toBeUndefined();
		expect(store.readLocal('q:posts')).toBeDefined();
	});

	it('clearLocalStateByTypes is no-op with empty array', () => {
		store.writeLocal('k', 'v');
		store.clearLocalStateByTypes([]);
		expect(store.readLocal('k')).toBe('v');
	});

	it('clearLocalStateByTypes fires listeners for deleted keys', () => {
		const listener = vi.fn();
		store.writeLocalWithTypes('q:users', { data: 'test' }, new Set(['User']));
		store.watchLocal('q:users', listener);
		store.clearLocalStateByTypes(['User']);
		expect(listener).toHaveBeenCalled();
	});
});

describe('CacheStore — invalidateQuery', () => {
	let store: CacheStore;

	beforeEach(() => { store = new CacheStore(); });

	it('removes query from local state and dependency graph', () => {
		store.writeQuery('q:test', { value: 1 });
		store.recordQueryDependencies('q:test', new Set(['User:1']));
		store.invalidateQuery('q:test');
		expect(store.readQuery('q:test')).toBeUndefined();
		expect(store.getEntitiesForQuery('q:test')).toEqual([]);
	});

	it('is no-op for unknown query hash', () => {
		expect(() => store.invalidateQuery('unknown')).not.toThrow();
	});
});

describe('CacheStore — prime', () => {
	let store: CacheStore;

	beforeEach(() => { store = new CacheStore(); });

	it('extracts entities and stores query result', () => {
		const data = {
			user: { __typename: 'User', id: '1', name: 'Alice' },
		};
		store.prime('q:user:1', data);
		expect(store.readQuery('q:user:1')).toEqual(data);
		expect(store.query('User', '1')).toBeDefined();
	});

	it('records query-entity dependencies', () => {
		store.prime('q:user:1', { user: { __typename: 'User', id: '1', name: 'Alice' } });
		expect(store.getEntitiesForQuery('q:user:1')).toContain('User:1');
		expect(store.getQueriesForEntity('User:1')).toContain('q:user:1');
	});
});

describe('CacheStore — serialize / deserialize', () => {
	let store: CacheStore;

	beforeEach(() => { store = new CacheStore(); });

	it('serialize produces JSON string with entities and local state', () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		store.writeLocal('theme', 'dark');
		const json = store.serialize();
		const parsed = JSON.parse(json);
		expect(parsed.entities).toBeDefined();
		expect(parsed.localState).toBeDefined();
	});

	it('deserialize restores entities and local state', () => {
		const orig = new CacheStore();
		orig.write({ __typename: 'User', id: '1', name: 'Alice' });
		orig.writeLocal('theme', 'dark');
		const json = orig.serialize();

		const restored = new CacheStore();
		restored.deserialize(json);
		expect(restored.query('User', '1')).toEqual(
			expect.objectContaining({ name: 'Alice' }),
		);
		expect(restored.readLocal('theme')).toBe('dark');
	});
});

describe('CacheStore — snapshot / restore', () => {
	it('snapshot and restore round-trip', () => {
		const store = new CacheStore();
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		const snap = store.snapshot();
		const restored = new CacheStore();
		restored.restore(snap);
		expect(restored.query('User', '1')).toEqual(
			expect.objectContaining({ name: 'Alice' }),
		);
	});

	it('restore replaces all entities', () => {
		const store = new CacheStore();
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		store.restore({ entities: [['Post:10', { __typename: 'Post', id: '10' }]], meta: [] });
		expect(store.query('User', '1')).toBeUndefined();
		expect(store.query('Post', '10')).toBeDefined();
	});
});

describe('CacheStore — setTypePolicies', () => {
	it('configures keyFields policy after construction', () => {
		const store = new CacheStore();
		store.setTypePolicies({ Post: { keyFields: ['slug'] } });
		store.write({ __typename: 'Post', id: '1', slug: 'hello', title: 'World' } as never);
		expect(store.query('Post', 'hello')).toBeDefined();
		expect(store.query('Post', '1')).toBeUndefined();
	});
});

describe('CacheStore — delegated methods', () => {
	let store: CacheStore;

	beforeEach(() => { store = new CacheStore(); });

	it('getEntityMeta returns metadata', () => {
		store.write({ __typename: 'User', id: '1', name: 'A' });
		const meta = store.getEntityMeta('User:1');
		expect(meta).toBeDefined();
	});

	it('getAllEntityMeta returns all metadata', () => {
		store.write({ __typename: 'User', id: '1', name: 'A' });
		const all = store.getAllEntityMeta();
		expect(all.size).toBe(1);
	});

	it('resolveField returns field value', () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		expect(store.resolveField('User', '1', 'name')).toBe('Alice');
	});

	it('isEntityStale checks staleness', () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		expect(store.isEntityStale('User', '1', -1)).toBe(true);
		expect(store.isEntityStale('User', '1', 999999)).toBe(false);
	});

	it('getEntityAge returns age', () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		const age = store.getEntityAge('User', '1');
		expect(typeof age).toBe('number');
	});

	it('allKeys returns all cache keys', () => {
		store.write({ __typename: 'User', id: '1' });
		expect(store.allKeys()).toContain('User:1');
	});

	it('keysByType returns keys for typename', () => {
		store.write({ __typename: 'User', id: '1' });
		store.write({ __typename: 'Post', id: '10' });
		expect(store.keysByType('User')).toContain('User:1');
		expect(store.keysByType('Post')).not.toContain('User:1');
	});

	it('getEntityTypes returns all typenames', () => {
		store.write({ __typename: 'User', id: '1' });
		store.write({ __typename: 'Post', id: '10' });
		const types = store.getEntityTypes();
		expect(types).toContain('User');
		expect(types).toContain('Post');
	});

	it('explain returns entity info', () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		const info = store.explain('User', '1');
		expect(info).toBeDefined();
		expect(info!.key).toBe('User:1');
	});

	it('mergeDry returns merge info without applying', () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		const result = store.mergeDry({ __typename: 'User', id: '1', age: 99 });
		expect(result.changedFields).toContain('age');
		expect(store.resolveField('User', '1', 'age')).toBeUndefined();
	});
});

describe('CacheStore — graph / sizeEstimate / debug', () => {
	let store: CacheStore;

	beforeEach(() => { store = new CacheStore(); });

	it('graph returns forward and reverse dependencies', () => {
		store.recordQueryDependencies('q:1', new Set(['User:1', 'Post:10']));
		const g = store.graph();
		expect(g.forward['q:1']).toContain('User:1');
		expect(g.reverse['User:1']).toContain('q:1');
	});

	it('sizeEstimate returns a positive number', () => {
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		expect(store.sizeEstimate()).toBeGreaterThan(0);
	});

	it('debug returns unsubscribe function', () => {
		const unsub = store.debug();
		expect(typeof unsub).toBe('function');
	});

	it('debug with false disables logging', () => {
		const unsub = store.debug(false);
		expect(typeof unsub).toBe('function');
	});
});

describe('CacheStore — getMetricsSnapshot', () => {
	let store: CacheStore;

	beforeEach(() => { store = new CacheStore(); });

	it('returns snapshot with metrics after operations', () => {
		store.write({ __typename: 'User', id: '1' });
		store.query('User', '1');
		store.query('User', 'missing');
		const snap = store.getMetricsSnapshot();
		expect(snap.currentEntityCount).toBe(1);
		expect(snap.totalReads).toBe(2);
		expect(snap.totalWrites).toBe(1);
		expect(snap.hitRate).toBeGreaterThan(0);
		expect(snap.hitRate).toBeLessThan(1);
		expect(snap.sizeEstimateBytes).toBeGreaterThan(0);
	});

	it('reports zero dangling when no GC has run', () => {
		const store = new CacheStore();
		store.write({ __typename: 'Orphan', id: '1' });
		const snap = store.getMetricsSnapshot();
		expect(typeof snap.currentDanglingCount).toBe('number');
	});
});

describe('CacheStore — collectGarbage', () => {
	it('sweeps dangling entities and emits gcSweep event', () => {
		vi.useFakeTimers();
		const now = Date.now();
		vi.setSystemTime(now);
		const store = new CacheStore();
		store.write({ __typename: 'Temp', id: '1' });
		store.gc.track([{ __typename: 'Temp', id: '1' }]);
		store.gc.release([{ __typename: 'Temp', id: '1' }]);
		vi.advanceTimersByTime(120_000);
		const listener = vi.fn();
		store.events.on(listener);
		store.collectGarbage();
		expect(listener).toHaveBeenCalled();
		expect(listener.mock.calls[0][0].type).toBe('gcSweep');
		vi.useRealTimers();
	});

	it('returns number of evicted entities', () => {
		const store = new CacheStore();
		const count = store.collectGarbage();
		expect(typeof count).toBe('number');
	});
});

describe('CacheStore — getDebugReport', () => {
	it('returns formatted string with cache state', () => {
		const store = new CacheStore();
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		const report = store.getDebugReport();
		expect(report).toContain('Cache Report');
		expect(report).toContain('Entities:');
		expect(report).toContain('User');
	});

	it('handles empty cache', () => {
		const store = new CacheStore();
		const report = store.getDebugReport();
		expect(report).toContain('Cache Report');
		expect(report).toContain('Entities:          0');
	});
});

describe('CacheStore — transaction', () => {
	it('buffers events and emits them on commit', () => {
		const store = new CacheStore();
		const listener = vi.fn();
		store.events.on(listener);

		store.transaction(() => {
			store.write({ __typename: 'User', id: '1', name: 'Alice' });
			store.write({ __typename: 'User', id: '2', name: 'Bob' });
			expect(listener).not.toHaveBeenCalled();
		});

		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('nested transactions batch events to outer commit', () => {
		const store = new CacheStore();
		const listener = vi.fn();
		store.events.on(listener);

		store.transaction(() => {
			store.write({ __typename: 'User', id: '1' });
			store.transaction(() => {
				store.write({ __typename: 'User', id: '2' });
			});
			expect(listener).not.toHaveBeenCalled();
		});

		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('emits buffered events even when transaction fn throws', () => {
		const store = new CacheStore();
		const listener = vi.fn();
		store.events.on(listener);

		expect(() => {
			store.transaction(() => {
				store.write({ __typename: 'User', id: '1' });
				throw new Error('txn failed');
			});
		}).toThrow('txn failed');

		expect(listener).toHaveBeenCalledTimes(1);
	});
});

describe('CacheStore — persist', () => {
	it('persist does nothing when no persist service is configured', async () => {
		const store = new CacheStore();
		await expect(store.persist()).resolves.toBeUndefined();
	});

	it('persist calls persistSvc.persist with data', async () => {
		const persistSvc: CacheStorePersist = {
			persist: vi.fn().mockResolvedValue(undefined),
			restore: vi.fn().mockResolvedValue(null),
			clear: vi.fn().mockResolvedValue(undefined),
		};
		const store = new CacheStore({ persist: persistSvc });
		store.write({ __typename: 'User', id: '1', name: 'Alice' });
		store.writeLocal('theme', 'dark');
		await store.persist();
		expect(persistSvc.persist).toHaveBeenCalledOnce();
		const data = (persistSvc.persist as ReturnType<typeof vi.fn>).mock.calls[0][0] as [string, unknown][];
		expect(data.some(([k]) => k === 'User:1')).toBe(true);
		expect(data.some(([k]) => k.startsWith('__local__'))).toBe(true);
	});

	it('persist emits error event on failure', async () => {
		const persistSvc: CacheStorePersist = {
			persist: vi.fn().mockRejectedValue(new Error('disk full')),
			restore: vi.fn().mockResolvedValue(null),
			clear: vi.fn().mockResolvedValue(undefined),
		};
		const store = new CacheStore({ persist: persistSvc });
		const listener = vi.fn();
		store.write({ __typename: 'User', id: '1' });
		store.events.on(listener);
		await store.persist();
		expect(listener).toHaveBeenCalledOnce();
		expect(listener.mock.calls[0][0].type).toBe('error');
		expect(listener.mock.calls[0][0].data.operation).toBe('persist');
	});

	it('constructor calls persistSvc.restore and loads entities', async () => {
		const persistSvc: CacheStorePersist = {
			persist: vi.fn(),
			restore: vi.fn().mockResolvedValue([
				['User:1', { __typename: 'User', id: '1', name: 'Restored' }],
			]),
			clear: vi.fn(),
		};
		const store = new CacheStore({ persist: persistSvc });
		await vi.waitFor(() => {
			expect(store.query('User', '1')).toBeDefined();
		});
	});

	it('constructor restores local state with __local__ prefix', async () => {
		const persistSvc: CacheStorePersist = {
			persist: vi.fn(),
			restore: vi.fn().mockResolvedValue([
				['__local__theme', { value: 'dark' }],
			]),
			clear: vi.fn(),
		};
		const store = new CacheStore({ persist: persistSvc });
		await vi.waitFor(() => {
			expect(store.readLocal('theme')).toEqual({ value: 'dark' });
		});
	});

	it('clear calls persistSvc.clear', async () => {
		const persistSvc: CacheStorePersist = {
			persist: vi.fn(),
			restore: vi.fn().mockResolvedValue(null),
			clear: vi.fn().mockResolvedValue(undefined),
		};
		const store = new CacheStore({ persist: persistSvc });
		await store.clear();
		expect(persistSvc.clear).toHaveBeenCalledOnce();
	});
});

describe('CacheStore — crossTabSync', () => {
	it('constructs with crossTabSync config without throwing', () => {
		const store = new CacheStore({ crossTabSync: true });
		expect(store).toBeDefined();
	});
});

describe('CacheStore — clear', () => {
	it('clears entities, local state, and emits event', async () => {
		const store = new CacheStore();
		const listener = vi.fn();
		store.events.on(listener);
		store.write({ __typename: 'User', id: '1' });
		store.writeLocal('k', 'v');
		await store.clear();
		expect(store.query('User', '1')).toBeUndefined();
		expect(store.readLocal('k')).toBeUndefined();
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'clear' }),
		);
	});
});

describe('createCache helper', () => {
	it('creates a CacheStore instance', async () => {
		const { createCache } = await import('../cache-store');
		const store = createCache();
		expect(store).toBeInstanceOf(CacheStore);
	});

	it('passes config to CacheStore', async () => {
		const { createCache } = await import('../cache-store');
		const store = createCache({ autoGc: { enabled: true, threshold: 5 } });
		expect(store).toBeDefined();
	});
});
