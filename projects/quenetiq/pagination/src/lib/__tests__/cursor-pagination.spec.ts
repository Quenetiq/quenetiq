import { describe, it, expect, vi } from 'vitest';

vi.mock('@quenetiq/core', () => ({
	query: vi.fn(),
}));

import { cursorMerge } from '../cursor-pagination';

describe('cursorMerge', () => {
	it('returns incoming when existing is undefined', () => {
		expect(cursorMerge(undefined, ['a', 'b'])).toEqual(['a', 'b']);
	});

	it('concatenates incoming to existing', () => {
		expect(cursorMerge(['a', 'b'], ['c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
	});

	it('handles empty arrays', () => {
		expect(cursorMerge([], [])).toEqual([]);
	});

	it('handles empty existing', () => {
		expect(cursorMerge([], ['x'])).toEqual(['x']);
	});

	it('handles empty incoming', () => {
		expect(cursorMerge(['x'], [])).toEqual(['x']);
	});
});
