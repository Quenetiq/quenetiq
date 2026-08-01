import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QuenetiqProvider } from './provider';
import { usePrefetch } from './use-prefetch';

const BOOK_QUERY = { __key: 'BookQuery' } as never;

function createWrapper(client: Record<string, unknown>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QuenetiqProvider client={client as never}>{children}</QuenetiqProvider>;
  };
}

describe('usePrefetch', () => {
  it('returns a prefetch function', () => {
    const client = { query: vi.fn(), refetch: vi.fn(), endpoint: '/graphql', getCacheService: vi.fn() } as never;
    const wrapper = createWrapper(client);

    const { result } = renderHook(() => usePrefetch(BOOK_QUERY), { wrapper });

    expect(typeof result.current).toBe('function');
  });

  it('calls client.query when prefetch function is invoked', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ status: 'success', data: { __typename: 'Book', id: '1', title: 'Dune' } }),
      refetch: vi.fn(),
      endpoint: '/graphql',
      getCacheService: vi.fn(),
    } as never;
    const wrapper = createWrapper(client);

    const { result } = renderHook(() => usePrefetch(BOOK_QUERY), { wrapper });

    await result.current({ id: '1' });

    expect(client.query).toHaveBeenCalledWith(BOOK_QUERY, { id: '1' });
  });

  it('returns the query result from the prefetch', async () => {
    const expected = { status: 'success', data: { __typename: 'Book', id: '1', title: 'Dune' } };
    const client = { query: vi.fn().mockResolvedValue(expected), refetch: vi.fn(), endpoint: '/graphql', getCacheService: vi.fn() } as never;
    const wrapper = createWrapper(client);

    const { result } = renderHook(() => usePrefetch(BOOK_QUERY), { wrapper });

    const res = await result.current({ id: '1' });
    expect(res).toEqual(expected);
  });

  it('memoizes the prefetch function (same reference across renders)', () => {
    const client = { query: vi.fn(), refetch: vi.fn(), endpoint: '/graphql', getCacheService: vi.fn() } as never;
    const wrapper = createWrapper(client);

    const { result, rerender } = renderHook(() => usePrefetch(BOOK_QUERY), { wrapper });
    const first = result.current;

    rerender();
    expect(result.current).toBe(first);
  });
});
