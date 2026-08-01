import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QuenetiqClient } from '@quenetiq/client';
import { useInfiniteQuery } from '../use-infinite-query';
import { QuenetiqProvider } from '../provider';

function wrapper(client: QuenetiqClient) {
  return ({ children }: { children: React.ReactNode }) =>
    <QuenetiqProvider client={client}>{children}</QuenetiqProvider>;
}

describe('useInfiniteQuery', () => {
	it('loads initial page and exposes data', async () => {
		const client = new QuenetiqClient({ endpoint: '/graphql' });
		client.query = vi.fn().mockResolvedValue({
			status: 'success',
			data: { users: [{ id: '1', name: 'Alice' }], pageInfo: { endCursor: 'cursor-1', hasNextPage: true } },
		});

		const { result } = renderHook(
			() => useInfiniteQuery('query { users { id name } }' as any, {
				variables: { first: 10 },
				getNextPageParam: (lastPage: any) =>
					lastPage.pageInfo.hasNextPage ? { first: 10, after: lastPage.pageInfo.endCursor } : undefined,
				mergePages: (pages: any[]) => pages.flatMap((p) => p.users),
			}),
			{ wrapper: wrapper(client) },
		);

		expect(result.current.loading).toBe(true);

		await act(async () => {
			await new Promise((r) => setTimeout(r, 10));
		});

		expect(result.current.loading).toBe(false);
		expect(result.current.data).toEqual([{ id: '1', name: 'Alice' }]);
		expect(result.current.hasNextPage).toBe(true);
		expect(result.current.error).toBeNull();
	});

  it('fetchMore loads next page and merges', async () => {
    let callCount = 0;
    const client = new QuenetiqClient({ endpoint: '/graphql' });
    client.query = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          status: 'success',
          data: { users: [{ id: '1', name: 'Alice' }], pageInfo: { endCursor: 'cursor-1', hasNextPage: true } },
        });
      }
      return Promise.resolve({
        status: 'success',
        data: { users: [{ id: '2', name: 'Bob' }], pageInfo: { endCursor: 'cursor-2', hasNextPage: false } },
      });
    });

    const { result } = renderHook(
      () => useInfiniteQuery('query { users { id name } }' as any, {
        variables: { first: 10 },
        getNextPageParam: (lastPage: any) =>
          lastPage.pageInfo.hasNextPage ? { first: 10, after: lastPage.pageInfo.endCursor } : undefined,
        mergePages: (pages: any[]) => pages.flatMap((p) => p.users),
      }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.data).toEqual([{ id: '1', name: 'Alice' }]);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchMore();
    });

    expect(result.current.data).toEqual([{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.isFetchingMore).toBe(false);
  });

	it('sets hasNextPage to false when no cursor returned', async () => {
		const client = new QuenetiqClient({ endpoint: '/graphql' });
		client.query = vi.fn().mockResolvedValue({
			status: 'success',
			data: { users: [{ id: '1', name: 'Alice' }], pageInfo: { hasNextPage: false } },
		});

		const { result } = renderHook(
			() => useInfiniteQuery('query { users { id name } }' as any, {
				getNextPageParam: () => undefined,
				mergePages: (pages: any[]) => pages.flatMap((p) => p.users),
			}),
			{ wrapper: wrapper(client) },
		);

		await act(async () => {
			await new Promise((r) => setTimeout(r, 10));
		});

		expect(result.current.hasNextPage).toBe(false);
		expect(result.current.data).toEqual([{ id: '1', name: 'Alice' }]);
	});

  it('handles initial query error', async () => {
    const client = new QuenetiqClient({ endpoint: '/graphql' });
    client.query = vi.fn().mockResolvedValue({
      status: 'error',
      error: 'Query failed',
      errorCode: 'GRAPHQL_ERROR',
    });

    const onError = vi.fn();
    const { result } = renderHook(
      () => useInfiniteQuery('query { users { id name } }' as any, {
        getNextPageParam: () => undefined,
        onError,
      }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.error).toBe('Query failed');
    expect(result.current.errorCode).toBe('GRAPHQL_ERROR');
    expect(result.current.loading).toBe(false);
    expect(onError).toHaveBeenCalledWith('Query failed', 'GRAPHQL_ERROR');
  });

  it('handles fetchMore error', async () => {
    let callCount = 0;
    const client = new QuenetiqClient({ endpoint: '/graphql' });
    client.query = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          status: 'success',
          data: { users: [{ id: '1', name: 'Alice' }], pageInfo: { endCursor: 'cursor-1', hasNextPage: true } },
        });
      }
      return Promise.resolve({
        status: 'error',
        error: 'Network error',
        errorCode: 'NETWORK_ERROR',
      });
    });

    const onError = vi.fn();
    const { result } = renderHook(
      () => useInfiniteQuery('query { users { id name } }' as any, {
        variables: { first: 10 },
        getNextPageParam: (lastPage: any) =>
          lastPage.pageInfo.hasNextPage ? { first: 10, after: lastPage.pageInfo.endCursor } : undefined,
        onError,
      }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      await result.current.fetchMore();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.errorCode).toBe('NETWORK_ERROR');
    expect(result.current.isFetchingMore).toBe(false);
    expect(onError).toHaveBeenCalledWith('Network error', 'NETWORK_ERROR');
  });

  it('does not fetchMore when already fetching', async () => {
    const client = new QuenetiqClient({ endpoint: '/graphql' });
    client.query = vi.fn().mockResolvedValue({
      status: 'success',
      data: { users: [{ id: '1', name: 'Alice' }], pageInfo: { endCursor: 'cursor-1', hasNextPage: true } },
    });

    const { result } = renderHook(
      () => useInfiniteQuery('query { users { id name } }' as any, {
        getNextPageParam: (lastPage: any) =>
          lastPage.pageInfo.hasNextPage ? { first: 10, after: lastPage.pageInfo.endCursor } : undefined,
      }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Start first fetchMore
    act(() => { result.current.fetchMore(); });
    expect(result.current.isFetchingMore).toBe(true);

    // Second call should be no-op
    act(() => { result.current.fetchMore(); });

    // Only 2 calls: initial + first fetchMore
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
