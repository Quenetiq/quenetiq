import { describe, it, expect, beforeEach } from 'vitest';
import { CachePersistence } from '@quenetiq/cache';

describe('CachePersistence', () => {
	let persist: CachePersistence;

	beforeEach(() => {
		persist = new CachePersistence({ storage: 'memory' });
	});

	const sampleData: [string, Record<string, unknown>][] = [
		['User:1', { __typename: 'User', id: '1', name: 'Alice' }],
		['User:2', { __typename: 'User', id: '2', name: 'Bob' }],
	];

	describe('persist / restore', () => {
		it('persists data and restores it', async () => {
			await persist.persist(sampleData);
			const restored = await persist.restore();
			expect(restored).toEqual(sampleData);
		});

		it('returns null when no data stored', async () => {
			expect(await persist.restore()).toBeNull();
		});

		it('returns null after clear', async () => {
			await persist.persist(sampleData);
			await persist.clear();
			expect(await persist.restore()).toBeNull();
		});
	});

	describe('version invalidation', () => {
		const store = new Map<string, string>();

		beforeEach(() => {
			store.clear();
			const ls = {
				getItem: (k: string) => store.get(k) ?? null,
				setItem: (k: string, v: string) => {
					store.set(k, v);
				},
				removeItem: (k: string) => {
					store.delete(k);
				},
				clear: () => store.clear(),
				length: 0,
				key: () => null,
			};
			Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true });
		});

		it('restores data when version matches', async () => {
			const v1a = new CachePersistence({ version: 'v1', storageKey: 'cache_test' });
			await v1a.persist(sampleData);

			const v1b = new CachePersistence({ version: 'v1', storageKey: 'cache_test' });
			expect(await v1b.restore()).toEqual(sampleData);
		});

		it('returns null and clears storage when version mismatches', async () => {
			const v1 = new CachePersistence({ version: 'v1', storageKey: 'cache_test' });
			await v1.persist(sampleData);

			const v2 = new CachePersistence({ version: 'v2', storageKey: 'cache_test' });
			expect(await v2.restore()).toBeNull();

			const v1again = new CachePersistence({ version: 'v1', storageKey: 'cache_test' });
			expect(await v1again.restore()).toBeNull();
		});

		it('handles undefined version correctly', async () => {
			const noVer = new CachePersistence({ storageKey: 'cache_test' });
			await noVer.persist(sampleData);

			const noVer2 = new CachePersistence({ storageKey: 'cache_test' });
			expect(await noVer2.restore()).toEqual(sampleData);
		});
	});

	describe('maxAge', () => {
		it('returns data within maxAge', async () => {
			const agePersist = new CachePersistence({ storage: 'memory', maxAge: 60_000, storageKey: 'age_test' });
			await agePersist.persist(sampleData);
			expect(await agePersist.restore()).toEqual(sampleData);
		});

		it('returns null and clears when data exceeds maxAge', async () => {
			const agePersist = new CachePersistence({ storage: 'memory', maxAge: -1, storageKey: 'age_test' });
			await agePersist.persist(sampleData);
			expect(await agePersist.restore()).toBeNull();
		});
	});

	describe('persistThrottled', () => {
		it('writes data after delay', async () => {
			persist.persistThrottled(sampleData, 10);
			expect(await persist.restore()).toBeNull();

			await new Promise((r) => setTimeout(r, 50));
			expect(await persist.restore()).toEqual(sampleData);
		});

		it('debounces multiple calls', async () => {
			persist.persistThrottled([['A:1', {}]], 10);
			persist.persistThrottled([['B:1', {}]], 10);

			await new Promise((r) => setTimeout(r, 50));
			const restored = await persist.restore();
			expect(restored).toEqual([['B:1', {}]]);
			expect(restored).toHaveLength(1);
		});

		it('cancels previous timer on new call', async () => {
			persist.persistThrottled([['A:1', { val: 'old' }]], 30);
			persist.persistThrottled([['A:1', { val: 'new' }]], 10);

			await new Promise((r) => setTimeout(r, 60));
			const restored = await persist.restore();
			expect(restored![0][1]).toEqual({ val: 'new' });
		});
	});

	describe('storageKey', () => {
		const store = new Map<string, string>();

		beforeEach(() => {
			store.clear();
			const ls = {
				getItem: (k: string) => store.get(k) ?? null,
				setItem: (k: string, v: string) => {
					store.set(k, v);
				},
				removeItem: (k: string) => {
					store.delete(k);
				},
				clear: () => store.clear(),
				length: 0,
				key: () => null,
			};
			Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true });
		});

		it('uses default key when not specified', async () => {
			const defaultPersist = new CachePersistence();
			await defaultPersist.persist(sampleData);
			expect(await defaultPersist.restore()).toEqual(sampleData);
		});

		it('uses custom key when specified', async () => {
			const custom = new CachePersistence({ storageKey: 'my_custom_key' });
			await custom.persist(sampleData);

			const sameKey = new CachePersistence({ storageKey: 'my_custom_key' });
			expect(await sameKey.restore()).toEqual(sampleData);

			const differentKey = new CachePersistence({ storageKey: 'different_key' });
			expect(await differentKey.restore()).toBeNull();
		});
	});

	describe('malformed data', () => {
		it('handles corrupted stored data gracefully', async () => {
			const memPersist = new CachePersistence({ storage: 'memory' });
			(
				memPersist as unknown as {
					storage: {
						getItem: (k: string) => string | null;
						setItem: (k: string, v: string) => void;
						removeItem: (k: string) => void;
					};
				}
			).storage.setItem('__quenetiq_cache', '{invalid json');
			expect(await memPersist.restore()).toBeNull();
		});

		it('handles empty stored data gracefully', async () => {
			const memPersist = new CachePersistence({ storage: 'memory' });
			(
				memPersist as unknown as {
					storage: {
						getItem: (k: string) => string | null;
						setItem: (k: string, v: string) => void;
						removeItem: (k: string) => void;
					};
				}
			).storage.setItem('__quenetiq_cache', '');
			expect(await memPersist.restore()).toBeNull();
		});
	});

	describe('localStorage fallback', () => {
		it('falls back to memory when localStorage is unavailable', async () => {
			const orig = globalThis.localStorage;
			Object.defineProperty(globalThis, 'localStorage', {
				configurable: true,
				get: () => undefined,
				set: () => {
					throw new Error('unavailable');
				},
			});

			const fallbackPersist = new CachePersistence({ storageKey: 'fallback_test' });
			await fallbackPersist.persist(sampleData);
			const restored = await fallbackPersist.restore();
			expect(restored).toEqual(sampleData);

			Object.defineProperty(globalThis, 'localStorage', {
				value: orig,
				configurable: true,
				writable: true,
			});
		});
	});
});
