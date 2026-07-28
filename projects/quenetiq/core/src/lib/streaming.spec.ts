import { describe, it, expect } from 'vitest';
import { applyPatch, applyStreamItems, parseMultipartResponse } from './streaming';
import { lastValueFrom, toArray } from 'rxjs';

describe('applyPatch', () => {
	it('replaces a value at a shallow path', () => {
		const data = { name: 'Alice', age: 30 };
		const result = applyPatch(data, ['age'], 31);
		expect(result).toEqual({ name: 'Alice', age: 31 });
	});

	it('replaces a value at a nested path', () => {
		const data = { user: { name: 'Alice', meta: { visits: 5 } } };
		const result = applyPatch(data, ['user', 'meta', 'visits'], 6);
		expect(result).toEqual({ user: { name: 'Alice', meta: { visits: 6 } } });
	});

	it('sets a new field from patch', () => {
		const data = { name: 'Alice' };
		const result = applyPatch(data, ['city'], 'NYC');
		expect(result).toEqual({ name: 'Alice', city: 'NYC' });
	});

	it('returns a new object, does not mutate', () => {
		const data = { name: 'Alice' };
		const result = applyPatch(data, ['age'], 30);
		expect(result).not.toBe(data);
		expect(data).toEqual({ name: 'Alice' });
	});

	it('creates intermediate objects for missing paths', () => {
		const data = { a: {} };
		const result = applyPatch(data, ['a', 'b', 'c'], 42);
		expect(result).toEqual({ a: { b: { c: 42 } } });
	});
});

describe('applyStreamItems', () => {
	it('appends items to an array at path', () => {
		const data = { list: [{ id: 1 }, { id: 2 }] };
		const result = applyStreamItems(data, ['list'], [{ id: 3 }, { id: 4 }]);
		expect(result.list).toHaveLength(4);
		expect(result.list[2]).toEqual({ id: 3 });
		expect(result.list[3]).toEqual({ id: 4 });
	});

	it('creates an empty array when path is undefined', () => {
		const data = {} as Record<string, unknown>;
		const result = applyStreamItems(data, ['list'], [{ id: 1 }]);
		expect(result.list).toHaveLength(1);
	});

	it('returns new object without mutating', () => {
		const data = { list: [{ id: 1 }] };
		const result = applyStreamItems(data, ['list'], [{ id: 2 }]);
		expect(result.list).toHaveLength(2);
		expect(data.list).toHaveLength(1);
		expect(result).not.toBe(data);
	});
});

describe('parseMultipartResponse', () => {
	it('parses a simple multipart response', async () => {
		const body = '\n--b\nContent-Type: application/json\n\n{"data":{"hello":"world"}}\n--b--\n';
		const observable = parseMultipartResponse(body, 'b');
		const results = await lastValueFrom(observable.pipe(toArray()));
		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({ data: { hello: 'world' } });
	});

	it('parses multiple parts', async () => {
		const body = [
			'--b',
			'Content-Type: application/json',
			'',
			'{"data":{"initial":true}}',
			'--b',
			'Content-Type: application/json',
			'',
			'{"incremental":[{"path":["field"],"data":{"added":true}}]}',
			'--b--',
		].join('\n');
		const observable = parseMultipartResponse(body, 'b');
		const results = await lastValueFrom(observable.pipe(toArray()));
		expect(results).toHaveLength(2);
	});

	it('emits errors from incremental payload', async () => {
		const body =
			'\n--b\nContent-Type: application/json\n\n{"incremental":[{"path":["items"],"errors":[{"message":"oops"}]}]}\n--b--\n';
		const observable = parseMultipartResponse(body, 'b');
		const results = await lastValueFrom(observable.pipe(toArray()));
		expect(results).toHaveLength(1);
	});
});
