import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartPersistence } from '../smart-persistence';
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

describe('SmartPersistence localStorage', () => {
	let persist: SmartPersistence;

	beforeEach(() => {
		Object.defineProperty(globalThis, 'localStorage', {
			value: mockLocalStorage(),
			writable: true,
			configurable: true,
		});
		persist = new SmartPersistence({ storage: 'localStorage' });
	});

	it('persists and restores data', async () => {
		const data: [string, Record<string, unknown>][] = [
			['User:1', { __typename: 'User', id: '1', name: 'Alice' }],
		];

		await persist.persist(data);
		const restored = await persist.restore();

		expect(restored).toBeDefined();
		expect(restored![0][0]).toBe('User:1');
	});

	it('returns null when nothing is stored', async () => {
		await expect(persist.restore()).resolves.toBeNull();
	});

	it('clears all persisted data', async () => {
		await persist.persist([['User:1', { __typename: 'User', id: '1' }]]);
		await persist.clear();
		await expect(persist.restore()).resolves.toBeNull();
	});

	it('handles multiple entities', async () => {
		const data: [string, Record<string, unknown>][] = [
			['User:1', { __typename: 'User', id: '1' }],
			['Note:42', { __typename: 'Note', id: '42', text: 'hello' }],
			['User:2', { __typename: 'User', id: '2', name: 'Bob' }],
		];

		await persist.persist(data);
		const restored = (await persist.restore())!;

		expect(restored.length).toBe(3);
		expect(restored.find(([k]) => k === 'Note:42')![1]).toEqual(
			expect.objectContaining({ text: 'hello' }),
		);
	});

	it('overwrites existing data on second persist', async () => {
		await persist.persist([['User:1', { __typename: 'User', id: '1', name: 'Old' }]]);
		await persist.persist([['User:1', { __typename: 'User', id: '1', name: 'New' }]]);

		const restored = (await persist.restore())!;
		expect((restored[0][1] as Record<string, unknown>).name).toBe('New');
	});
});

describe('SmartPersistence with custom EntityStorage', () => {
	it('uses provided EntityStorage', async () => {
		Object.defineProperty(globalThis, 'localStorage', {
			value: mockLocalStorage(),
			writable: true,
			configurable: true,
		});
		const storage = new LocalEntityStorage({ prefix: 'qntc:custom:' });
		const persist = new SmartPersistence({ storage });

		await persist.persist([['X:1', { __typename: 'X', id: '1' }]]);

		const restored = (await persist.restore())!;
		expect(restored[0][0]).toBe('X:1');
	});
});

describe('SmartPersistence with TTL', () => {
	it('restores only non-expired entities', async () => {
		const persist = new SmartPersistence({
			storage: 'localStorage',
			ttl: { Flash: 50 },
		});

		await persist.persist([['Flash:1', { __typename: 'Flash', id: '1', data: 'gone' }]]);

		await new Promise((r) => setTimeout(r, 60));

		const restored = await persist.restore();
		expect(restored).toBeNull();
	});
});
