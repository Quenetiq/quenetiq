import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheMiddleware } from '../cache-middleware';
import type { CacheStore, TypePolicy } from '@quenetiq/cache';
import type { GraphqlRequestContext } from '../middleware';
import type { GraphQLResult } from '../result';

function mockCacheStore(): CacheStore {
	return {
		query: vi.fn(),
		write: vi.fn(),
		merge: vi.fn(),
		evict: vi.fn(),
		writeLocal: vi.fn(),
		readLocal: vi.fn(),
		watchLocal: vi.fn(),
		clearLocalState: vi.fn(),
		writeLocalWithTypes: vi.fn(),
		clearLocalStateByTypes: vi.fn(),
		setTypePolicies: vi.fn(),
		serialize: vi.fn(),
		deserialize: vi.fn(),
		persist: vi.fn(),
		collectGarbage: vi.fn(),
		events: { setLogging: vi.fn() },
	} as unknown as CacheStore;
}

function makeQueryRequest(overrides?: Partial<GraphqlRequestContext>): GraphqlRequestContext {
	return {
		query: '{ user { id name } }',
		variables: {},
		headers: { 'Content-Type': 'application/json' },
		type: 'query',
		...overrides,
	};
}

function makeMutationRequest(overrides?: Partial<GraphqlRequestContext>): GraphqlRequestContext {
	return {
		query: 'mutation { updateUser { id name } }',
		variables: {},
		headers: { 'Content-Type': 'application/json' },
		type: 'mutation',
		...overrides,
	};
}

const successResult: GraphQLResult<{ user: { __typename: 'User'; id: string; name: string } }> = {
	status: 'success',
	data: { user: { __typename: 'User', id: '1', name: 'Alice' } },
};

describe('cacheMiddleware', () => {
	let cache: CacheStore;

	beforeEach(() => {
		cache = mockCacheStore();
	});

	it('wires typePolicies when provided', () => {
		const policies: Record<string, TypePolicy> = { User: { keyFields: ['id'] } };
		cacheMiddleware(cache, { typePolicies: policies });
		expect(cache.setTypePolicies).toHaveBeenCalledWith(policies);
	});

	it('passes through non-query/non-mutation request types', async () => {
		const mw = cacheMiddleware(cache);
		const request = makeQueryRequest({ type: 'subscription' as 'query' });
		const next = vi.fn().mockResolvedValue({ status: 'success', data: { ok: true } });

		const result = await mw(request, next);
		expect(next).toHaveBeenCalledWith(request);
		expect(result).toEqual({ status: 'success', data: { ok: true } });
	});

	describe('query requests', () => {
		it('calls next and stores result on cache-first when no cache hit', async () => {
			(cache.readLocal as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

			const mw = cacheMiddleware(cache);
			const request = makeQueryRequest();
			const next = vi.fn().mockResolvedValue(successResult);

			const result = await mw(request, next);

			expect(next).toHaveBeenCalledWith(request);
			expect(result).toEqual(successResult);
			expect(cache.merge).toHaveBeenCalledWith({ __typename: 'User', id: '1', name: 'Alice' });
			expect(cache.writeLocalWithTypes).toHaveBeenCalled();
		});

		it('returns cached result on cache-first when cache hit and maxAge=0', async () => {
			const cachedResult: GraphQLResult<unknown> = {
				status: 'success',
				data: { user: { __typename: 'User', id: '1', name: 'Cached' } },
			};
			(cache.readLocal as ReturnType<typeof vi.fn>).mockReturnValue(cachedResult);

			const mw = cacheMiddleware(cache, { maxAge: 0 });
			const request = makeQueryRequest();
			const next = vi.fn().mockResolvedValue(successResult);

			const result = await mw(request, next);

			expect(next).not.toHaveBeenCalled();
			expect(result).toEqual(expect.objectContaining({ ...cachedResult, fromCache: true }));
		});

		it('returns cached result from staleTime to maxAge (background revalidation)', async () => {
			const mw = cacheMiddleware(cache, { maxAge: 60000 });
			const request = makeQueryRequest();
			const next = vi.fn()
				.mockResolvedValueOnce(successResult)
				.mockResolvedValueOnce({ status: 'success', data: { user: { __typename: 'User', id: '1', name: 'Fresh' } } } as GraphQLResult<unknown>);

			// First call: no cache, fetches from network, stores result + timestamp
			const first = await mw(request, next);
			expect(first).toEqual(successResult);
			expect(next).toHaveBeenCalledTimes(1);

			// Second call within staleTime (< maxAge/2 = 30000ms): returns cached
			const cachedResult: GraphQLResult<unknown> = {
				status: 'success',
				data: { user: { __typename: 'User', id: '1', name: 'Cached' } },
			};
			(cache.readLocal as ReturnType<typeof vi.fn>).mockReturnValue(cachedResult);

			const second = await mw(request, next);
			// Since no time has elapsed, age < staleTime, so it returns cached without calling next
			expect(second).toEqual(expect.objectContaining({ ...cachedResult, fromCache: true }));
			expect(next).toHaveBeenCalledTimes(1); // not called again
		});

		it('background-fetches between staleTime and maxAge but returns cached', async () => {
			const mw = cacheMiddleware(cache, { maxAge: 100 });
			const request = makeQueryRequest();
			const next = vi.fn()
				.mockResolvedValueOnce(successResult)
				.mockResolvedValueOnce({ status: 'success', data: { user: { __typename: 'User', id: '1', name: 'Fresh' } } } as GraphQLResult<unknown>);

			// First call: sets timestamp
			await mw(request, next);

			// Wait so age (150ms) > staleTime (50ms) but age < maxAge (100ms)
			// Actually 150 > 100, so it will go to the "age >= maxAge" branch
			// Instead use maxAge=200 so staleTime=100, and wait 150ms
			const mw2 = cacheMiddleware(cache, { maxAge: 200 });
			const next2 = vi.fn()
				.mockResolvedValueOnce(successResult)
				.mockResolvedValueOnce({ status: 'success', data: { user: { __typename: 'User', id: '1', name: 'Fresh' } } } as GraphQLResult<unknown>);

			await mw2(request, next2);

			// Wait 150ms: age > staleTime(100) but < maxAge(200)
			await new Promise((r) => setTimeout(r, 150));

			const cachedResult: GraphQLResult<unknown> = {
				status: 'success',
				data: { user: { __typename: 'User', id: '1', name: 'Stale' } },
			};
			(cache.readLocal as ReturnType<typeof vi.fn>).mockReturnValue(cachedResult);

			const result = await mw2(request, next2);

			// Should call next (background revalidation) but return cached with fromCache flag
			expect(next2).toHaveBeenCalledTimes(2);
			expect(result).toEqual(expect.objectContaining({ ...cachedResult, fromCache: true }));
		});

		it('skips cache for no-cache fetchPolicy', async () => {
			(cache.readLocal as ReturnType<typeof vi.fn>).mockReturnValue({ status: 'success', data: { old: true } });

			const mw = cacheMiddleware(cache, { maxAge: 60000 });
			const request = makeQueryRequest({ fetchPolicy: 'no-cache' });
			const next = vi.fn().mockResolvedValue(successResult);

			const result = await mw(request, next);

			expect(next).toHaveBeenCalledWith(request);
			expect(result).toEqual(successResult);
		});

		it('always fetches from network for network-only fetchPolicy', async () => {
			const cachedResult: GraphQLResult<unknown> = {
				status: 'success',
				data: { user: { __typename: 'User', id: '1', name: 'Old' } },
			};
			(cache.readLocal as ReturnType<typeof vi.fn>).mockReturnValue(cachedResult);

			const mw = cacheMiddleware(cache, { maxAge: 60000 });
			const request = makeQueryRequest({ fetchPolicy: 'network-only' });
			const next = vi.fn().mockResolvedValue(successResult);

			const result = await mw(request, next);

			expect(next).toHaveBeenCalled();
			expect(result).toEqual(successResult);
		});

		it('always fetches from network for cache-and-network fetchPolicy', async () => {
			const cachedResult: GraphQLResult<unknown> = {
				status: 'success',
				data: { user: { __typename: 'User', id: '1', name: 'Old' } },
			};
			(cache.readLocal as ReturnType<typeof vi.fn>).mockReturnValue(cachedResult);

			const mw = cacheMiddleware(cache);
			const request = makeQueryRequest({ fetchPolicy: 'cache-and-network' });
			const next = vi.fn().mockResolvedValue(successResult);

			const result = await mw(request, next);

			expect(next).toHaveBeenCalled();
			expect(result).toEqual(successResult);
		});

		it('does not store error results', async () => {
			(cache.readLocal as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

			const mw = cacheMiddleware(cache);
			const request = makeQueryRequest();
			const errorResult: GraphQLResult<unknown> = { status: 'error', error: 'fail', errorCode: 'GRAPHQL_ERROR' };
			const next = vi.fn().mockResolvedValue(errorResult);

			const result = await mw(request, next);

			expect(cache.merge).not.toHaveBeenCalled();
			expect(result).toEqual(errorResult);
		});

		it('extracts multiple entities from nested data', async () => {
			(cache.readLocal as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

			const mw = cacheMiddleware(cache);
			const request = makeQueryRequest();
			const nestedResult: GraphQLResult<unknown> = {
				status: 'success',
				data: {
					user: { __typename: 'User', id: '1', name: 'Alice', posts: [{ __typename: 'Post', id: 'p1', title: 'Hello' }] },
				},
			};
			const next = vi.fn().mockResolvedValue(nestedResult);

			await mw(request, next);

			expect(cache.merge).toHaveBeenCalledWith({ __typename: 'User', id: '1', name: 'Alice', posts: [{ __typename: 'Post', id: 'p1', title: 'Hello' }] });
			expect(cache.merge).toHaveBeenCalledWith({ __typename: 'Post', id: 'p1', title: 'Hello' });
		});
	});

	describe('mutation requests', () => {
		it('merges entities from mutation result and clears type cache', async () => {
			const mw = cacheMiddleware(cache);
			const request = makeMutationRequest();
			const next = vi.fn().mockResolvedValue({
				status: 'success',
				data: { updateUser: { __typename: 'User', id: '1', name: 'Bob' } },
			});

			const result = await mw(request, next);

			expect(cache.merge).toHaveBeenCalledWith({ __typename: 'User', id: '1', name: 'Bob' });
			expect(cache.clearLocalStateByTypes).toHaveBeenCalledWith(['User']);
			expect(result.status).toBe('success');
		});

		it('does not clear cache on mutation error', async () => {
			const mw = cacheMiddleware(cache);
			const request = makeMutationRequest();
			const next = vi.fn().mockResolvedValue({ status: 'error', error: 'fail' });

			await mw(request, next);

			expect(cache.clearLocalStateByTypes).not.toHaveBeenCalled();
		});

		it('does not clear cache on mutation with no __typename entities', async () => {
			const mw = cacheMiddleware(cache);
			const request = makeMutationRequest();
			const next = vi.fn().mockResolvedValue({
				status: 'success',
				data: { result: 'ok' },
			});

			await mw(request, next);

			expect(cache.clearLocalStateByTypes).not.toHaveBeenCalled();
		});
	});
});
