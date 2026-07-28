import { describe, it, expect } from 'vitest';
import { CacheStore } from '../cache-store';

describe('CacheStore.normalizeResult', () => {
	it('extracts and merges entities from a flat result', () => {
		const store = new CacheStore();
		const data = {
			user: { __typename: 'User', id: '1', name: 'Alice' },
		};
		const { entityKeys, typeNames } = store.normalizeResult(data);

		expect(entityKeys).toEqual(new Set(['User:1']));
		expect(typeNames).toEqual(new Set(['User']));
		expect(store.query('User', '1')).toEqual(
			expect.objectContaining({ __typename: 'User', id: '1', name: 'Alice' }),
		);
	});

	it('extracts entities from nested arrays', () => {
		const store = new CacheStore();
		const data = {
			posts: [
				{ __typename: 'Post', id: '10', title: 'Hello' },
				{ __typename: 'Post', id: '20', title: 'World' },
			],
		};
		const { entityKeys, typeNames } = store.normalizeResult(data);

		expect(entityKeys).toEqual(new Set(['Post:10', 'Post:20']));
		expect(typeNames).toEqual(new Set(['Post']));
		expect(store.query('Post', '10')).toBeDefined();
		expect(store.query('Post', '20')).toBeDefined();
	});

	it('handles mixed types in a result', () => {
		const store = new CacheStore();
		const data = {
			user: { __typename: 'User', id: '1', name: 'Alice' },
			posts: [
				{ __typename: 'Post', id: '10', title: 'Hello', author: { __typename: 'User', id: '1' } },
			],
		};
		const { entityKeys, typeNames } = store.normalizeResult(data);

		expect(typeNames).toEqual(new Set(['User', 'Post']));
		expect(entityKeys.has('User:1')).toBe(true);
		expect(entityKeys.has('Post:10')).toBe(true);
	});

	it('returns empty sets for empty data', () => {
		const store = new CacheStore();
		expect(store.normalizeResult(null)).toEqual({ entityKeys: new Set(), typeNames: new Set() });
		expect(store.normalizeResult(undefined)).toEqual({ entityKeys: new Set(), typeNames: new Set() });
		expect(store.normalizeResult('string')).toEqual({ entityKeys: new Set(), typeNames: new Set() });
	});

	it('ignores objects without __typename', () => {
		const store = new CacheStore();
		const data = { foo: 'bar', nested: { key: 'value' } };
		const { entityKeys, typeNames } = store.normalizeResult(data);

		expect(entityKeys.size).toBe(0);
		expect(typeNames.size).toBe(0);
	});

	it('ignores entities without id', () => {
		const store = new CacheStore();
		const data = { __typename: 'User', name: 'NoId' };
		const { entityKeys, typeNames } = store.normalizeResult(data);

		expect(entityKeys.size).toBe(0);
		expect(typeNames).toEqual(new Set(['User']));
	});

	it('handles numeric ids', () => {
		const store = new CacheStore();
		const data = { __typename: 'Post', id: 42, title: 'Test' };
		const { entityKeys } = store.normalizeResult(data);

		expect(entityKeys).toEqual(new Set(['Post:42']));
		expect(store.query('Post', '42')).toBeDefined();
	});
});
