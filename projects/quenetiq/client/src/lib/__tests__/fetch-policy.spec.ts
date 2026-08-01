import { describe, it, expect, vi, afterEach } from 'vitest';
import { CacheStore } from '@quenetiq/cache';
import { QuenetiqClient } from '../client';
import { gql } from '../gql';

function mockFetchOk(data: unknown) {
	return vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: vi.fn().mockResolvedValue({ data }),
		headers: new Headers(),
	});
}

const QUERY = gql`query TypeCheckQuery { __typename }`;

describe('QuenetiqClient fetchPolicy', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('cache-first returns cached data on second call', async () => {
		vi.stubGlobal('fetch', mockFetchOk({ __typename: 'Query' }));
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);

		await client.query(QUERY, undefined, undefined, { fetchPolicy: 'cache-first' });
		expect(fetch).toHaveBeenCalledTimes(1);

		await client.query(QUERY, undefined, undefined, { fetchPolicy: 'cache-first' });
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('network-only always fetches from network', async () => {
		vi.stubGlobal('fetch', mockFetchOk({ __typename: 'Query' }));
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);

		await client.query(QUERY, undefined, undefined, { fetchPolicy: 'network-only' });
		expect(fetch).toHaveBeenCalledTimes(1);

		await client.query(QUERY, undefined, undefined, { fetchPolicy: 'network-only' });
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('no-cache skips cache entirely', async () => {
		vi.stubGlobal('fetch', mockFetchOk({ __typename: 'Query' }));
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);

		await client.query(QUERY, undefined, undefined, { fetchPolicy: 'no-cache' });
		expect(fetch).toHaveBeenCalledTimes(1);

		const queryHash = `query:${JSON.stringify(QUERY)}|${JSON.stringify(undefined)}`;
		const cached = cache.readLocal(queryHash);
		expect(cached).toBeUndefined();
	});

	it('cache-and-network fetches from network', async () => {
		vi.stubGlobal('fetch', mockFetchOk({ __typename: 'Query' }));
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);

		const result = await client.query(QUERY, undefined, undefined, { fetchPolicy: 'cache-and-network' });
		expect(result.status).toBe('success');
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('defaults to cache-first when no fetchPolicy specified', async () => {
		vi.stubGlobal('fetch', mockFetchOk({ __typename: 'Query' }));
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);

		await client.query(QUERY);
		expect(fetch).toHaveBeenCalledTimes(1);

		await client.query(QUERY);
		expect(fetch).toHaveBeenCalledTimes(1);
	});
});
