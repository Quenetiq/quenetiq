import { describe, it, expect, beforeEach } from 'vitest';
import { CacheStore } from '@quenetiq/cache';
import { lastValueFromCache } from '../last-value-from-cache';

describe('lastValueFromCache', () => {
	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	it('returns cached data', async () => {
		store.writeQuery('q:test', { value: 'hello' });
		const result = await lastValueFromCache(store, 'q:test');
		expect(result).toEqual({ value: 'hello' });
	});

	it('returns null for missing query', async () => {
		const result = await lastValueFromCache(store, 'q:missing');
		expect(result).toBeNull();
	});
});
