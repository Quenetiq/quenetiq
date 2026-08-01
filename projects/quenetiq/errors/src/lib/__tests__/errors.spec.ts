import { describe, it, expect } from 'vitest';
import { QuenetiqError } from '../base';
import { GraphQLError } from '../graphql';
import { NetworkError, NetworkErrorCode } from '../network';
import { CacheError, CacheErrorCode } from '../cache';
import { ValidationError, ValidationErrorCode } from '../validation';
import { ErrorHandler } from '../handler';

describe('QuenetiqError', () => {
	it('creates a basic error with message and code', () => {
		const err = new QuenetiqError('test error', 'TEST_ERR');
		expect(err.message).toBe('test error');
		expect(err.code).toBe('TEST_ERR');
		expect(err.name).toBe('QuenetiqError');
	});

	it('has a timestamp', () => {
		const err = new QuenetiqError('test', 'T');
		expect(err.timestamp).toBeDefined();
		expect(() => new Date(err.timestamp)).not.toThrow();
	});

	it('toJSON returns serializable object', () => {
		const err = new QuenetiqError('test', 'T', { foo: 'bar' });
		const json = err.toJSON();
		expect(json.message).toBe('test');
		expect(json.code).toBe('T');
		expect(json.context).toEqual({ foo: 'bar' });
	});
});

describe('GraphQLError', () => {
	it('creates from GQL error shape with locations', () => {
		const err = new GraphQLError({
			message: 'field error',
			locations: [{ line: 1, column: 5 }],
		});
		expect(err.message).toBe('field error');
		expect(err.locations).toEqual([{ line: 1, column: 5 }]);
		expect(err.name).toBe('GraphQLError');
	});

	it('works without locations', () => {
		const err = new GraphQLError({ message: 'simple error' });
		expect(err.locations).toBeUndefined();
	});
});

describe('NetworkError', () => {
	it('creates with code and message', () => {
		const err = new NetworkError(NetworkErrorCode.TIMEOUT, 'request timed out');
		expect(err.code).toBe(NetworkErrorCode.TIMEOUT);
		expect(err.message).toBe('request timed out');
		expect(err.name).toBe('NetworkError');
	});

	it('has standard status codes', () => {
		expect(NetworkErrorCode.TIMEOUT).toBe('NETWORK_TIMEOUT');
		expect(NetworkErrorCode.OFFLINE).toBe('NETWORK_OFFLINE');
		expect(NetworkErrorCode.HTTP_ERROR).toBe('HTTP_ERROR');
		expect(NetworkErrorCode.ABORTED).toBe('NETWORK_ABORTED');
	});
});

describe('CacheError', () => {
	it('creates with code and message', () => {
		const err = new CacheError(CacheErrorCode.MISS, 'cache miss');
		expect(err.code).toBe(CacheErrorCode.MISS);
		expect(err.name).toBe('CacheError');
	});

	it('has standard error codes', () => {
		expect(CacheErrorCode.MISS).toBe('CACHE_MISS');
		expect(CacheErrorCode.SERIALIZATION).toBe('CACHE_SERIALIZATION');
		expect(CacheErrorCode.GC).toBe('CACHE_GC');
		expect(CacheErrorCode.PERSISTENCE).toBe('CACHE_PERSISTENCE');
	});
});

describe('ValidationError', () => {
	it('creates with code and message', () => {
		const err = new ValidationError(ValidationErrorCode.INVALID_QUERY, 'bad query');
		expect(err.code).toBe(ValidationErrorCode.INVALID_QUERY);
		expect(err.name).toBe('ValidationError');
	});

	it('has standard error codes', () => {
		expect(ValidationErrorCode.MISSING_VARIABLES).toBe('VALIDATION_MISSING_VARIABLES');
		expect(ValidationErrorCode.INVALID_QUERY).toBe('VALIDATION_INVALID_QUERY');
		expect(ValidationErrorCode.TYPE_MISMATCH).toBe('VALIDATION_TYPE_MISMATCH');
	});
});

describe('ErrorHandler', () => {
	it('handles errors by code', async () => {
		const handler = new ErrorHandler({ throwUnhandled: false });
		let handled = false;
		handler.on('NETWORK_ERR', () => {
			handled = true;
		});
		await handler.handle(new QuenetiqError('network error', 'NETWORK_ERR'));
		expect(handled).toBe(true);
	});

	it('throws unhandled errors by default', async () => {
		const handler = new ErrorHandler();
		await expect(handler.handle(new QuenetiqError('unknown', 'UNKNOWN'))).rejects.toThrow('unknown');
	});

	it('does not throw when throwUnhandled is false', async () => {
		const handler = new ErrorHandler({ throwUnhandled: false });
		const result = await handler.handle(new QuenetiqError('unknown', 'UNKNOWN'));
		expect(result).toBe(true);
	});

	it('handles errors by filter function', async () => {
		const handler = new ErrorHandler({ throwUnhandled: false });
		let handled = false;
		handler.on(
			(e) => e.message.includes('custom'),
			() => {
				handled = true;
			},
		);
		await handler.handle(new QuenetiqError('custom error', 'C'));
		expect(handled).toBe(true);
	});

	it('stops propagation when handler returns false', async () => {
		const handler = new ErrorHandler({ throwUnhandled: false });
		const calls: string[] = [];
		handler.on('A', () => {
			calls.push('first');
			return false;
		});
		handler.on('A', () => {
			calls.push('second');
		});
		await handler.handle(new QuenetiqError('test', 'A'));
		expect(calls).toEqual(['first']);
	});

	it('returns false for non-QuenetiqError', async () => {
		const handler = new ErrorHandler({ throwUnhandled: false });
		const result = await handler.handle(new Error('not a QuenetiqError'));
		expect(result).toBe(false);
	});
});
