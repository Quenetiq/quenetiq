import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { CacheStore } from '@quenetiq/cache';
import { QuenetiqProvider } from './provider';
import { useFragment } from './use-fragment';

type Book = { __typename: 'Book'; id: string; title: string };
const BOOK_FRAGMENT = { __key: 'BookFields' } as never;

function createWrapper(cache: CacheStore) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QuenetiqProvider client={{} as never} cache={cache}>{children}</QuenetiqProvider>;
  };
}

describe('useFragment', () => {
  it('returns data when entity exists in cache', () => {
    const cache = new CacheStore();
    cache.write({ __typename: 'Book', id: '1', title: 'Dune' });

    const { result } = renderHook(
      () => useFragment<Book>(BOOK_FRAGMENT, { __typename: 'Book', id: '1' }),
      { wrapper: createWrapper(cache) },
    );

    expect(result.current.data).toEqual({ __typename: 'Book', id: '1', title: 'Dune' });
    expect(result.current.complete).toBe(true);
  });

  it('returns null when entity is missing from cache', () => {
    const cache = new CacheStore();

    const { result } = renderHook(
      () => useFragment<Book>(BOOK_FRAGMENT, { __typename: 'Book', id: 'nonexistent' }),
      { wrapper: createWrapper(cache) },
    );

    expect(result.current.data).toBeNull();
    expect(result.current.complete).toBe(false);
  });

  it('returns null when identifier is null', () => {
    const cache = new CacheStore();

    const { result } = renderHook(
      () => useFragment<Book>(BOOK_FRAGMENT, null),
      { wrapper: createWrapper(cache) },
    );

    expect(result.current.data).toBeNull();
    expect(result.current.complete).toBe(false);
  });

  it('returns null when there is no cache in context', () => {
    const { result } = renderHook(
      () => useFragment<Book>(BOOK_FRAGMENT, { __typename: 'Book', id: '1' }),
    );

    expect(result.current.data).toBeNull();
    expect(result.current.complete).toBe(false);
  });

  it('reads correct entity by typename + id', () => {
    const cache = new CacheStore();
    cache.write({ __typename: 'Book', id: '1', title: 'Dune' });
    cache.write({ __typename: 'Book', id: '2', title: 'Neuromancer' });
    cache.write({ __typename: 'Author', id: '1', name: 'Frank Herbert' });

    const { result } = renderHook(
      () => useFragment<Book>(BOOK_FRAGMENT, { __typename: 'Book', id: '2' }),
      { wrapper: createWrapper(cache) },
    );

    expect(result.current.data?.title).toBe('Neuromancer');
  });
});
