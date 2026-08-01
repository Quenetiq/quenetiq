import { describe, it, expect } from 'vitest';
import { resultError, resultSuccess, hasNextPage } from '../result';

describe('resultError', () => {
	it('returns error result without errorCode', () => {
		const r = resultError<string>('something went wrong');
		expect(r).toEqual({ status: 'error', error: 'something went wrong', errorCode: undefined });
	});

	it('returns error result with errorCode', () => {
		const r = resultError<string>('not found', 'NO_DATA');
		expect(r).toEqual({ status: 'error', error: 'not found', errorCode: 'NO_DATA' });
	});
});

describe('resultSuccess', () => {
	it('returns success result with data', () => {
		const r = resultSuccess({ id: '1', name: 'test' });
		expect(r).toEqual({ status: 'success', data: { id: '1', name: 'test' } });
	});

	it('returns success result with null data', () => {
		const r = resultSuccess<null>(null);
		expect(r).toEqual({ status: 'success', data: null });
	});

	it('returns success result with array data', () => {
		const r = resultSuccess([1, 2, 3]);
		expect(r).toEqual({ status: 'success', data: [1, 2, 3] });
	});
});

describe('hasNextPage', () => {
	it('returns true when hasNext is true', () => {
		expect(hasNextPage({ hasNext: true })).toBe(true);
	});

	it('returns false when hasNext is false', () => {
		expect(hasNextPage({ hasNext: false })).toBe(false);
	});

	it('returns false for null', () => {
		expect(hasNextPage(null)).toBe(false);
	});

	it('returns false for non-object', () => {
		expect(hasNextPage('string')).toBe(false);
		expect(hasNextPage(42)).toBe(false);
	});

	it('returns false for object without hasNext', () => {
		expect(hasNextPage({})).toBe(false);
		expect(hasNextPage({ next: true })).toBe(false);
	});

	it('returns false for array', () => {
		expect(hasNextPage([{ hasNext: true }])).toBe(false);
	});

	it('returns false when hasNext is truthy but not boolean', () => {
		expect(hasNextPage({ hasNext: 'yes' })).toBe(false);
		expect(hasNextPage({ hasNext: 1 })).toBe(false);
	});
});
