import { describe, it, expect } from 'vitest';
import { isSuccess, isError, unwrap, unwrapOrThrow, mapResult, hasPartialErrors } from '../helpers';
import type { GraphQLResult } from '../result';

const successResult: GraphQLResult<{ hello: string }> = {
	status: 'success',
	data: { hello: 'world' },
};

const successWithPartialErrors: GraphQLResult<{ hello: string }> = {
	status: 'success',
	data: { hello: 'world' },
	graphQLErrors: [{ message: 'partial error' }],
};

const errorResult: GraphQLResult<{ hello: string }> = {
	status: 'error',
	error: 'something went wrong',
	errorCode: 'NETWORK_ERROR',
	graphQLErrors: [{ message: 'field error' }],
};

describe('isSuccess', () => {
	it('returns true for successful result', () => {
		expect(isSuccess(successResult)).toBe(true);
	});

	it('returns false for error result', () => {
		expect(isSuccess(errorResult)).toBe(false);
	});
});

describe('isError', () => {
	it('returns false for successful result', () => {
		expect(isError(successResult)).toBe(false);
	});

	it('returns true for error result', () => {
		expect(isError(errorResult)).toBe(true);
	});
});

describe('unwrap', () => {
	it('returns data on success', () => {
		expect(unwrap(successResult)).toEqual({ hello: 'world' });
	});

	it('returns null on error', () => {
		expect(unwrap(errorResult)).toBeNull();
	});
});

describe('unwrapOrThrow', () => {
	it('returns data on success', () => {
		expect(unwrapOrThrow(successResult)).toEqual({ hello: 'world' });
	});

	it('throws on error', () => {
		expect(() => unwrapOrThrow(errorResult)).toThrow('something went wrong');
	});
});

describe('mapResult', () => {
	it('maps data on success', () => {
		const mapped = mapResult(successResult, (d) => d.hello);
		expect(mapped.status === 'success' ? mapped.data : null).toBe('world');
	});

	it('passes through error result unchanged', () => {
		const mapped = mapResult(errorResult, (d) => d.hello);
		expect(mapped.status).toBe('error');
	});
});

describe('hasPartialErrors', () => {
	it('returns false when no graphQLErrors', () => {
		expect(hasPartialErrors(successResult)).toBe(false);
	});

	it('returns true when graphQLErrors exist on success', () => {
		expect(hasPartialErrors(successWithPartialErrors)).toBe(true);
	});

	it('returns false on error result', () => {
		expect(hasPartialErrors(errorResult)).toBe(false);
	});
});
