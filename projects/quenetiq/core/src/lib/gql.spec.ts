import { describe, it, expect } from 'vitest';
import { gql, createTypedQuery, print } from './gql';
import type { TypedQueryString } from './gql';
import { parse } from 'graphql';

describe('gql', () => {
	it('parses a simple query', () => {
		const doc = gql`
			query {
				hello
			}
		`;
		expect(doc.kind).toBe('Document');
		expect(doc.definitions).toHaveLength(1);
	});

	it('interpolates values', () => {
		const field = 'hello';
		const doc = gql`query { ${field} }`;
		expect(doc).toBeDefined();
	});
});

describe('createTypedQuery', () => {
	it('returns the same string', () => {
		const q = 'query { hello }';
		const result = createTypedQuery(q);
		expect(result).toBe(q);
	});

	it('carries TResult and TVariables phantom types', () => {
		interface Result {
			hello: string;
		}
		const q = createTypedQuery<Result>('query { hello }');
		// Type-level check: q is TypedQueryString<Result, Record<string, never>>
		const typed: TypedQueryString<Result> = q;
		expect(typed).toBe(q);
	});
});

describe('FragmentRef type', () => {
	it('is structural — object with space-prefixed key', () => {
		// FragmentRef<TData, TName> = { [K in TName as ` ${K}`]: TData }
		// At runtime it's just an object — we test the pattern here
		const ref = { ' MyFragment': { id: '1', name: 'test' } };
		expect(ref[' MyFragment']).toEqual({ id: '1', name: 'test' });
	});
});

describe('print', () => {
	it('prints a DocumentNode back to a string', () => {
		const doc = parse('query Foo { bar }');
		const result = print(doc);
		expect(result).toContain('query Foo');
		expect(result).toContain('bar');
	});
});
