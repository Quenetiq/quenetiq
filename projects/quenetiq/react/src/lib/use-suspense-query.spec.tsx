import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QuenetiqProvider } from './provider';
import { useBackgroundQuery, useSuspenseQuery } from './use-suspense-query';

type Book = { __typename: 'Book'; id: string; title: string };
const BOOK_QUERY = { __key: 'BookQuery' } as never;

function createWrapper(client: Record<string, unknown>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QuenetiqProvider client={client as never}>{children}</QuenetiqProvider>;
  };
}

function createPendingClient() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<{ status: string; data?: Book; error?: string }>((r) => { resolve = r; });
  return { client: { query: vi.fn().mockReturnValue(promise), refetch: vi.fn(), endpoint: '/graphql', getCacheService: vi.fn() } as never, resolve, promise };
}

describe('useBackgroundQuery', () => {
  it('starts a query and returns a queryRef', () => {
    const client = { query: vi.fn().mockResolvedValue({ status: 'success', data: { __typename: 'Book', id: '1', title: 'Dune' } }), refetch: vi.fn(), endpoint: '/graphql', getCacheService: vi.fn() } as never;
    const wrapper = createWrapper(client);

    const { result } = renderHook(
      () => useBackgroundQuery<Book>(BOOK_QUERY, { variables: { id: '1' } }),
      { wrapper },
    );

    const [queryRef] = result.current;
    expect(queryRef).toBeDefined();
    expect(typeof queryRef.read).toBe('function');
    expect(typeof queryRef.refetch).toBe('function');
    expect(client.query).toHaveBeenCalledWith(BOOK_QUERY, { id: '1' });
  });

  it('queryRef.read() suspends while loading', async () => {
    const { client, promise } = createPendingClient();
    const wrapper = createWrapper(client);

    const { result } = renderHook(
      () => useBackgroundQuery<Book>(BOOK_QUERY),
      { wrapper },
    );

    const [queryRef] = result.current;

    let thrown: unknown = undefined;
    try { queryRef.read(); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(Promise);
  });

  it('queryRef.read() returns data after resolve', async () => {
    const { client, resolve, promise } = createPendingClient();
    const wrapper = createWrapper(client);

    const { result } = renderHook(
      () => useBackgroundQuery<Book>(BOOK_QUERY),
      { wrapper },
    );

    const [queryRef] = result.current;
    resolve({ status: 'success', data: { __typename: 'Book', id: '1', title: 'Dune' } });
    await promise;

    expect(queryRef.read()).toEqual({ __typename: 'Book', id: '1', title: 'Dune' });
  });

  it('queryRef.read() throws on error', async () => {
    const { client, resolve, promise } = createPendingClient();
    const wrapper = createWrapper(client);

    const { result } = renderHook(
      () => useBackgroundQuery<Book>(BOOK_QUERY),
      { wrapper },
    );

    const [queryRef] = result.current;
    resolve({ status: 'error', error: 'Network error' });
    await promise;

    expect(() => queryRef.read()).toThrow('Network error');
  });

  it('queryRef.refetch() re-executes the query', async () => {
    const client = { query: vi.fn().mockResolvedValue({ status: 'success', data: { __typename: 'Book', id: '1', title: 'Dune' } }), refetch: vi.fn().mockResolvedValue({ status: 'success', data: { __typename: 'Book', id: '1', title: 'Refetched' } }), endpoint: '/graphql', getCacheService: vi.fn() } as never;
    const wrapper = createWrapper(client);

    const { result } = renderHook(
      () => useBackgroundQuery<Book>(BOOK_QUERY),
      { wrapper },
    );

    const [queryRef] = result.current;
    const res = await queryRef.refetch();
    expect(client.refetch).toHaveBeenCalled();
  });
});

describe('useSuspenseQuery', () => {
  it('starts query immediately', () => {
    const client = { query: vi.fn().mockReturnValue(new Promise(() => {})), refetch: vi.fn(), endpoint: '/graphql', getCacheService: vi.fn() } as never;
    const wrapper = createWrapper(client);

    try {
      renderHook(() => useSuspenseQuery<Book>(BOOK_QUERY), { wrapper });
    } catch {
      // react may or may not propagate the Suspense promise through renderHook
    }

    expect(client.query).toHaveBeenCalledWith(BOOK_QUERY, undefined);
  });
});
