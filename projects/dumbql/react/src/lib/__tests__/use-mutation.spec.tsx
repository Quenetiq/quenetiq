import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CacheStore } from '@dumbql/cache';
import { DumbqlClient } from '@dumbql/client';
import { useMutation } from '../use-mutation';
import { DumbqlProvider } from '../provider';

function wrapper(client: DumbqlClient, cache?: CacheStore) {
  return ({ children }: { children: React.ReactNode }) =>
    <DumbqlProvider client={client} cache={cache}>{children}</DumbqlProvider>;
}

describe('useMutation optimistic', () => {
  it('calls optimistic callback with cache before mutation', async () => {
    const cache = { commitOptimistic: vi.fn(), rollbackOptimistic: vi.fn() } as unknown as CacheStore;
    const client = new DumbqlClient({ endpoint: '/graphql' });
    client.mutate = vi.fn().mockResolvedValue({ status: 'success', data: { x: 1 } });

    const optimistic = vi.fn().mockReturnValue('opt-1');
    const { result } = renderHook(
      () => useMutation('mutation { x }' as any, { optimistic }),
      { wrapper: wrapper(client, cache) },
    );

    await act(async () => {
      await result.current.mutate();
    });

    expect(optimistic).toHaveBeenCalledWith(cache);
  });

  it('commits optimistic on success', async () => {
    const cache = { commitOptimistic: vi.fn(), rollbackOptimistic: vi.fn() } as unknown as CacheStore;
    const client = new DumbqlClient({ endpoint: '/graphql' });
    client.mutate = vi.fn().mockResolvedValue({ status: 'success', data: { x: 1 } });

    const { result } = renderHook(
      () => useMutation('mutation { x }' as any, { optimistic: () => 'opt-1' }),
      { wrapper: wrapper(client, cache) },
    );

    await act(async () => {
      await result.current.mutate();
    });

    expect(cache.commitOptimistic).toHaveBeenCalledWith('opt-1');
    expect(cache.rollbackOptimistic).not.toHaveBeenCalled();
  });

  it('rolls back optimistic on error', async () => {
    const cache = { commitOptimistic: vi.fn(), rollbackOptimistic: vi.fn() } as unknown as CacheStore;
    const client = new DumbqlClient({ endpoint: '/graphql' });
    client.mutate = vi.fn().mockResolvedValue({ status: 'error', error: 'fail', errorCode: 'GRAPHQL_ERROR' });

    const { result } = renderHook(
      () => useMutation('mutation { x }' as any, { optimistic: () => 'opt-2' }),
      { wrapper: wrapper(client, cache) },
    );

    await act(async () => {
      await result.current.mutate();
    });

    expect(cache.rollbackOptimistic).toHaveBeenCalledWith('opt-2');
    expect(cache.commitOptimistic).not.toHaveBeenCalled();
  });

  it('does nothing with optimistic when no cache', async () => {
    const client = new DumbqlClient({ endpoint: '/graphql' });
    client.mutate = vi.fn().mockResolvedValue({ status: 'success', data: { x: 1 } });

    const optimistic = vi.fn().mockReturnValue('opt-1');
    const { result } = renderHook(
      () => useMutation('mutation { x }' as any, { optimistic }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await result.current.mutate();
    });

    expect(optimistic).not.toHaveBeenCalled();
  });
});

describe('useMutation optimisticResponse', () => {
  it('applies optimisticResponse via cache.applyOptimistic', async () => {
    const cache = {
      applyOptimistic: vi.fn(),
      commitOptimistic: vi.fn(),
      rollbackOptimistic: vi.fn(),
    } as unknown as CacheStore;
    const client = new DumbqlClient({ endpoint: '/graphql' });
    client.mutate = vi.fn().mockResolvedValue({ status: 'success', data: { createUser: { __typename: 'User', id: '1', name: 'Alice' } } });

    const optimisticResponse = { createUser: { __typename: 'User', id: '1', name: 'Optimistic' } };
    const { result } = renderHook(
      () => useMutation('mutation { createUser { id name } }' as any, { optimisticResponse }),
      { wrapper: wrapper(client, cache) },
    );

    await act(async () => {
      await result.current.mutate();
    });

    expect(cache.applyOptimistic).toHaveBeenCalledTimes(1);
    expect(cache.applyOptimistic).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.stringContaining('optimistic:') }),
    );
    expect(cache.commitOptimistic).toHaveBeenCalledTimes(1);
    expect(cache.commitOptimistic).toHaveBeenCalledWith(
      expect.stringContaining('optimistic:'),
    );
  });

  it('rolls back optimisticResponse on error', async () => {
    const cache = {
      applyOptimistic: vi.fn(),
      commitOptimistic: vi.fn(),
      rollbackOptimistic: vi.fn(),
    } as unknown as CacheStore;
    const client = new DumbqlClient({ endpoint: '/graphql' });
    client.mutate = vi.fn().mockResolvedValue({ status: 'error', error: 'fail', errorCode: 'GRAPHQL_ERROR' });

    const optimisticResponse = { createUser: { __typename: 'User', id: '1', name: 'Optimistic' } };
    const { result } = renderHook(
      () => useMutation('mutation { createUser { id name } }' as any, { optimisticResponse }),
      { wrapper: wrapper(client, cache) },
    );

    await act(async () => {
      await result.current.mutate();
    });

    expect(cache.applyOptimistic).toHaveBeenCalledTimes(1);
    expect(cache.commitOptimistic).not.toHaveBeenCalled();
    expect(cache.rollbackOptimistic).toHaveBeenCalledTimes(1);
    expect(cache.rollbackOptimistic).toHaveBeenCalledWith(
      expect.stringContaining('optimistic:'),
    );
  });

  it('does not apply optimisticResponse when no cache', async () => {
    const client = new DumbqlClient({ endpoint: '/graphql' });
    client.mutate = vi.fn().mockResolvedValue({ status: 'success', data: { x: 1 } });

    const optimisticResponse = { createUser: { __typename: 'User', id: '1', name: 'Optimistic' } };
    const { result } = renderHook(
      () => useMutation('mutation { x }' as any, { optimisticResponse }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await result.current.mutate();
    });

    expect(result.current.data).toEqual({ x: 1 });
  });

  it('prefers callback optimistic over optimisticResponse', async () => {
    const cache = {
      applyOptimistic: vi.fn().mockReturnValue('opt-from-response'),
      commitOptimistic: vi.fn(),
      rollbackOptimistic: vi.fn(),
    } as unknown as CacheStore;
    const client = new DumbqlClient({ endpoint: '/graphql' });
    client.mutate = vi.fn().mockResolvedValue({ status: 'success', data: { x: 1 } });

    const optimistic = vi.fn().mockReturnValue('opt-callback');
    const optimisticResponse = { createUser: { __typename: 'User', id: '1', name: 'Optimistic' } };
    const { result } = renderHook(
      () => useMutation('mutation { x }' as any, { optimistic, optimisticResponse }),
      { wrapper: wrapper(client, cache) },
    );

    await act(async () => {
      await result.current.mutate();
    });

    expect(optimistic).toHaveBeenCalledWith(cache);
    expect(cache.applyOptimistic).not.toHaveBeenCalled();
    expect(cache.commitOptimistic).toHaveBeenCalledWith('opt-callback');
  });
});
