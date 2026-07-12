import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DumbqlProvider } from '../provider';
import { useLazyQuery } from '../use-lazy-query';

const BOOK_QUERY = { __key: 'BookQuery' } as never;

function createWrapper(client: Record<string, unknown>) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <DumbqlProvider client={client as never}>{children}</DumbqlProvider>;
	};
}

describe('useLazyQuery', () => {
	it('returns initial state with called=false, loading=false, data=null', () => {
		const client = { query: vi.fn(), refetch: vi.fn(), endpoint: '/graphql', getCacheService: vi.fn() } as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(() => useLazyQuery(BOOK_QUERY), { wrapper });

		expect(result.current.called).toBe(false);
		expect(result.current.loading).toBe(false);
		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.errorCode).toBeUndefined();
	});

	it('execute() calls client.query with document', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { title: 'Dune' } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(() => useLazyQuery(BOOK_QUERY), { wrapper });

		await act(async () => {
			await result.current.execute();
		});

		expect(client.query).toHaveBeenCalledWith(BOOK_QUERY, undefined, undefined, { fetchPolicy: undefined });
	});

	it('execute() sets loading=true during execution, loading=false after', async () => {
		let resolvePromise!: (value: unknown) => void;
		const queryPromise = new Promise((resolve) => { resolvePromise = resolve; });
		const client = { query: vi.fn().mockReturnValue(queryPromise), refetch: vi.fn(), endpoint: '/graphql', getCacheService: vi.fn() } as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(() => useLazyQuery(BOOK_QUERY), { wrapper });

		act(() => {
			result.current.execute();
		});

		expect(result.current.loading).toBe(true);
		expect(result.current.called).toBe(true);

		await act(async () => {
			resolvePromise({ status: 'success', data: { title: 'Dune' } });
			await queryPromise;
		});

		expect(result.current.loading).toBe(false);
		expect(result.current.data).toEqual({ title: 'Dune' });
	});

	it('sets called=true after execute()', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { title: 'Dune' } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(() => useLazyQuery(BOOK_QUERY), { wrapper });

		expect(result.current.called).toBe(false);

		await act(async () => {
			await result.current.execute();
		});

		expect(result.current.called).toBe(true);
	});

	it('execute() with override variables uses the override', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { title: 'Dune' } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(() => useLazyQuery(BOOK_QUERY, { variables: { id: 'default' } }), { wrapper });

		await act(async () => {
			await result.current.execute({ id: 'override' });
		});

		expect(client.query).toHaveBeenCalledWith(BOOK_QUERY, { id: 'override' }, undefined, { fetchPolicy: undefined });
	});

	it('falls back to options.variables when execute() called without args', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { title: 'Dune' } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(() => useLazyQuery(BOOK_QUERY, { variables: { id: 'opts' } }), { wrapper });

		await act(async () => {
			await result.current.execute();
		});

		expect(client.query).toHaveBeenCalledWith(BOOK_QUERY, { id: 'opts' }, undefined, { fetchPolicy: undefined });
	});

	it('calls onCompleted callback on success', async () => {
		const onCompleted = vi.fn();
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { title: 'Dune' } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(
			() => useLazyQuery(BOOK_QUERY, { onCompleted }),
			{ wrapper },
		);

		await act(async () => {
			await result.current.execute();
		});

		expect(onCompleted).toHaveBeenCalledWith({ title: 'Dune' });
	});

	it('calls onError callback on error', async () => {
		const onError = vi.fn();
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'error', error: 'Not found', errorCode: 'GRAPHQL_ERROR' }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(
			() => useLazyQuery(BOOK_QUERY, { onError }),
			{ wrapper },
		);

		await act(async () => {
			await result.current.execute();
		});

		expect(onError).toHaveBeenCalledWith('Not found', 'GRAPHQL_ERROR');
	});

	it('exposes error and errorCode on failed query', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'error', error: 'Network failure', errorCode: 'NETWORK_ERROR' }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(() => useLazyQuery(BOOK_QUERY), { wrapper });

		await act(async () => {
			await result.current.execute();
		});

		expect(result.current.error).toBe('Network failure');
		expect(result.current.errorCode).toBe('NETWORK_ERROR');
		expect(result.current.data).toBeNull();
	});

	it('passes fetchPolicy through to client.query', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { ok: true } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(
			() => useLazyQuery(BOOK_QUERY, { fetchPolicy: 'network-only' }),
			{ wrapper },
		);

		await act(async () => {
			await result.current.execute();
		});

		expect(client.query).toHaveBeenCalledWith(BOOK_QUERY, undefined, undefined, { fetchPolicy: 'network-only' });
	});

	it('returns the GraphQLResult from execute()', async () => {
		const expected = { status: 'success', data: { title: 'Dune' } } as const;
		const client = {
			query: vi.fn().mockResolvedValue(expected),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(() => useLazyQuery(BOOK_QUERY), { wrapper });

		let res: unknown;
		await act(async () => {
			res = await result.current.execute();
		});

		expect(res).toEqual(expected);
	});

	it('resets data/error on new execute() call after error', async () => {
		const client = {
			query: vi.fn()
				.mockResolvedValueOnce({ status: 'error', error: 'fail', errorCode: 'GRAPHQL_ERROR' })
				.mockResolvedValueOnce({ status: 'success', data: { title: 'Dune' } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(() => useLazyQuery(BOOK_QUERY), { wrapper });

		await act(async () => {
			await result.current.execute();
		});

		expect(result.current.error).toBe('fail');

		await act(async () => {
			await result.current.execute();
		});

		expect(result.current.error).toBeNull();
		expect(result.current.data).toEqual({ title: 'Dune' });
	});

	it('updates data on subsequent successful execute() calls', async () => {
		const client = {
			query: vi.fn()
				.mockResolvedValueOnce({ status: 'success', data: { title: 'Dune' } })
				.mockResolvedValueOnce({ status: 'success', data: { title: 'Dune Messiah' } }),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		} as never;
		const wrapper = createWrapper(client);

		const { result } = renderHook(() => useLazyQuery(BOOK_QUERY), { wrapper });

		await act(async () => {
			await result.current.execute();
		});

		expect(result.current.data).toEqual({ title: 'Dune' });

		await act(async () => {
			await result.current.execute();
		});

		expect(result.current.data).toEqual({ title: 'Dune Messiah' });
	});
});
