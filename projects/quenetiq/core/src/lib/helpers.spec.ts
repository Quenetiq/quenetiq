import { describe, it, expect } from 'vitest';
import {
	isSuccess,
	isError,
	unwrap,
	unwrapOrThrow,
	mapResult,
	hasPartialErrors,
	getGraphQLErrors,
	getNetworkError,
} from './helpers';

describe('isSuccess', () => {
	it('returns true for success results', () => {
		expect(isSuccess({ status: 'success', data: {} })).toBe(true);
	});

	it('returns false for error results', () => {
		expect(isSuccess({ status: 'error', error: 'fail' })).toBe(false);
	});
});

describe('isError', () => {
	it('returns true for error results', () => {
		expect(isError({ status: 'error', error: 'fail' })).toBe(true);
	});

	it('returns false for success results', () => {
		expect(isError({ status: 'success', data: {} })).toBe(false);
	});
});

describe('unwrap', () => {
	it('returns data on success', () => {
		expect(unwrap({ status: 'success', data: { x: 1 } })).toEqual({ x: 1 });
	});

	it('returns null on error', () => {
		expect(unwrap({ status: 'error', error: 'fail' })).toBeNull();
	});

	it('returns null on loading', () => {
		expect(unwrap({ status: 'loading' } as any)).toBeNull();
	});
});

describe('unwrapOrThrow', () => {
	it('returns data on success', () => {
		expect(unwrapOrThrow({ status: 'success', data: { x: 1 } })).toEqual({ x: 1 });
	});

	it('throws on error', () => {
		expect(() => unwrapOrThrow({ status: 'error', error: 'fail' })).toThrow('fail');
	});

	it('returns data even for non-error non-success status', () => {
		// Only throws for status === 'error'
		expect(unwrapOrThrow({ status: 'loading' } as any)).toBeUndefined();
	});
});

describe('mapResult', () => {
	it('maps data on success', () => {
		const result = mapResult({ status: 'success', data: { x: 1 } }, (d) => ({ ...d, y: 2 }));
		expect(result).toEqual({ status: 'success', data: { x: 1, y: 2 } });
	});

	it('passes through error', () => {
		const result = mapResult({ status: 'error', error: 'fail' } as any, (d: any) => d);
		expect(result).toEqual({ status: 'error', error: 'fail' });
	});
});

describe('hasPartialErrors', () => {
	it('returns true when graphQLErrors exist', () => {
		expect(hasPartialErrors({ status: 'success', data: {}, graphQLErrors: [{ message: 'partial' }] })).toBe(true);
	});

	it('returns false when no graphQLErrors', () => {
		expect(hasPartialErrors({ status: 'success', data: {} })).toBe(false);
	});
});

describe('getGraphQLErrors', () => {
	it('returns graphQLErrors array', () => {
		const errors = [{ message: 'e1' }, { message: 'e2' }];
		expect(getGraphQLErrors({ status: 'success', data: {}, graphQLErrors: errors })).toEqual(errors);
	});

	it('returns empty array when no graphQLErrors', () => {
		expect(getGraphQLErrors({ status: 'success', data: {} })).toEqual([]);
	});
});

describe('getNetworkError', () => {
	it('returns networkError for error results', () => {
		expect(getNetworkError({ status: 'error', networkError: { message: 'network failed', status: 500 } })).toEqual({
			message: 'network failed',
			status: 500,
		});
	});

	it('returns undefined for success results', () => {
		expect(getNetworkError({ status: 'success', data: {} })).toBeUndefined();
	});
});
