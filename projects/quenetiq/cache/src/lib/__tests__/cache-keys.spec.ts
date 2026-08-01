import { describe, it, expect, beforeEach } from 'vitest';
import { inlineKey, resetInlineCounter, buildKey, simpleKey, allKeys, keysByType, getEntityTypes } from '../cache-keys';
import type { CacheEntity, TypePolicy } from '../normalized-cache';

describe('inlineKey', () => {
	beforeEach(() => resetInlineCounter());

	it('generates incremental inline keys', () => {
		const a = inlineKey('User');
		const b = inlineKey('User');
		expect(a).toBe('User:__inline__1');
		expect(b).toBe('User:__inline__2');
	});

	it('uses different typename prefix', () => {
		const a = inlineKey('Post');
		expect(a).toBe('Post:__inline__1');
	});
});

describe('resetInlineCounter', () => {
	it('resets the counter to 0', () => {
		inlineKey('User');
		inlineKey('User');
		resetInlineCounter();
		expect(inlineKey('User')).toBe('User:__inline__1');
	});
});

describe('buildKey', () => {
	const userEntity: CacheEntity = { __typename: 'User', id: '42', name: 'Alice' };

	it('uses keyFn from policy when provided', () => {
		const policy: TypePolicy = { keyFn: (e) => `custom:${String(e.id)}` };
		expect(buildKey('User', userEntity, policy)).toBe('custom:42');
	});

	it('uses id field when no keyFields', () => {
		expect(buildKey('User', userEntity)).toBe('User:42');
	});

	it('returns null when entity has no id and no keyFields', () => {
		const entity = { __typename: 'User', name: 'Alice' } as unknown as CacheEntity;
		expect(buildKey('User', entity)).toBeNull();
	});

	it('uses keyFields array', () => {
		const policy: TypePolicy = { keyFields: ['email'] };
		const entity: CacheEntity = { __typename: 'User', id: '42', email: 'a@b.com', name: 'Alice' };
		expect(buildKey('User', entity, policy)).toBe('User:a@b.com');
	});

	it('uses multiple keyFields', () => {
		const policy: TypePolicy = { keyFields: ['name', 'email'] };
		const entity: CacheEntity = { __typename: 'User', id: '42', name: 'Alice', email: 'a@b.com' };
		expect(buildKey('User', entity, policy)).toBe('User:Alice.a@b.com');
	});

	it('uses "null" string for missing keyField', () => {
		const policy: TypePolicy = { keyFields: ['missing'] };
		const entity: CacheEntity = { __typename: 'User', id: '42', name: 'Alice' };
		expect(buildKey('User', entity, policy)).toBe('User:null');
	});

	it('handles numeric id', () => {
		const entity = { __typename: 'Post', id: 7, title: 'Hello' } as unknown as CacheEntity;
		expect(buildKey('Post', entity)).toBe('Post:7');
	});

	it('handles id 0', () => {
		const entity = { __typename: 'Item', id: 0, label: 'zero' } as unknown as CacheEntity;
		expect(buildKey('Item', entity)).toBe('Item:0');
	});
});

describe('simpleKey', () => {
	it('joins typename and id with colon', () => {
		expect(simpleKey('User', '42')).toBe('User:42');
	});

	it('returns empty key for empty id', () => {
		expect(simpleKey('User', '')).toBe('User:');
	});
});

describe('allKeys', () => {
	it('returns all keys from map', () => {
		const map = new Map<string, CacheEntity>([['User:1', {} as CacheEntity], ['User:2', {} as CacheEntity]]);
		expect(allKeys(map)).toEqual(['User:1', 'User:2']);
	});

	it('returns empty array for empty map', () => {
		expect(allKeys(new Map())).toEqual([]);
	});
});

describe('keysByType', () => {
	it('filters keys by typename prefix', () => {
		const map = new Map<string, CacheEntity>([
			['User:1', {} as CacheEntity],
			['Post:1', {} as CacheEntity],
			['User:2', {} as CacheEntity],
		]);
		expect(keysByType(map, 'User')).toEqual(['User:1', 'User:2']);
	});

	it('returns empty array for type with no entries', () => {
		const map = new Map([['User:1', {} as CacheEntity]]);
		expect(keysByType(map, 'Post')).toEqual([]);
	});

	it('returns empty for empty map', () => {
		expect(keysByType(new Map(), 'User')).toEqual([]);
	});
});

describe('getEntityTypes', () => {
	it('extracts unique types from keys', () => {
		const map = new Map<string, CacheEntity>([
			['User:1', {} as CacheEntity],
			['Post:1', {} as CacheEntity],
			['User:2', {} as CacheEntity],
		]);
		const types = getEntityTypes(map);
		expect(types.sort()).toEqual(['Post', 'User']);
	});

	it('returns empty for empty map', () => {
		expect(getEntityTypes(new Map())).toEqual([]);
	});
});
