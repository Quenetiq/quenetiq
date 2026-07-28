import { describe, it, expect, vi } from 'vitest';
import { createMigrationGuide } from '../migration-guide';

describe('createMigrationGuide', () => {
	it('returns a non-empty map', () => {
		const guide = createMigrationGuide();
		expect(Object.keys(guide).length).toBeGreaterThan(0);
	});

	it('maps ApolloClient to QuenetiqClient', () => {
		const guide = createMigrationGuide();
		expect(guide['ApolloClient']).toContain('QuenetiqClient');
	});

	it('maps useQuery usage', () => {
		const guide = createMigrationGuide();
		expect(guide['useQuery(query, { variables })']).toContain('useQuery');
	});

	it('maps cache operations', () => {
		const guide = createMigrationGuide();
		expect(guide['cache.readQuery({ query, variables })']).toBeDefined();
		expect(guide['cache.evict({ id })']).toBeDefined();
		expect(guide['cache.gc()']).toBeDefined();
	});

	it('maps Apollo Link to middleware', () => {
		const guide = createMigrationGuide();
		expect(guide['Apollo Link']).toContain('Middleware');
	});

	it('maps provider', () => {
		const guide = createMigrationGuide();
		expect(guide['ApolloProvider']).toContain('QuenetiqProvider');
	});
});

describe('fromApolloCache', () => {
	it('creates adapter with query method', async () => {
		const { fromApolloCache } = await import('../from-apollo-cache');
		const mockApollo = {
			readQuery: vi.fn().mockReturnValue({ __typename: 'User', id: '1', name: 'Alice' }),
			writeQuery: vi.fn(),
			evict: vi.fn(),
			gc: vi.fn(),
			extract: vi.fn(),
			restore: vi.fn(),
		};

		const adapter = fromApolloCache(mockApollo);
		expect(adapter.query).toBeDefined();

		const result = adapter.query!('User', '1');
		expect(mockApollo.readQuery).toHaveBeenCalled();
		expect(result).toEqual({ __typename: 'User', id: '1', name: 'Alice' });
	});
});
