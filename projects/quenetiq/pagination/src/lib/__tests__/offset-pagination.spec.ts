import { describe, it, expect, vi } from 'vitest';

vi.mock('@quenetiq/core', () => ({
	query: vi.fn(),
}));

import { offsetMerge } from '../offset-pagination';

describe('offsetMerge', () => {
	it('returns incoming when existing is undefined', () => {
		expect(offsetMerge(undefined, [1, 2, 3])).toEqual([1, 2, 3]);
	});

	it('replaces at offset 0', () => {
		expect(offsetMerge([1, 2], [3, 4])).toEqual([3, 4]);
	});

	it('inserts incoming at correct offset position', () => {
		const existing = [1, 2, 3, 4, 5];
		const incoming = [10, 20];
		expect(offsetMerge(existing, incoming, { args: { offset: 2 } })).toEqual([1, 2, 10, 20, 5]);
	});

	it('handles offset beyond existing length', () => {
		expect(offsetMerge([1], [2, 3], { args: { offset: 3 } })).toEqual([1, 2, 3]);
	});

	it('filters undefined gaps', () => {
		const existing = [1, 2];
		const incoming = [10];
		expect(offsetMerge(existing, incoming, { args: { offset: 5 } })).toEqual([1, 2, 10]);
	});

	it('handles empty incoming', () => {
		expect(offsetMerge([1, 2], [])).toEqual([1, 2]);
	});

	it('handles empty existing', () => {
		expect(offsetMerge([], [1, 2])).toEqual([1, 2]);
	});
});
