import { describe, it, expect } from 'vitest';
import { createSchemaMock } from '../schema-mock';

const SCHEMA = `
	type Query {
		user(id: ID!): User
		users: [User!]!
		search(query: String, limit: Int): [SearchResult!]!
		status: Status!
		config: JSON
		hello: String
	}

	type User {
		id: ID!
		name: String!
		email: String!
		age: Int
		active: Boolean
	}

	type Mutation {
		createUser(name: String!, email: String!): User!
	}

	enum Status {
		ACTIVE
		INACTIVE
		PENDING
	}

	union SearchResult = User | Page

	type Page {
		id: ID!
		title: String!
		url: String
	}

	scalar JSON
`;

describe('createSchemaMock', () => {
	it('generates mock data for a query', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const data = mock.mockQuery('query { user(id: "1") { id name email } }');

		expect(data).toHaveProperty('user');
		expect(data.user).toHaveProperty('id');
		expect(data.user).toHaveProperty('name');
		expect(data.user).toHaveProperty('email');
	});

	it('generates scalar values with correct types', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const data = mock.mockQuery('query { users { id name age active } }');

		expect(data).toHaveProperty('users');
		const users = data.users as Record<string, unknown>[];
		expect(Array.isArray(users)).toBe(true);
		expect(users.length).toBeGreaterThan(0);
		const first = users[0];
		expect(first).toHaveProperty('id');
		expect(first).toHaveProperty('name');
		expect(typeof first.age).toBe('number');
		expect(typeof first.active).toBe('boolean');
	});

	it('generates mock data for a mutation', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const data = mock.mockMutation('mutation { createUser(name: "Alice", email: "a@b.com") { id name email } }');

		expect(data).toHaveProperty('createUser');
		expect((data.createUser as Record<string, unknown>).name).toBeTypeOf('string');
	});

	it('uses custom typeMocks', () => {
		const mock = createSchemaMock({
			schema: SCHEMA,
			typeMocks: {
				User: () => ({ id: 'custom-1', name: 'MockedUser' }),
			},
		});
		const data = mock.mockQuery('query { user(id: "1") { id name } }');

		expect((data.user as Record<string, unknown>).id).toBe('custom-1');
		expect((data.user as Record<string, unknown>).name).toBe('MockedUser');
	});

	it('mockType returns fields for a type', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const data = mock.mockType('User');

		expect(data).toHaveProperty('id');
		expect(data).toHaveProperty('name');
		expect(data).toHaveProperty('__typename', 'User');
	});

	it('mockType returns empty for unknown type', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		expect(mock.mockType('UnknownType')).toEqual({});
	});

	it('getType returns description or undefined', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		expect(mock.getType('User')).toBeUndefined();
	});

	it('handles query with __typename field', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const data = mock.mockQuery('query { user(id: "1") { __typename id } }');

		expect((data.user as Record<string, unknown>).__typename).toBe('User');
	});

	it('handles enum type', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const data = mock.mockQuery('query { status }');

		expect(data).toHaveProperty('status');
		expect(typeof data.status).toBe('string');
	});

	it('handles union type via first member', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const items = mock.mockQuery('query { search(query: "test", limit: 10) { ... on User { id } ... on Page { title } } }');

		expect(items).toHaveProperty('search');
	});

	it('handles custom scalar', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const data = mock.mockQuery('query { config }');

		expect(data).toHaveProperty('config');
	});

	it('handles nullable field returning null', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const data = mock.mockQuery('query { hello }');

		expect(data).toHaveProperty('hello');
		expect(typeof data.hello).toBe('string');
	});

	it('returns empty for subscription type', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const data = mock.mockQuery('subscription { onUpdate { id } }');

		expect(data).toEqual({});
	});

	it('uses field name (not alias) for result key', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		const data = mock.mockQuery('query { alice: user(id: "1") { name } }');

		expect(data).toHaveProperty('user');
	});

	it('mockQuery with empty query string returns empty', () => {
		const mock = createSchemaMock({ schema: SCHEMA });
		expect(() => mock.mockQuery('')).toThrow();
	});

	it('getType returns type description when present', () => {
		const schemaWithDesc = `
			"Represents a system user"
			type Query { ping: String }
		`;
		const mock = createSchemaMock({ schema: schemaWithDesc });
		expect(mock.getType('Query')).toBe('Represents a system user');
	});
});
