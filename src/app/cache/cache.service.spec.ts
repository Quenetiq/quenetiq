import { describe, it, expect } from 'vitest';
import { CacheService } from '@quenetiq/cache/angular';
import { CachePersistence } from '@quenetiq/cache';

describe('CacheService', () => {
	const userEntity = { __typename: 'User', id: '1', name: 'Alice', age: 30 };

	function createService(persistSvc?: CachePersistence | null): CacheService {
		const ngPersist = persistSvc
			? ({
				persist: (data: [string, Record<string, unknown>][]) => persistSvc.persist(data),
				restore: () => persistSvc.restore(),
				persistThrottled: () => {},
				clear: () => persistSvc.clear(),
			} as never)
			: undefined;
		return new CacheService(ngPersist);
	}

	describe('delegation to NormalizedCache', () => {
		it('write stores entity, query retrieves it', () => {
			const service = createService();
			service.write(userEntity);
			expect(service.query('User', '1')).toEqual(userEntity);
		});

		it('query returns undefined for missing entity', () => {
			const service = createService();
			expect(service.query('User', 'ghost')).toBeUndefined();
		});

		it('merge updates fields on existing entity', () => {
			const service = createService();
			service.write(userEntity);
			service.merge({ __typename: 'User', id: '1', age: 31 });
			const result = service.query('User', '1') as Record<string, unknown>;
			expect(result['name']).toBe('Alice');
			expect(result['age']).toBe(31);
		});

		it('evict removes entity', () => {
			const service = createService();
			service.write(userEntity);
			service.evict('User', '1');
			expect(service.query('User', '1')).toBeUndefined();
		});
	});

	describe('optimistic updates', () => {
		it('applyOptimistic modifies entity optimistically', () => {
			const service = createService();
			service.write(userEntity);
			service.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'Optimistic' });
				},
				rollback: () => {},
			});
			expect((service.query('User', '1') as Record<string, unknown>)['name']).toBe('Optimistic');
		});

		it('rollbackOptimistic restores state', () => {
			const service = createService();
			service.write(userEntity);
			service.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'Optimistic' });
				},
				rollback: () => {},
			});
			service.rollbackOptimistic('opt-1');
			expect((service.query('User', '1') as Record<string, unknown>)['name']).toBe('Alice');
		});

		it('commitOptimistic keeps changes', () => {
			const service = createService();
			service.write(userEntity);
			service.applyOptimistic({
				id: 'opt-1',
				apply: (entities) => {
					const e = entities.get('User:1')!;
					entities.set('User:1', { ...e, name: 'Committed' });
				},
				rollback: () => {},
			});
			service.commitOptimistic('opt-1');
			expect((service.query('User', '1') as Record<string, unknown>)['name']).toBe('Committed');
		});
	});

	describe('local state', () => {
		it('writeLocal stores value, readLocal retrieves it', () => {
			const service = createService();
			service.writeLocal('theme', 'dark');
			expect(service.readLocal('theme')).toBe('dark');
		});

		it('readLocal returns undefined for missing key', () => {
			const service = createService();
			expect(service.readLocal('missing')).toBeUndefined();
		});

		it('writeLocal overwrites existing value', () => {
			const service = createService();
			service.writeLocal('count', 1);
			service.writeLocal('count', 2);
			expect(service.readLocal('count')).toBe(2);
		});

		it('watchLocal emits current value on subscribe', () => {
			const service = createService();
			service.writeLocal('key', 'initial');
			const values: unknown[] = [];
			service.watchLocal('key').subscribe((v: unknown) => values.push(v));
			expect(values).toContain('initial');
		});

		it('watchLocal emits updates after writeLocal', () => {
			const service = createService();
			const values: unknown[] = [];
			service.watchLocal('key').subscribe((v: unknown) => values.push(v));
			service.writeLocal('key', 'v1');
			service.writeLocal('key', 'v2');
			expect(values).toContain('v1');
			expect(values).toContain('v2');
		});

		it('clearLocalState removes all local entries', () => {
			const service = createService();
			service.writeLocal('a', 1);
			service.writeLocal('b', 2);
			service.clearLocalState();
			expect(service.readLocal('a')).toBeUndefined();
			expect(service.readLocal('b')).toBeUndefined();
		});

		it('unsubscribing stops receiving updates', () => {
			const service = createService();
			const values: unknown[] = [];
			const sub = service.watchLocal('key').subscribe((v: unknown) => values.push(v));
			service.writeLocal('key', 'first');
			sub.unsubscribe();
			service.writeLocal('key', 'second');
			expect(values).not.toContain('second');
		});
	});

	describe('writeLocalWithTypes / clearLocalStateByTypes', () => {
		it('scoped local state is cleared by type', () => {
			const service = createService();
			service.writeLocalWithTypes('selected', '42', new Set(['Post']));
			service.clearLocalStateByTypes(['Post']);
			expect(service.readLocal('selected')).toBeUndefined();
		});

		it('scoped local state survives clear of unrelated types', () => {
			const service = createService();
			service.writeLocalWithTypes('selected', '42', new Set(['Post']));
			service.clearLocalStateByTypes(['User']);
			expect(service.readLocal('selected')).toBe('42');
		});
	});

	describe('serialize / deserialize', () => {
		it('serialize produces JSON string with entities and local state', () => {
			const service = createService();
			service.write(userEntity);
			service.writeLocal('theme', 'dark');
			const json = service.serialize();
			const parsed = JSON.parse(json);
			expect(parsed.entities).toBeDefined();
			expect(parsed.localState).toBeDefined();
		});

		it('deserialize restores entities and local state', () => {
			const service = createService();
			service.write(userEntity);
			service.writeLocal('theme', 'dark');
			const json = service.serialize();

			const service2 = createService();
			service2.deserialize(json);

			expect(service2.query('User', '1')).toEqual(userEntity);
			expect(service2.readLocal('theme')).toBe('dark');
		});
	});

	describe('collectGarbage', () => {
		it('delegates to gc.sweep and returns count', () => {
			const service = createService();
			service.write(userEntity);
			const count = service.collectGarbage();
			expect(typeof count).toBe('number');
		});
	});

	describe('persist', () => {
		it('does not throw when persistence service is not configured', () => {
			const service = createService();
			expect(() => service.persist()).not.toThrow();
		});

		it('persists entities when persistence is configured', async () => {
			const persist = new CachePersistence({ storage: 'memory' });
			const service = new CacheService(persist as never);
			service.write(userEntity);
			await service.persist();

			const restored = await persist.restore();
			expect(restored).not.toBeNull();
			expect(restored!.some(([k]: [string, unknown]) => k === 'User:1')).toBe(true);
		});
	});

	describe('setTypePolicies', () => {
		it('updates type policies post-construction', () => {
			const service = createService();
			service.setTypePolicies({ Post: { keyFields: ['slug'] } });
			service.write({ __typename: 'Post', slug: 'hello', title: 'World' } as never);
			const found = service.query('Post', 'hello') as Record<string, unknown> | undefined;
			expect(found?.['title']).toBe('World');
		});
	});

	describe('constructor with persistence', () => {
		it('restores persisted entities on construction', async () => {
			const persist = new CachePersistence({ storage: 'memory' });

			const persistService = createService(persist);
			persistService.write(userEntity);
			await persistService.persist();

			const restoredService = new CacheService(persist as never);
			const found = restoredService.query('User', '1') as Record<string, unknown> | undefined;
			expect(found?.['name']).toBe('Alice');
		});
	});
});
