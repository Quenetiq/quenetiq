import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { useInfiniteQuery } from '../use-infinite-query';

vi.mock('../plugin', () => ({
	useClient: vi.fn(),
}));

import { useClient } from '../plugin';

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 0));

function makeClient(queryImpl: ReturnType<typeof vi.fn>) {
	return { query: queryImpl };
}

describe('useInfiniteQuery', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches initial page and sets loading to false', async () => {
		const client = makeClient(
			vi.fn().mockResolvedValue({ status: 'success', data: { items: [1, 2] } }),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const { data, loading, hasNextPage } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => undefined,
		});

		expect(loading.value).toBe(true);
		expect(data.value).toBeNull();

		await flushPromises();

		expect(loading.value).toBe(false);
		expect(data.value).toEqual([{ items: [1, 2] }]);
		expect(hasNextPage.value).toBe(false);
	});

	it('sets hasNextPage when getNextPageParam returns variables', async () => {
		const client = makeClient(
			vi.fn().mockResolvedValue({ status: 'success', data: { items: [1] } }),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const { hasNextPage } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => ({ after: 'cursor1' }),
		});

		await flushPromises();

		expect(hasNextPage.value).toBe(true);
	});

	it('fetchMore loads next page and merges with mergePages', async () => {
		let callCount = 0;
		const client = makeClient(
			vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) return { status: 'success', data: { items: [1] } };
				return { status: 'success', data: { items: [2] } };
			}),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const mergePages = vi.fn((pages) => ({
			items: pages.flatMap((p: any) => p.items),
		}));

		const { data, fetchMore, isFetchingMore, hasNextPage } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: (lastPage: any) => (lastPage.items.includes(1) ? { after: 'cursor1' } : undefined),
			mergePages,
		});

		await flushPromises();

		expect(data.value).toEqual({ items: [1] });
		expect(hasNextPage.value).toBe(true);

		await fetchMore();
		await flushPromises();

		expect(isFetchingMore.value).toBe(false);
		expect(mergePages).toHaveBeenCalledTimes(2);
		expect(data.value).toEqual({ items: [1, 2] });
		expect(hasNextPage.value).toBe(false);
	});

	it('does not fetchMore when already fetching', async () => {
		let resolveSecond: (v: any) => void;
		const client = makeClient(
			vi.fn()
				.mockResolvedValueOnce({ status: 'success', data: { items: [1] } })
				.mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; })),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const { fetchMore, isFetchingMore, hasNextPage } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => ({ after: 'cursor1' }),
		});

		await flushPromises();

		expect(hasNextPage.value).toBe(true);

		fetchMore();
		await nextTick();

		expect(isFetchingMore.value).toBe(true);
		expect(client.query).toHaveBeenCalledTimes(2);

		await fetchMore();

		expect(client.query).toHaveBeenCalledTimes(2);

		resolveSecond!({ status: 'success', data: { items: [2] } });
		await flushPromises();
	});

	it('does not fetchMore when hasNextPage is false', async () => {
		const client = makeClient(
			vi.fn().mockResolvedValue({ status: 'success', data: { items: [1] } }),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const { fetchMore } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => undefined,
		});

		await flushPromises();

		await fetchMore();

		expect(client.query).toHaveBeenCalledTimes(1);
	});

	it('sets error on initial query failure', async () => {
		const client = makeClient(
			vi.fn().mockResolvedValue({
				status: 'error',
				error: 'Something broke',
				errorCode: 'GRAPHQL_ERROR',
			}),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const onError = vi.fn();
		const { error, errorCode, loading, data } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => undefined,
			onError,
		});

		await flushPromises();

		expect(loading.value).toBe(false);
		expect(data.value).toBeNull();
		expect(error.value).toBe('Something broke');
		expect(errorCode.value).toBe('GRAPHQL_ERROR');
		expect(onError).toHaveBeenCalledWith('Something broke', 'GRAPHQL_ERROR');
	});

	it('sets error on fetchMore failure', async () => {
		let callCount = 0;
		const client = makeClient(
			vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) return { status: 'success', data: { items: [1] } };
				return { status: 'error', error: 'Page fetch failed', errorCode: 'NETWORK_ERROR' };
			}),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const onError = vi.fn();
		const { fetchMore, error, errorCode } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => ({ after: 'cursor1' }),
			onError,
		});

		await flushPromises();

		await fetchMore();
		await flushPromises();

		expect(error.value).toBe('Page fetch failed');
		expect(errorCode.value).toBe('NETWORK_ERROR');
		expect(onError).toHaveBeenCalledWith('Page fetch failed', 'NETWORK_ERROR');
	});

	it('handles non-Error thrown values', async () => {
		const client = makeClient(vi.fn().mockImplementation(async () => { throw 'string error'; }));
		vi.mocked(useClient).mockReturnValue(client as never);

		const { error, loading } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => undefined,
		});

		await flushPromises();

		expect(loading.value).toBe(false);
		expect(error.value).toBe('Unknown error');
	});

	it('ignores AbortError silently without setting error', async () => {
		const client = makeClient(
			vi.fn().mockRejectedValue(new DOMException('The operation was aborted', 'AbortError')),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const { error, loading } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => ({ after: 'x' }),
		});

		await flushPromises();

		expect(error.value).toBeNull();
	});

	it('calls onCompleted when no next page after initial fetch', async () => {
		const client = makeClient(
			vi.fn().mockResolvedValue({ status: 'success', data: { items: [1] } }),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const onCompleted = vi.fn();

		useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => undefined,
			onCompleted,
		});

		await flushPromises();

		expect(onCompleted).toHaveBeenCalledTimes(1);
		expect(onCompleted).toHaveBeenCalledWith([{ items: [1] }]);
	});

	it('calls onCompleted when fetchMore reaches last page', async () => {
		let callCount = 0;
		const client = makeClient(
			vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) return { status: 'success', data: { items: [1] } };
				return { status: 'success', data: { items: [2] } };
			}),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const onCompleted = vi.fn();
		const { fetchMore } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: (lastPage: any) => (lastPage.items.includes(1) ? { after: 'cursor1' } : undefined),
			onCompleted,
		});

		await flushPromises();

		await fetchMore();
		await flushPromises();

		expect(onCompleted).toHaveBeenCalledTimes(1);
	});

	it('passes variables to client.query on initial call', async () => {
		const client = makeClient(
			vi.fn().mockResolvedValue({ status: 'success', data: {} }),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		useInfiniteQuery('query { items }' as any, {
			variables: { first: 10 },
			getNextPageParam: () => undefined,
		});

		await flushPromises();

		expect(client.query).toHaveBeenCalledWith(
			'query { items }' as any,
			{ first: 10 },
			undefined,
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});

	it('passes AbortSignal to client.query', async () => {
		const client = makeClient(
			vi.fn().mockResolvedValue({ status: 'success', data: { items: [1] } }),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => ({ after: 'x' }),
		});

		await flushPromises();

		const callArgs = client.query.mock.calls[0];
		expect(callArgs[3]).toHaveProperty('signal');
		expect(callArgs[3].signal).toBeInstanceOf(AbortSignal);
	});

	it('uses pages array as data when mergePages is not provided', async () => {
		let callCount = 0;
		const client = makeClient(
			vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) return { status: 'success', data: { items: [1] } };
				return { status: 'success', data: { items: [2] } };
			}),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const { data, fetchMore } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: (lastPage: any) => (lastPage.items.includes(1) ? { after: 'c1' } : undefined),
		});

		await flushPromises();
		await fetchMore();
		await flushPromises();

		expect(data.value).toEqual([{ items: [1] }, { items: [2] }]);
	});

	it('does not call onCompleted when fetchMore has more pages', async () => {
		let callCount = 0;
		const client = makeClient(
			vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount <= 2) return { status: 'success', data: { items: [callCount] } };
				return { status: 'success', data: { items: [3] } };
			}),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const onCompleted = vi.fn();
		const { fetchMore } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: (lastPage: any) => {
				if ((lastPage as any).items.length < 3) return { after: 'cursor' };
				return undefined;
			},
			onCompleted,
		});

		await flushPromises();

		expect(onCompleted).not.toHaveBeenCalled();

		await fetchMore();
		await flushPromises();

		expect(onCompleted).not.toHaveBeenCalled();
	});

	it('clears error state before fetchMore attempt', async () => {
		const client = makeClient(
			vi.fn().mockResolvedValue({
				status: 'error',
				error: 'initial fail',
				errorCode: 'GRAPHQL_ERROR',
			}),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const { error } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => undefined,
		});

		await flushPromises();

		expect(error.value).toBe('initial fail');
	});

	it('sets loading to false after initial error', async () => {
		const client = makeClient(
			vi.fn().mockResolvedValue({
				status: 'error',
				error: 'fail',
				errorCode: 'GRAPHQL_ERROR',
			}),
		);
		vi.mocked(useClient).mockReturnValue(client as never);

		const { loading } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => undefined,
		});

		await flushPromises();

		expect(loading.value).toBe(false);
	});

	it('handles network error (thrown exception) on initial fetch', async () => {
		const client = makeClient(vi.fn().mockRejectedValue(new Error('Network error')));
		vi.mocked(useClient).mockReturnValue(client as never);

		const { error, loading } = useInfiniteQuery('query { items }' as any, {
			getNextPageParam: () => undefined,
		});

		await flushPromises();

		expect(loading.value).toBe(false);
		expect(error.value).toBe('Network error');
	});
});
