import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CachePersistence } from '../cache-persist';

describe('CachePersistence', () => {
	let persist: CachePersistence;

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('persists and restores data', async () => {
		persist = new CachePersistence({ storage: 'memory' });
		const data: [string, Record<string, unknown>][] = [['User:1', { id: '1' }]];
		await persist.persist(data);
		const restored = await persist.restore();
		expect(restored).toEqual(data);
	});

	it('returns null when no data stored', async () => {
		persist = new CachePersistence({ storage: 'memory' });
		expect(await persist.restore()).toBeNull();
	});

	it('clears stored data', async () => {
		persist = new CachePersistence({ storage: 'memory' });
		await persist.persist([['User:1', { id: '1' }]]);
		await persist.clear();
		expect(await persist.restore()).toBeNull();
	});

	it('ignores version mismatch', async () => {
		persist = new CachePersistence({ storage: 'memory', version: '2' });
		await persist.persist([['User:1', { id: '1' }]]);

		const persist2 = new CachePersistence({ storage: 'memory', version: '3' });
		expect(await persist2.restore()).toBeNull();
	});

	it('expires data after maxAge', async () => {
		persist = new CachePersistence({ storage: 'memory', maxAge: 1000 });
		await persist.persist([['User:1', { id: '1' }]]);

		vi.advanceTimersByTime(1500);

		expect(await persist.restore()).toBeNull();
	});

	it('returns data within maxAge', async () => {
		persist = new CachePersistence({ storage: 'memory', maxAge: 5000 });
		const data: [string, Record<string, unknown>][] = [['User:1', { id: '1' }]];
		await persist.persist(data);

		vi.advanceTimersByTime(1000);

		expect(await persist.restore()).toEqual(data);
	});

	it('handles corrupted JSON gracefully', async () => {
		persist = new CachePersistence({ storage: 'memory' });
		// Manually inject corrupted data
		const storage = (persist as unknown as { storage: Storage }).storage;
		storage.setItem('__quenetiq_cache', '{corrupted');
		expect(await persist.restore()).toBeNull();
	});

	it('uses custom storage key', () => {
		persist = new CachePersistence({ storage: 'memory', storageKey: 'custom-key' });
		const storage = (persist as unknown as { storage: Storage }).storage;
		expect(storage.getItem('custom-key')).toBeNull();
	});

	it('persistThrottled calls persist after delay', async () => {
		persist = new CachePersistence({ storage: 'memory' });
		const data: [string, Record<string, unknown>][] = [['User:1', { id: '1' }]];
		persist.persistThrottled(data, 500);

		vi.advanceTimersByTime(499);
		expect(await persist.restore()).toBeNull();

		vi.advanceTimersByTime(1);
		expect(await persist.restore()).toEqual(data);
	});

	it('persistThrottled debounces multiple calls', async () => {
		persist = new CachePersistence({ storage: 'memory' });
		persist.persistThrottled([['User:1', { id: '1' }]], 500);
		persist.persistThrottled([['User:2', { id: '2' }]], 500);

		vi.advanceTimersByTime(500);
		expect(await persist.restore()).toEqual([['User:2', { id: '2' }]]);
	});

	it('falls back to memory when localStorage unavailable', () => {
		persist = new CachePersistence();
		const storage = (persist as unknown as { storage: Storage }).storage;
		expect(storage).toBeDefined();
		expect(typeof storage.getItem).toBe('function');
	});
});
