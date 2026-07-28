import { describe, it, expect } from 'vitest';
import { parseFieldTree, buildMutationChart, normalizeData, groupEntities } from '../deep-inspection';
import type { GraphqlDebugEntry } from '../graphql-debug.service';

describe('parseFieldTree', () => {
	it('parses simple query', () => {
		const tree = parseFieldTree('query {\n  user {\n    name\n    email\n  }\n}');
		expect(tree.length).toBeGreaterThan(0);
		const user = tree.find((f) => f.name === 'user');
		expect(user).toBeDefined();
		expect(user!.children).toBeDefined();
		expect(user!.children!.some((c) => c.name === 'name')).toBe(true);
		expect(user!.children!.some((c) => c.name === 'email')).toBe(true);
	});

	it('parses nested fields', () => {
		const tree = parseFieldTree('{\n  user {\n    posts {\n      title\n      comments {\n        text\n      }\n    }\n  }\n}');
		const user = tree.find((f) => f.name === 'user');
		expect(user).toBeDefined();
		const posts = user!.children!.find((c) => c.name === 'posts');
		expect(posts).toBeDefined();
		const title = posts!.children!.find((c) => c.name === 'title');
		expect(title).toBeDefined();
	});

	it('returns empty for empty query', () => {
		expect(parseFieldTree('')).toEqual([]);
	});

	it('skips keywords', () => {
		const tree = parseFieldTree('query GetUser {\n  user {\n    name\n  }\n}');
		expect(tree.some((f) => f.name === 'query')).toBe(false);
		expect(tree.some((f) => f.name === 'GetUser')).toBe(false);
	});

	it('handles comments', () => {
		const tree = parseFieldTree('{\n  user {\n    name # this is a comment\n    email\n  }\n}');
		expect(tree.length).toBeGreaterThan(0);
	});

	it('handles leaf fields on separate lines', () => {
		const tree = parseFieldTree('{\n  user {\n    name\n    email\n  }\n}');
		const user = tree.find((f) => f.name === 'user');
		const names = user!.children!.map((c) => c.name);
		expect(names).toContain('name');
		expect(names).toContain('email');
	});
});

describe('buildMutationChart', () => {
	it('returns empty for no entries', () => {
		expect(buildMutationChart([])).toEqual([]);
	});

	it('builds chart from entries', () => {
		const entries: GraphqlDebugEntry[] = [
			{
				type: 'query',
				document: 'query { user }',
				timestamp: 1000,
				duration: 50,
				result: { status: 'success', data: {} },
				operationName: 'GetUser',
			},
			{
				type: 'mutate',
				document: 'mutation { createUser }',
				timestamp: 1100,
				duration: 30,
				result: { status: 'error', error: 'fail' },
				operationName: 'CreateUser',
			},
		];

		const chart = buildMutationChart(entries);
		expect(chart).toHaveLength(2);
		expect(chart[0].label).toBe('GetUser');
		expect(chart[0].ok).toBe(true);
		expect(chart[0].duration).toBe(50);
		expect(chart[1].label).toBe('CreateUser');
		expect(chart[1].ok).toBe(false);
	});

	it('normalizes timestamps relative to first entry', () => {
		const entries: GraphqlDebugEntry[] = [
			{ type: 'query', document: '', timestamp: 5000, duration: 10, result: { status: 'success', data: {} } },
			{ type: 'query', document: '', timestamp: 5100, duration: 20, result: { status: 'success', data: {} } },
		];
		const chart = buildMutationChart(entries);
		expect(chart[0].start).toBe(0);
		expect(chart[1].start).toBe(100);
	});

	it('uses anonymous label when no operationName', () => {
		const entries: GraphqlDebugEntry[] = [
			{ type: 'query', document: '', timestamp: 0, duration: 5, result: { status: 'success', data: {} } },
		];
		const chart = buildMutationChart(entries);
		expect(chart[0].label).toBe('(anonymous)');
	});
});

describe('normalizeData', () => {
	it('returns empty for null/undefined', () => {
		expect(normalizeData(null)).toEqual([]);
		expect(normalizeData(undefined)).toEqual([]);
	});

	it('extracts entities with __typename and id', () => {
		const data = { __typename: 'User', id: '1', name: 'Alice' };
		const entities = normalizeData(data);
		expect(entities).toHaveLength(1);
		expect(entities[0].type).toBe('User');
		expect(entities[0].id).toBe('1');
		expect(entities[0].path).toBe('.');
	});

	it('extracts nested entities', () => {
		const data = {
			user: { __typename: 'User', id: '1', name: 'Alice' },
		};
		const entities = normalizeData(data);
		expect(entities).toHaveLength(1);
		const user = entities.find((e) => e.type === 'User');
		expect(user).toBeDefined();
		expect(user!.path).toBe('user');
	});

	it('extracts entities from arrays', () => {
		const data = {
			users: [
				{ __typename: 'User', id: '1' },
				{ __typename: 'User', id: '2' },
			],
		};
		const entities = normalizeData(data);
		expect(entities).toHaveLength(2);
		expect(entities[0].path).toBe('users[0]');
		expect(entities[1].path).toBe('users[1]');
	});

	it('skips entities without __typename', () => {
		const data = { id: '1', name: 'Alice' };
		expect(normalizeData(data)).toEqual([]);
	});

	it('uses _id as fallback', () => {
		const data = { __typename: 'Post', _id: 'abc' };
		const entities = normalizeData(data);
		expect(entities[0].id).toBe('abc');
	});
});

describe('groupEntities', () => {
	it('groups by type', () => {
		const entries = [
			{ type: 'User', id: '1', path: '.' },
			{ type: 'Post', id: '1', path: '.' },
			{ type: 'User', id: '2', path: '.' },
		];
		const groups = groupEntities(entries);
		expect(Object.keys(groups)).toEqual(expect.arrayContaining(['User', 'Post']));
		expect(groups['User']).toHaveLength(2);
		expect(groups['Post']).toHaveLength(1);
	});

	it('returns empty object for empty input', () => {
		expect(groupEntities([])).toEqual({});
	});
});
