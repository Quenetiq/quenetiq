import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalEntityStorage } from '../entity-storage';

function mockLocalStorage(): Storage {
	const store = new Map<string, string>();
	return {
		getItem: vi.fn((key: string) => store.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
		removeItem: vi.fn((key: string) => { store.delete(key); }),
		clear: vi.fn(() => { store.clear(); }),
		get length() { return store.size; },
		key: vi.fn((index: number) => [...store.keys()][index] ?? null),
	};
}

describe('LocalEntityStorage', () => {
	let storage: LocalEntityStorage;

	beforeEach(() => {
		Object.defineProperty(globalThis, 'localStorage', {
			value: mockLocalStorage(),
			writable: true,
			configurable: true,
		});
		storage = new LocalEntityStorage({ prefix: 'qntc:test:', ttl: { Note: 60000 } });
	});

	it('sets and gets a value', async () => {
		await storage.set('User:1', { __typename: 'User', id: '1', name: 'Alice' });
		const result = await storage.get('User:1');
		expect(result).toBeDefined();
		expect((result as { entity: Record<string, unknown> }).entity.name).toBe('Alice');
	});

	it('returns undefined for missing key', async () => {
		await expect(storage.get('User:999')).resolves.toBeUndefined();
	});

	it('deletes a value', async () => {
		await storage.set('User:1', { __typename: 'User', id: '1' });
		await storage.delete('User:1');
		await expect(storage.get('User:1')).resolves.toBeUndefined();
	});

	it('returns all keys', async () => {
		await storage.set('User:1', { __typename: 'User', id: '1' });
		await storage.set('Note:42', { __typename: 'Note', id: '42' });
		const keys = await storage.keys();
		expect(keys).toContain('User:1');
		expect(keys).toContain('Note:42');
	});

	it('returns count', async () => {
		await storage.set('User:1', { __typename: 'User', id: '1' });
		await storage.set('Note:42', { __typename: 'Note', id: '42' });
		await expect(storage.count()).resolves.toBe(2);
	});

	it('clears all values', async () => {
		await storage.set('User:1', { __typename: 'User', id: '1' });
		await storage.clear();
		await expect(storage.count()).resolves.toBe(0);
	});

	it('does not return expired entities', async () => {
		const ttlStorage = new LocalEntityStorage({ prefix: 'qntc:exp:', ttl: { Note: 50 } });
		await ttlStorage.set('Note:1', { __typename: 'Note', id: '1', text: 'fresh' });

		await expect(ttlStorage.get('Note:1')).resolves.toBeDefined();

		await new Promise((r) => setTimeout(r, 60));

		await expect(ttlStorage.get('Note:1')).resolves.toBeUndefined();
		expect(localStorage.getItem('qntc:exp:__meta:Note:1')).toBeNull();
	});

	it('evicts LRU entries', async () => {
		const small = new LocalEntityStorage({ prefix: 'qntc:lru:' });

		await small.set('User:0', { __typename: 'User', id: '0' });
		await small.set('User:1', { __typename: 'User', id: '1' });
		await small.set('User:2', { __typename: 'User', id: '2' });

		const evicted = await small.evictLru(2);
		expect(evicted.length).toBe(2);
		const keys = await small.keys();
		expect(keys.length).toBe(1);
	});

	it('stores and reads metadata', async () => {
		await storage.set('Note:1', { __typename: 'Note', id: '1', text: 'hello' });
		const meta = localStorage.getItem('qntc:test:__meta:Note:1');
		expect(meta).not.toBeNull();
		const parsed = JSON.parse(meta!);
		expect(parsed.createdAt).toBeTypeOf('number');
		expect(parsed.updatedAt).toBeTypeOf('number');
	});

	it('handles empty key gracefully', async () => {
		await expect(storage.get('')).resolves.toBeUndefined();
		await expect(storage.delete('')).resolves.toBeUndefined();
	});
});
