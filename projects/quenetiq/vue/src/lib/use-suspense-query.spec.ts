import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSuspenseQuery, useBackgroundQuery } from './use-suspense-query';

vi.mock('./plugin', () => ({
	useClient: vi.fn(),
}));

import { useClient } from './plugin';

const BOOK_QUERY = { __key: 'BookQuery' } as never;

describe('useSuspenseQuery (Vue)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('starts query immediately and returns loading ref', () => {
		const client = {
			query: vi
				.fn()
				.mockReturnValue(Promise.resolve({ status: 'success', data: { __typename: 'Book', id: '1', title: 'Dune' } })),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as any;
		vi.mocked(useClient).mockReturnValue(client);

		const result = useSuspenseQuery(BOOK_QUERY, { id: '1' } as any);

		expect(client.query).toHaveBeenCalledWith(BOOK_QUERY, { id: '1' });
		expect(result.loading.value).toBe(true);
		expect(result.data.value).toBeNull();
	});

	it('resolves data when query completes', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { __typename: 'Book', id: '1', title: 'Dune' } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as any;
		vi.mocked(useClient).mockReturnValue(client);

		const result = useSuspenseQuery(BOOK_QUERY);

		await result.promise;

		expect(result.loading.value).toBe(false);
		expect(result.data.value).toEqual({ __typename: 'Book', id: '1', title: 'Dune' });
	});

	it('sets error on query failure', async () => {
		const client = {
			query: vi
				.fn()
				.mockResolvedValue({ status: 'error', error: 'Network error', errorCode: 'NETWORK_ERROR', networkError: true }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as any;
		vi.mocked(useClient).mockReturnValue(client);

		const result = useSuspenseQuery(BOOK_QUERY);

		await result.promise;

		expect(result.loading.value).toBe(false);
		expect(result.error.value).toBe('Network error');
		expect(result.data.value).toBeNull();
	});

	it('exposes promise that resolves with data', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { title: 'Dune' } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as any;
		vi.mocked(useClient).mockReturnValue(client);

		const result = useSuspenseQuery(BOOK_QUERY);

		await expect(result.promise).resolves.toEqual({ title: 'Dune' });
	});
});

describe('useBackgroundQuery (Vue)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('starts query immediately and returns QueryRef with loading ref', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { title: 'Dune' } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as any;
		vi.mocked(useClient).mockReturnValue(client);

		const queryRef = useBackgroundQuery(BOOK_QUERY);

		expect(client.query).toHaveBeenCalledWith(BOOK_QUERY, undefined);
		expect(queryRef.loading.value).toBe(true);
		expect(queryRef.data.value).toBeNull();

		await new Promise((r) => setTimeout(r, 0));

		expect(queryRef.loading.value).toBe(false);
		expect(queryRef.data.value).toEqual({ title: 'Dune' });
	});

	it('sets error on query failure', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'error', error: 'Failed', errorCode: 'NETWORK_ERROR' }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as any;
		vi.mocked(useClient).mockReturnValue(client);

		const queryRef = useBackgroundQuery(BOOK_QUERY);

		await new Promise((r) => setTimeout(r, 0));

		expect(queryRef.loading.value).toBe(false);
		expect(queryRef.error.value).toBe('Failed');
	});

	it('refetch calls client.refetch and updates refs', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { title: 'Dune' } }),
			refetch: vi.fn().mockResolvedValue({ status: 'success', data: { title: 'Updated' } }),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as any;
		vi.mocked(useClient).mockReturnValue(client);

		const queryRef = useBackgroundQuery(BOOK_QUERY);
		await new Promise((r) => setTimeout(r, 0));

		const result = await queryRef.refetch();

		expect(client.refetch).toHaveBeenCalled();
		expect(queryRef.data.value).toEqual({ title: 'Updated' });
		expect(result).toEqual({ status: 'success', data: { title: 'Updated' } });
	});
});
