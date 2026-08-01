import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => {
	const readFileSync = vi.fn();
	const existsSync = vi.fn();
	return {
		readFileSync,
		existsSync,
		default: { readFileSync, existsSync },
	};
});

import { readFileSync, existsSync } from 'fs';
import {
	generateTypedDocumentsCode,
	generateIndexCode,
	parseGraphqlFile,
	findGraphqlFiles,
} from './graphql-file-parser';
import type { FragmentTypeInfo } from './graphql-file-parser';

describe('findGraphqlFiles', () => {
	it('returns absolute paths for matching pattern', () => {
		const files = findGraphqlFiles('projects/quenetiq/codegen/src/lib/*.spec.ts');
		expect(files.length).toBeGreaterThan(0);
		expect(files[0]).toMatch(/^\//);
	});

	it('returns empty array for non-matching pattern', () => {
		const files = findGraphqlFiles('nonexistent/**/*.graphql');
		expect(files).toEqual([]);
	});
});

describe('parseGraphqlFile', () => {
	beforeEach(() => {
		vi.mocked(existsSync).mockClear();
		vi.mocked(readFileSync).mockClear();
	});

	it('returns null when file does not exist', () => {
		vi.mocked(existsSync).mockReturnValue(false);
		expect(parseGraphqlFile('/fake/path.graphql')).toBeNull();
	});

	it('returns null when file is empty', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue('   ');
		expect(parseGraphqlFile('/empty.graphql')).toBeNull();
	});

	it('returns null when file contains no operation definition', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue('type Query { foo: String }');
		expect(parseGraphqlFile('/schema.graphql')).toBeNull();
	});

	it('returns null on invalid GraphQL syntax', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue('query { !!! invalid');
		expect(parseGraphqlFile('/invalid.graphql')).toBeNull();
	});

	it('returns null when operation has no name', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue('query { foo }');
		expect(parseGraphqlFile('/unnamed.graphql')).toBeNull();
	});

	it('parses a simple query with variables', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			'query GetUser($id: ID!) {\n  user(id: $id) { name }\n}',
		);
		const result = parseGraphqlFile('/query.graphql');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('GetUser');
		expect(result!.type).toBe('query');
		expect(result!.variables).toEqual([{ name: 'id', type: 'ID!' }]);
		expect(result!.filePath).toBe('/query.graphql');
		expect(result!.document).toContain('GetUser');
	});

	it('parses a mutation with list variables', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			'mutation CreatePost($input: [PostInput!]!) {\n  createPost(input: $input) { id }\n}',
		);
		const result = parseGraphqlFile('/mutation.graphql');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('CreatePost');
		expect(result!.type).toBe('mutation');
		expect(result!.variables).toEqual([{ name: 'input', type: '[PostInput!]!' }]);
	});

	it('parses a subscription', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			'subscription OnMessage { message { text } }',
		);
		const result = parseGraphqlFile('/sub.graphql');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('OnMessage');
		expect(result!.type).toBe('subscription');
	});

	it('parses query without variables', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue('query Me { me { id name } }');
		const result = parseGraphqlFile('/me.graphql');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('Me');
		expect(result!.variables).toEqual([]);
	});
});

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

	it('generates with prefix and suffix', () => {
		const code = generateTypedDocumentsCode([baseOp], undefined, { prefix: 'Pre', suffix: 'Suf' });
		expect(code).toContain('PreGetItemsSuf');
	});

	it('generates import for schema types when provided as array', () => {
		const code = generateTypedDocumentsCode([baseOp], ['User', 'Post']);
		expect(code).toContain('import type {');
		expect(code).toContain('User,');
		expect(code).toContain('Post,');
		expect(code).toContain('from "../types"');
	});

	it('generates import for schema types when provided as string', () => {
		const code = generateTypedDocumentsCode([baseOp], 'export interface User { id: string }\nexport type Post = {};');
		expect(code).toContain('import type {');
		expect(code).toContain('User,');
		expect(code).toContain('Post,');
	});

	it('handles empty operations array', () => {
		const code = generateTypedDocumentsCode([]);
		expect(code).toContain('DO NOT EDIT');
		expect(code).not.toContain('export const');
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

	it('handles empty operations', () => {
		const code = generateIndexCode([]);
		expect(code).toContain('DO NOT EDIT');
	});

	it('generates for subscription type', () => {
		const ops = [
			{ name: 'OnMsg', type: 'subscription' as const, variables: [], document: 'subscription OnMsg { m }', filePath: '/s.graphql' },
		];
		const code = generateIndexCode(ops);
		expect(code).toContain('export { OnMsg } from "./OnMsg"');
	});
});
