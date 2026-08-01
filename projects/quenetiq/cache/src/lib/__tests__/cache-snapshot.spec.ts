import { describe, it, expect } from 'vitest';
import { takeSnapshot, restoreSnapshot } from '../cache-snapshot';
import type { CacheEntity, EntityMeta } from '../normalized-cache';

describe('takeSnapshot', () => {
	it('converts entity and meta maps to snapshot arrays', () => {
		const entities = new Map<string, CacheEntity>([
			['User:1', { __typename: 'User', id: '1', name: 'Alice' }],
		]);
		const meta = new Map<string, EntityMeta>([
			['User:1', { createdAt: 100, updatedAt: 200, source: 'test', mergeCount: 0 }],
		]);

		const snapshot = takeSnapshot(entities, meta);

		expect(snapshot.entities).toEqual([['User:1', { __typename: 'User', id: '1', name: 'Alice' }]]);
		expect(snapshot.meta).toEqual([['User:1', { createdAt: 100, updatedAt: 200, source: 'test', mergeCount: 0 }]]);
	});

	it('returns empty arrays for empty maps', () => {
		const snapshot = takeSnapshot(new Map(), new Map());
		expect(snapshot.entities).toEqual([]);
		expect(snapshot.meta).toEqual([]);
	});

	it('does not share references with the source maps', () => {
		const entities = new Map([['A:1', { __typename: 'A', id: '1' }]]);
		const meta = new Map([['A:1', { createdAt: 0, updatedAt: 0, source: '', mergeCount: 0 }]]);

		const snapshot = takeSnapshot(entities, meta);
		entities.set('B:2', { __typename: 'B', id: '2' });

		expect(snapshot.entities).toHaveLength(1);
	});
});

describe('restoreSnapshot', () => {
	it('replaces entities and meta from snapshot', () => {
		const entities = new Map([['Old:1', { __typename: 'Old', id: '1' }]]);
		const meta = new Map([['Old:1', { createdAt: 0, updatedAt: 0, source: '', mergeCount: 0 }]]);

		const snapshot = {
			entities: [['New:1', { __typename: 'New', id: '1', val: 42 }]] as [string, CacheEntity][],
			meta: [['New:1', { createdAt: 100, updatedAt: 100, source: 'restore', mergeCount: 1 }]] as [string, EntityMeta][],
		};

		restoreSnapshot(entities, meta, snapshot);

		expect(entities.has('Old:1')).toBe(false);
		expect(entities.get('New:1')).toEqual({ __typename: 'New', id: '1', val: 42 });
		expect(meta.get('New:1')?.source).toBe('restore');
	});

	it('clears all existing data before restoring', () => {
		const entities = new Map([
			['A:1', { __typename: 'A', id: '1' }],
			['A:2', { __typename: 'A', id: '2' }],
		]);
		const meta = new Map();

		restoreSnapshot(entities, meta, { entities: [], meta: [] });

		expect(entities.size).toBe(0);
	});

	it('handles empty snapshot', () => {
		const entities = new Map([['E:1', { __typename: 'E', id: '1' }]]);
		const meta = new Map();

		restoreSnapshot(entities, meta, { entities: [], meta: [] });

		expect(entities.size).toBe(0);
		expect(meta.size).toBe(0);
	});
});
