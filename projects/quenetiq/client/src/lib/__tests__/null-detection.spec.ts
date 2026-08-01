import { describe, it, expect } from 'vitest';
import { walkObject, extractOpName } from '../null-detection';

describe('walkObject', () => {
	it('detects null at root', () => {
		const result = walkObject(null, 'data');
		expect(result).toEqual([{ type: 'null-value', path: 'data', operationName: undefined }]);
	});

	it('detects null in nested field', () => {
		const obj = { user: { name: null, email: 'a@b.com' } };
		const result = walkObject(obj, 'data');
		expect(result).toEqual([{ type: 'null-value', path: 'data.user.name', operationName: undefined }]);
	});

	it('returns empty for object with no nulls', () => {
		const obj = { user: { name: 'Alice', email: 'a@b.com' } };
		const result = walkObject(obj, 'data');
		expect(result).toEqual([]);
	});

	it('detects null in array elements', () => {
		const obj = { items: [1, null, 3] };
		const result = walkObject(obj, 'data');
		expect(result).toEqual([{ type: 'null-value', path: 'data.items[1]', operationName: undefined }]);
	});

	it('handles nested arrays', () => {
		const obj = { matrix: [[1, null], [3, 4]] };
		const result = walkObject(obj, 'data');
		expect(result).toEqual([{ type: 'null-value', path: 'data.matrix[0][1]', operationName: undefined }]);
	});

	it('handles undefined values (not null)', () => {
		const obj = { user: { name: undefined } };
		const result = walkObject(obj, 'data');
		expect(result).toEqual([]);
	});

	it('passes operationName through', () => {
		const result = walkObject({ x: null }, 'data', 'GetUser');
		expect(result[0].operationName).toBe('GetUser');
	});

	it('handles empty object', () => {
		expect(walkObject({}, 'data')).toEqual([]);
	});

	it('handles array at root', () => {
		const result = walkObject([null, 'hello'], 'data');
		expect(result).toEqual([{ type: 'null-value', path: 'data[0]', operationName: undefined }]);
	});

	it('handles deeply nested null', () => {
		const obj = { a: { b: { c: { d: null } } } };
		const result = walkObject(obj, 'data');
		expect(result).toEqual([{ type: 'null-value', path: 'data.a.b.c.d', operationName: undefined }]);
	});

	it('detects multiple nulls', () => {
		const obj = { a: null, b: { c: null } };
		const result = walkObject(obj, 'data');
		expect(result).toEqual([
			{ type: 'null-value', path: 'data.a', operationName: undefined },
			{ type: 'null-value', path: 'data.b.c', operationName: undefined },
		]);
	});
});

describe('extractOpName', () => {
	it('extracts query operation name', () => {
		expect(extractOpName('query GetUser { user { id } }')).toBe('GetUser');
	});

	it('extracts mutation operation name', () => {
		expect(extractOpName('mutation UpdateUser { updateUser { id } }')).toBe('UpdateUser');
	});

	it('extracts subscription operation name', () => {
		expect(extractOpName('subscription OnUpdate { onUpdate { id } }')).toBe('OnUpdate');
	});

	it('returns undefined for query without name', () => {
		expect(extractOpName('query { user { id } }')).toBeUndefined();
	});

	it('returns undefined for empty string', () => {
		expect(extractOpName('')).toBeUndefined();
	});

	it('is case insensitive', () => {
		expect(extractOpName('QUERY GetUser { user { id } }')).toBe('GetUser');
	});
});
