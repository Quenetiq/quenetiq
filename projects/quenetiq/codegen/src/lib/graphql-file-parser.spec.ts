import { describe, it, expect } from 'vitest';
import { generateTypedDocumentsCode, generateIndexCode } from './graphql-file-parser';
import type { FragmentTypeInfo } from './graphql-file-parser';

describe('generateTypedDocumentsCode', () => {
	const baseOp = {
		name: 'GetItems',
		type: 'query' as const,
		variables: [{ name: 'limit', type: 'Int!' }],
		document: 'query GetItems($limit: Int!) { items(limit: $limit) { id title } }',
		filePath: '/test.graphql',
	};

	it('generates TypedDocumentNode without client preset', () => {
		const code = generateTypedDocumentsCode([baseOp]);
		expect(code).toContain('TypedDocumentNode');
		expect(code).toContain('gql`');
		expect(code).toContain('GetItems');
	});

	it('generates TypedQueryString with client preset', () => {
		const code = generateTypedDocumentsCode([baseOp], undefined, { clientPreset: true });
		expect(code).toContain('TypedQueryString');
		expect(code).toContain('createTypedQuery');
		expect(code).not.toContain('gql`');
	});

	it('generates result type with fragment key references', () => {
		const fragmentTypes = new Map<string, FragmentTypeInfo>();
		fragmentTypes.set('ItemFields', {
			name: 'ItemFields',
			keyName: 'ItemFieldsFragment$key',
			typeCondition: 'Item',
			importRelative: '../fragments/ItemFields',
		});

		const opWithSpread = {
			name: 'GetItems',
			type: 'query' as const,
			variables: [] as { name: string; type: string }[],
			document: 'query GetItems { items { id ...ItemFields } }',
			filePath: '/test.graphql',
		};

		const code = generateTypedDocumentsCode([opWithSpread], undefined, {}, fragmentTypes);
		expect(code).toContain('ItemFieldsFragment$key');
		expect(code).toContain('from "../fragments/index"');
	});

	it('generates result type only when fragmentTypes are provided', () => {
		const op = {
			name: 'SimpleQuery',
			type: 'query' as const,
			variables: [] as { name: string; type: string }[],
			document: 'query SimpleQuery { user { id name } }',
			filePath: '/test.graphql',
		};

		// Without fragmentTypes, no result type is generated
		const code = generateTypedDocumentsCode([op]);
		expect(code).not.toContain('export type SimpleQuery');
	});

	it('generates result type with fragmentTypes', () => {
		const fragmentTypes = new Map<string, FragmentTypeInfo>();
		fragmentTypes.set('UserFields', {
			name: 'UserFields',
			keyName: 'UserFieldsFragment$key',
			typeCondition: 'User',
			importRelative: '../fragments/UserFields',
		});

		const op = {
			name: 'GetUsers',
			type: 'query' as const,
			variables: [] as { name: string; type: string }[],
			document: 'query GetUsers { users { ...UserFields } }',
			filePath: '/test.graphql',
		};
		const code = generateTypedDocumentsCode([op], undefined, {}, fragmentTypes);
		expect(code).toContain('export type GetUsers');
		expect(code).toContain('UserFieldsFragment$key');
	});
});

describe('generateIndexCode', () => {
	it('generates re-exports for each operation', () => {
		const ops = [
			{ name: 'Foo', type: 'query' as const, variables: [], document: 'query Foo { f }', filePath: '/f.graphql' },
			{ name: 'Bar', type: 'mutation' as const, variables: [], document: 'mutation Bar { b }', filePath: '/b.graphql' },
		];
		const code = generateIndexCode(ops);
		expect(code).toContain('export { Foo } from "./Foo"');
		expect(code).toContain('export { Bar } from "./Bar"');
	});
});
