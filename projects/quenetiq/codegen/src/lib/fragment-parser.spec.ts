import { describe, it, expect } from 'vitest';
import { parseFragmentFile, generateFragmentCode, generateFragmentIndex } from './fragment-parser';

describe('parseFragmentFile', () => {
	it('parses a simple fragment file', () => {
		// Create a virtual graphql file
		const content = 'fragment Foo on Bar { id name }';
		const path = '/tmp/test-fragment.graphql';
		const fs = require('fs');
		fs.writeFileSync(path, content);
		const result = parseFragmentFile(path);
		fs.unlinkSync(path);
		expect(result).not.toBeNull();
		expect(result![0].name).toBe('Foo');
		expect(result![0].typeCondition).toBe('Bar');
		expect(result![0].fields).toEqual(['id', 'name']);
	});

	it('returns null for non-existent file', () => {
		expect(parseFragmentFile('/does/not/exist.graphql')).toBeNull();
	});

	it('returns null for empty content', () => {
		const path = '/tmp/empty.graphql';
		const fs = require('fs');
		fs.writeFileSync(path, '');
		expect(parseFragmentFile(path)).toBeNull();
		fs.unlinkSync(path);
	});

	it('parses fragment with inline fragments', () => {
		const content = `
      fragment Foo on Bar {
        id
        ... on Baz { extra }
      }
    `;
		const path = '/tmp/inline-fragment.graphql';
		const fs = require('fs');
		fs.writeFileSync(path, content);
		const result = parseFragmentFile(path);
		fs.unlinkSync(path);
		expect(result).not.toBeNull();
		expect(result![0].inlineFragments).toContain('Baz');
		expect(result![0].fields).toContain('extra');
		expect(result![0].inlineFragmentFields).toEqual({ Baz: ['extra'] });
	});

	it('parses multiple inline fragments with distinct fields', () => {
		const content = `
      fragment Foo on Bar {
        id
        ... on Admin { role permissions }
        ... on User { email }
      }
    `;
		const path = '/tmp/multi-inline.graphql';
		const fs = require('fs');
		fs.writeFileSync(path, content);
		const result = parseFragmentFile(path);
		fs.unlinkSync(path);
		expect(result).not.toBeNull();
		expect(result![0].inlineFragmentFields).toEqual({
			Admin: ['role', 'permissions'],
			User: ['email'],
		});
	});

	it('parses nested inline fragments', () => {
		const content = `
      fragment Foo on Bar {
        id
        ... on Node {
          ... on Admin { role }
          ... on User { email }
        }
      }
    `;
		const path = '/tmp/nested-inline.graphql';
		const fs = require('fs');
		fs.writeFileSync(path, content);
		const result = parseFragmentFile(path);
		fs.unlinkSync(path);
		expect(result).not.toBeNull();
		// All fields from all nested fragments should be tracked
		expect(result![0].inlineFragmentFields['Admin']).toContain('role');
		expect(result![0].inlineFragmentFields['User']).toContain('email');
	});

	it('returns null for operations-only files', () => {
		const content = 'query Foo { bar }';
		const path = '/tmp/op-only.graphql';
		const fs = require('fs');
		fs.writeFileSync(path, content);
		expect(parseFragmentFile(path)).toBeNull();
		fs.unlinkSync(path);
	});

	it('parses multiple fragments in one file', () => {
		const content = `
      fragment A on X { a }
      fragment B on Y { b }
    `;
		const path = '/tmp/multi-fragment.graphql';
		const fs = require('fs');
		fs.writeFileSync(path, content);
		const result = parseFragmentFile(path);
		fs.unlinkSync(path);
		expect(result).toHaveLength(2);
		expect(result![0].name).toBe('A');
		expect(result![1].name).toBe('B');
	});
});

describe('generateFragmentCode', () => {
	const baseFrag = {
		name: 'BookFields',
		typeCondition: 'Book',
		fields: ['id', 'title', 'author'],
		inlineFragments: [] as string[],
		inlineFragmentFields: {} as Record<string, string[]>,
		document: 'fragment BookFields on Book { id title author }',
		filePath: '/test.graphql',
	};

	it('generates TypedDocumentNode by default', () => {
		const code = generateFragmentCode([baseFrag]);
		expect(code).toContain('TypedDocumentNode');
		expect(code).toContain('gql`');
		expect(code).not.toContain('TypedQueryString');
	});

	it('generates TypedQueryString with client preset', () => {
		const code = generateFragmentCode([baseFrag], undefined, true);
		expect(code).toContain('TypedQueryString');
		expect(code).toContain('createTypedQuery');
		expect(code).not.toContain('gql`');
	});

	it('generates FragmentRef $key type', () => {
		const code = generateFragmentCode([baseFrag]);
		expect(code).toContain('BookFieldsFragment$key');
		expect(code).toContain('FragmentRef');
	});

	it('generates FragmentRef $key with client preset', () => {
		const code = generateFragmentCode([baseFrag], undefined, true);
		expect(code).toContain('BookFieldsFragment$key');
		expect(code).toContain('FragmentRef');
	});

	it('generates Pick<> type for fragment data', () => {
		const code = generateFragmentCode([baseFrag]);
		expect(code).toContain('PickSafe<Book');
		expect(code).toContain('\'id\' | \'title\' | \'author\'');
	});

	it('generates inline fragment types when present', () => {
		const frag = {
			...baseFrag,
			inlineFragments: ['SpecialBook'],
			inlineFragmentFields: { SpecialBook: ['extraField'] },
		};
		const code = generateFragmentCode([frag]);
		expect(code).toContain('WithInline');
		expect(code).toContain('SpecialBook');
		expect(code).toContain('\'extraField\'');
		expect(code).not.toContain('\'TODO\'');
	});

	it('generates inline fragment types without fields when none', () => {
		const frag = {
			...baseFrag,
			inlineFragments: ['SpecialBook'],
			inlineFragmentFields: {},
		};
		const code = generateFragmentCode([frag]);
		expect(code).toContain('WithInline');
		expect(code).toContain('{ __typename: \'SpecialBook\' }');
		expect(code).not.toContain('Pick<SpecialBook');
	});

	it('imports type names from typesCode', () => {
		const typesCode = 'export interface Book { id: string; title: string; author: string; }';
		const code = generateFragmentCode([baseFrag], typesCode);
		expect(code).toContain('import type {');
		expect(code).toContain('Book');
	});

	it('generates FragmentRef import', () => {
		const code = generateFragmentCode([baseFrag]);
		expect(code).toContain('FragmentRef');
	});
});

describe('generateFragmentIndex', () => {
	it('generates exports with $key type', () => {
		const fragments = [
			{
				name: 'F1',
				typeCondition: 'T1',
				fields: ['a'],
				inlineFragments: [] as string[],
				inlineFragmentFields: {} as Record<string, string[]>,
				document: 'fragment F1 on T1 { a }',
				filePath: '/f1.graphql',
			},
		];
		const code = generateFragmentIndex(fragments);
		expect(code).toContain('F1Fragment, F1Fragment$key, F1');
	});
});
