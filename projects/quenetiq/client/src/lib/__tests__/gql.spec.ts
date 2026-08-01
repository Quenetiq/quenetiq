import { describe, it, expect } from 'vitest';
import { gql } from '../gql';

describe('gql (client)', () => {
	it('parses a simple query', () => {
		const doc = gql`
			query SimpleQuery {
				hello
			}
		`;
		expect(doc.kind).toBe('Document');
		expect(doc.definitions).toHaveLength(1);
	});

	it('parses a mutation', () => {
		const doc = gql`
			mutation AddFoo {
				addFoo {
					id
				}
			}
		`;
		expect(doc.definitions[0].kind).toBe('OperationDefinition');
	});

	it('interpolates values', () => {
		const field = 'name';
		const doc = gql`query { ${field} }`;
		expect(doc).toBeDefined();
	});

	it('throws on invalid input', () => {
		// eslint-disable-next-line quenetiq/gql-parse
		expect(() => gql`not a query`).toThrow();
	});
});
