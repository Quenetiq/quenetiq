import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getMeta, getAllMeta, getEntityAge, isStale, touchMeta } from '../cache-meta';
import type { EntityMeta } from '../normalized-cache';

const baseMeta: EntityMeta = { createdAt: 0, updatedAt: 0, source: '', mergeCount: 0 };

describe('getMeta', () => {
	it('returns meta for existing key', () => {
		const meta = new Map([['A:1', { ...baseMeta, source: 'test' }]]);
		expect(getMeta(meta, 'A:1')?.source).toBe('test');
	});

	it('returns undefined for missing key', () => {
		expect(getMeta(new Map(), 'missing')).toBeUndefined();
	});
});

describe('getAllMeta', () => {
	it('returns a copy of the meta map', () => {
		const meta = new Map([['A:1', baseMeta]]);
		const copy = getAllMeta(meta);
		expect(copy.get('A:1')).toEqual(baseMeta);
		meta.set('B:2', baseMeta);
		expect(copy.has('B:2')).toBe(false);
	});
});

describe('getEntityAge', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns time since last update', () => {
		vi.setSystemTime(1000);
		const meta = new Map([['A:1', { ...baseMeta, updatedAt: 500 }]]);
		expect(getEntityAge(meta, 'A:1')).toBe(500);
	});

	it('returns undefined for missing entity', () => {
		expect(getEntityAge(new Map(), 'ghost')).toBeUndefined();
	});
});

describe('isStale', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns true when entity is older than maxAge', () => {
		vi.setSystemTime(2000);
		const meta = new Map([['A:1', { ...baseMeta, updatedAt: 500 }]]);
		expect(isStale(meta, 'A:1', 1000)).toBe(true);
	});

	it('returns false when entity is within maxAge', () => {
		vi.setSystemTime(1500);
		const meta = new Map([['A:1', { ...baseMeta, updatedAt: 1000 }]]);
		expect(isStale(meta, 'A:1', 1000)).toBe(false);
	});

	it('returns true for missing entity', () => {
		expect(isStale(new Map(), 'ghost', 1000)).toBe(true);
	});

	it('returns true for entity with updatedAt equal to boundary', () => {
		vi.setSystemTime(2000);
		const meta = new Map([['A:1', { ...baseMeta, updatedAt: 1000 }]]);
		expect(isStale(meta, 'A:1', 1000)).toBe(false);
	});
});

describe('touchMeta', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('creates new meta entry for unknown key', () => {
		vi.setSystemTime(5000);
		const meta = new Map();
		touchMeta(meta, 'A:1', 'query');

		const entry = meta.get('A:1');
		expect(entry).toBeDefined();
		expect(entry!.createdAt).toBe(5000);
		expect(entry!.updatedAt).toBe(5000);
		expect(entry!.source).toBe('query');
		expect(entry!.mergeCount).toBe(0);
	});

	it('updates existing meta entry', () => {
		vi.setSystemTime(1000);
		const meta = new Map([['A:1', { createdAt: 0, updatedAt: 0, source: 'init', mergeCount: 3 }]]);

		vi.setSystemTime(2000);
		touchMeta(meta, 'A:1', 'mutation');

		const entry = meta.get('A:1')!;
		expect(entry.updatedAt).toBe(2000);
		expect(entry.source).toBe('mutation');
		expect(entry.mergeCount).toBe(4);
		expect(entry.createdAt).toBe(0);
	});

	it('increments mergeCount on each touch', () => {
		const meta = new Map([['C:3', { ...baseMeta, mergeCount: 0 }]]);
		touchMeta(meta, 'C:3', 'a');
		touchMeta(meta, 'C:3', 'b');
		touchMeta(meta, 'C:3', 'c');
		expect(meta.get('C:3')!.mergeCount).toBe(3);
	});
});
