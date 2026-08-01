import { describe, it, expect } from 'vitest';
import { CacheStore } from '../cache-store';

describe('CacheStore readQuery / writeQuery', () => {
	it('writes and reads a query result', () => {
		const store = new CacheStore();
		const data = { status: 'success', data: { user: { id: '1', name: 'Alice' } } };
		store.writeQuery('q:hash:1', data);
		expect(store.readQuery('q:hash:1')).toEqual(data);
	});

	it('returns undefined for unknown query hash', () => {
		const store = new CacheStore();
		expect(store.readQuery('nonexistent')).toBeUndefined();
	});

	it('overwrites existing query data', () => {
		const store = new CacheStore();
		store.writeQuery('q:1', { data: 'old' });
		store.writeQuery('q:1', { data: 'new' });
		expect(store.readQuery('q:1')).toEqual({ data: 'new' });
	});
});

describe('CacheStore readFragment / writeFragment', () => {
	it('writes and reads fragment fields', () => {
		const store = new CacheStore();
		store.writeFragment('User', '1', { name: 'Alice', email: 'a@b.com' });

		const result = store.readFragment('User', '1', ['name', 'email']);
		expect(result).toEqual({ name: 'Alice', email: 'a@b.com' });
	});

	it('reads only requested fields', () => {
		const store = new CacheStore();
		store.writeFragment('User', '1', { name: 'Alice', email: 'a@b.com', age: 30 });

		const result = store.readFragment('User', '1', ['name']);
		expect(result).toEqual({ name: 'Alice' });
	});

	it('returns undefined for non-existent entity', () => {
		const store = new CacheStore();
		expect(store.readFragment('User', '999', ['name'])).toBeUndefined();
	});

	it('merges fields into existing entity', () => {
		const store = new CacheStore();
		store.writeFragment('User', '1', { name: 'Alice' });
		store.writeFragment('User', '1', { email: 'a@b.com' });

		const result = store.readFragment('User', '1', ['name', 'email']);
		expect(result).toEqual({ name: 'Alice', email: 'a@b.com' });
	});

	it('handles empty fields array', () => {
		const store = new CacheStore();
		store.writeFragment('User', '1', { name: 'Alice' });
		const result = store.readFragment('User', '1', []);
		expect(result).toEqual({});
	});
});
