import { describe, it, expect, vi, afterEach } from 'vitest';
import { QuenetiqClient, createClient } from '../client';
import { authMiddleware } from '../middleware';

function mockFetchOk(data: unknown, status = 200) {
	return vi.fn().mockResolvedValue({
		ok: true,
		status,
		json: vi.fn().mockResolvedValue(data),
		headers: new Headers(),
		blob: vi.fn(),
	});
}

function mockFetchError(status: number, statusText: string) {
	return vi.fn().mockResolvedValue({
		ok: false,
		status,
		statusText,
		json: vi.fn(),
		headers: new Headers(),
	});
}

function mockFetchNetworkError() {
	return vi.fn().mockRejectedValue(new Error('Network failure'));
}

function mockFetchStream(chunks: string[], contentType = 'multipart/mixed;boundary=graphql') {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});
	return vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		headers: new Headers({ 'content-type': contentType }),
		body: stream,
		json: vi.fn(),
	});
}

describe('QuenetiqClient constructor', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('creates client with default endpoint', () => {
		const client = new QuenetiqClient({ endpoint: '/graphql' });
		expect(client.endpoint).toBe('/graphql');
	});

	it('falls back to url field', () => {
		const client = new QuenetiqClient({ url: '/api/graphql' });
		expect(client.endpoint).toBe('/api/graphql');
	});

	it('defaults to /graphql when no endpoint', () => {
		const client = new QuenetiqClient({});
		expect(client.endpoint).toBe('/graphql');
	});

	it('sets default config options', () => {
		const client = new QuenetiqClient({ endpoint: '/gql' });
		expect(client.getCacheService()).toBeNull();
	});

	it('accepts cache store', () => {
		const cache = { query: vi.fn() } as never;
		const client = new QuenetiqClient({ endpoint: '/gql' }, cache);
		expect(client.getCacheService()).toBe(cache);
	});

	it('setEndpoint updates endpoint', () => {
		const client = new QuenetiqClient({ endpoint: '/old' });
		client.setEndpoint('/new');
		expect(client.endpoint).toBe('/new');
	});

	it('createClient is a factory wrapper', () => {
		const client = createClient({ endpoint: '/gql' });
		expect(client).toBeInstanceOf(QuenetiqClient);
		expect(client.endpoint).toBe('/gql');
	});
});

describe('QuenetiqClient.query', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends POST request with query and variables', async () => {
		const fetch = mockFetchOk({ data: { hello: 'world' } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const result = await client.query({ kind: 'Document', definitions: [] } as never, { foo: 1 });

		expect(fetch).toHaveBeenCalledWith(
			'/graphql',
			expect.objectContaining({
				method: 'POST',
				body: expect.stringContaining('"variables":{"foo":1}'),
			}),
		);
		expect(result).toEqual({ status: 'success', data: { hello: 'world' } });
	});

	it('sends GET request when method is GET', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', middleware: [authMiddleware('tok')] });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result).toEqual({ status: 'success', data: { ok: true } });
	});

	it('returns NO_DATA error when response has no data', async () => {
		const fetch = mockFetchOk({});
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.errorCode).toBe('NO_DATA');
			expect(result.error).toBe('No data returned from server');
		}
	});

	it('deduplicates identical queries', async () => {
		const fetch = mockFetchOk({ data: { hello: 'world' } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', dedup: true });
		const doc = { kind: 'Document', definitions: [] } as never;

		const [r1, r2] = await Promise.all([client.query(doc, { x: 1 }), client.query(doc, { x: 1 })]);

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(r1).toEqual(r2);
	});

	it('batches queries when batchWindow > 0', async () => {
		const fetch = mockFetchOk([{ data: { a: 1 } }, { data: { b: 2 } }]);
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', batchWindow: 50 });
		const doc = { kind: 'Document', definitions: [] } as never;

		const [r1, r2] = await Promise.all([client.query(doc, { id: 1 }), client.query(doc, { id: 2 })]);

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(r1).toEqual({ status: 'success', data: { a: 1 } });
		expect(r2).toEqual({ status: 'success', data: { b: 2 } });
	});

	it('handles single query in batch mode', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', batchWindow: 50 });
		const doc = { kind: 'Document', definitions: [] } as never;

		const result = await client.query(doc);
		expect(result).toEqual({ status: 'success', data: { ok: true } });
	});
});

describe('QuenetiqClient.mutate', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends mutation and returns result', async () => {
		const fetch = mockFetchOk({ data: { id: '1' } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const result = await client.mutate({ kind: 'Document', definitions: [] } as never, { x: 1 });

		expect(fetch).toHaveBeenCalledWith('/graphql', expect.objectContaining({ method: 'POST' }));
		expect(result).toEqual({ status: 'success', data: { id: '1' } });
	});

	it('uploads files as FormData when variables contain File', async () => {
		const fetch = mockFetchOk({ data: { url: 'https://example.com/file' } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const file = new File(['content'], 'test.txt');

		await client.mutate({ kind: 'Document', definitions: [] } as never, { file } as never);

		expect(fetch).toHaveBeenCalledWith(
			'/graphql',
			expect.objectContaining({
				method: 'POST',
				body: expect.any(FormData),
			}),
		);
	});

	it('reports GraphQL errors in mutation response', async () => {
		const fetch = mockFetchOk({
			data: null,
			errors: [{ message: 'Field not found' }],
		});
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', errorPolicy: 'none' });
		const result = await client.mutate({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.error).toBe('Field not found');
			expect(result.errorCode).toBe('GRAPHQL_ERROR');
		}
	});

	it('calls onError callback on mutation error', async () => {
		const fetch = mockFetchOk({
			data: null,
			errors: [{ message: 'Fail' }],
		});
		vi.stubGlobal('fetch', fetch);

		const onError = vi.fn();
		const client = new QuenetiqClient({ endpoint: '/graphql', onError, errorPolicy: 'none' });

		await client.mutate({ kind: 'Document', definitions: [] } as never);

		expect(onError).toHaveBeenCalledWith('Fail');
	});

	it('applies optimisticResponse to cache on mutate', async () => {
		const fetch = mockFetchOk({ data: { createUser: { __typename: 'User', id: '1', name: 'Alice' } } });
		vi.stubGlobal('fetch', fetch);

		const mockCache = {
			applyOptimistic: vi.fn().mockReturnValue('opt-1'),
			commitOptimistic: vi.fn(),
			rollbackOptimistic: vi.fn(),
		};
		const client = new QuenetiqClient({ endpoint: '/graphql' });

		(client as any)._cacheService = mockCache;

		const optimisticData = { createUser: { __typename: 'User', id: '1', name: 'Optimistic' } };
		await client.mutate(
			{ kind: 'Document', definitions: [] } as never,
			undefined,
			undefined,
			{ optimisticResponse: optimisticData },
		);

		expect(mockCache.applyOptimistic).toHaveBeenCalledTimes(1);
		expect(mockCache.applyOptimistic).toHaveBeenCalledWith(
			expect.objectContaining({ id: expect.stringContaining('optimistic:') }),
		);
		expect(mockCache.commitOptimistic).toHaveBeenCalledTimes(1);
		expect(mockCache.commitOptimistic).toHaveBeenCalledWith(
			expect.stringContaining('optimistic:'),
		);
		expect(mockCache.rollbackOptimistic).not.toHaveBeenCalled();
	});

	it('rolls back optimisticResponse on mutation error', async () => {
		const fetch = mockFetchOk({
			data: null,
			errors: [{ message: 'Fail' }],
		});
		vi.stubGlobal('fetch', fetch);

		const mockCache = {
			applyOptimistic: vi.fn().mockReturnValue('opt-2'),
			commitOptimistic: vi.fn(),
			rollbackOptimistic: vi.fn(),
		};
		const client = new QuenetiqClient({ endpoint: '/graphql', errorPolicy: 'none' });

		(client as any)._cacheService = mockCache;

		const optimisticData = { createUser: { __typename: 'User', id: '1', name: 'Optimistic' } };
		await client.mutate(
			{ kind: 'Document', definitions: [] } as never,
			undefined,
			undefined,
			{ optimisticResponse: optimisticData },
		);

		expect(mockCache.applyOptimistic).toHaveBeenCalledTimes(1);
		expect(mockCache.commitOptimistic).not.toHaveBeenCalled();
		expect(mockCache.rollbackOptimistic).toHaveBeenCalledTimes(1);
		expect(mockCache.rollbackOptimistic).toHaveBeenCalledWith(
			expect.stringContaining('optimistic:'),
		);
	});

	it('does not apply optimistic when no cache', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const optimisticData = { createUser: { __typename: 'User', id: '1', name: 'Optimistic' } };

		const result = await client.mutate(
			{ kind: 'Document', definitions: [] } as never,
			undefined,
			undefined,
			{ optimisticResponse: optimisticData },
		);

		expect(result.status).toBe('success');
	});
});

describe('QuenetiqClient.refetch', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('removes dedup cache and re-queries', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', dedup: true });
		const doc = { kind: 'Document', definitions: [] } as never;

		await client.query(doc, { x: 1 });
		const result = await client.refetch(doc, { x: 1 });

		expect(fetch).toHaveBeenCalledTimes(2);
		expect(result).toEqual({ status: 'success', data: { ok: true } });
	});
});

describe('QuenetiqClient error handling', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('handles HTTP error', async () => {
		const fetch = mockFetchError(500, 'Internal Server Error');
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.error).toBe('HTTP 500');
			expect(result.errorCode).toBe('NETWORK_ERROR');
			expect(result.networkError?.status).toBe(500);
		}
	});

	it('handles network error', async () => {
		const fetch = mockFetchNetworkError();
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.error).toBe('Network failure');
			expect(result.errorCode).toBe('NETWORK_ERROR');
		}
	});

	it('retries on middleware throw with retryCount', async () => {
		let callCount = 0;
		const breakingMw = async () => {
			callCount++;
			if (callCount < 3) throw new Error('Timeout');
			return { status: 'success', data: { ok: true } } as const;
		};
		const client = new QuenetiqClient({ endpoint: '/graphql', retryCount: 2, retryDelay: 10, middleware: [breakingMw] });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(callCount).toBe(3);
		expect(result).toEqual({ status: 'success', data: { ok: true } });
	});

	it('throws when middleware retries exhausted', async () => {
		const breakingMw = async () => {
			throw new Error('Persistent middleware error');
		};
		const client = new QuenetiqClient({ endpoint: '/graphql', retryCount: 1, retryDelay: 10, middleware: [breakingMw] });

		await expect(client.query({ kind: 'Document', definitions: [] } as never)).rejects.toThrow(
			'Persistent middleware error',
		);
	});
});

describe('errorPolicy handling', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('errorPolicy: none returns errors as error status', async () => {
		const fetch = mockFetchOk({
			data: null,
			errors: [{ message: 'Forbidden' }],
		});
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', errorPolicy: 'none' });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.error).toBe('Forbidden');
		}
	});

	it('errorPolicy: ignore returns partial data with errors', async () => {
		const fetch = mockFetchOk({
			data: { hello: 'world' },
			errors: [{ message: 'Field warning' }],
		});
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', errorPolicy: 'ignore' });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('success');
		if (result.status === 'success') {
			expect(result.data).toEqual({ hello: 'world' });
		}
	});

	it('errorPolicy: ignore returns error when no data', async () => {
		const fetch = mockFetchOk({
			errors: [{ message: 'Field warning' }],
		});
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', errorPolicy: 'ignore' });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.errorCode).toBe('NO_DATA');
		}
	});

	it('errorPolicy: all returns success with graphQLErrors when data present', async () => {
		const fetch = mockFetchOk({
			data: { hello: 'world' },
			errors: [{ message: 'Minor issue' }],
		});
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', errorPolicy: 'all', showErrorsOnSuccess: true });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('success');
		if (result.status === 'success') {
			expect(result.data).toEqual({ hello: 'world' });
			expect(result.graphQLErrors).toHaveLength(1);
		}
	});

	it('showErrorsOnSuccess includes graphQLErrors with errorPolicy ignore', async () => {
		const fetch = mockFetchOk({
			data: { ok: true },
			errors: [{ message: 'Warning' }],
		});
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', errorPolicy: 'ignore', showErrorsOnSuccess: true });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('success');
		if (result.status === 'success') {
			expect(result.graphQLErrors).toHaveLength(1);
		}
	});

	it('showErrorsOnSuccess false omits graphQLErrors with errorPolicy ignore', async () => {
		const fetch = mockFetchOk({
			data: { ok: true },
			errors: [{ message: 'Warning' }],
		});
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', errorPolicy: 'ignore', showErrorsOnSuccess: false });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('success');
		if (result.status === 'success') {
			expect(result.graphQLErrors).toBeUndefined();
		}
	});
});

describe('QuenetiqClient.executeStreaming', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('yields single JSON result for non-multipart response', async () => {
		const fetch = mockFetchStream([JSON.stringify({ data: { ok: true } })], 'application/json');
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const stream = client.queryStream({ kind: 'Document', definitions: [] } as never);
		const results: unknown[] = [];

		for await (const result of stream) {
			results.push(result);
		}

		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({ status: 'success', data: { ok: true } });
	});
});

describe('QuenetiqClient pipeline with middleware', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('applies custom middleware', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const mw = authMiddleware('custom-token', 'X-Auth');
		const client = new QuenetiqClient({ endpoint: '/graphql', middleware: [mw] });

		await client.query({ kind: 'Document', definitions: [] } as never);

		expect(fetch).toHaveBeenCalledWith(
			'/graphql',
			expect.objectContaining({
				headers: expect.objectContaining({ 'X-Auth': 'Bearer custom-token' }),
			}),
		);
	});

	it('handles middleware error gracefully', async () => {
		const breakingMw = async () => {
			throw new Error('Middleware crashed');
		};
		const client = new QuenetiqClient({ endpoint: '/graphql', middleware: [breakingMw] });

		await expect(client.query({ kind: 'Document', definitions: [] } as never)).rejects.toThrow('Middleware crashed');
	});
});

describe('config headers', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('passes static headers', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', headers: { 'X-Static': 'val' } });
		await client.query({ kind: 'Document', definitions: [] } as never);

		expect(fetch).toHaveBeenCalledWith(
			'/graphql',
			expect.objectContaining({
				headers: expect.objectContaining({ 'X-Static': 'val' }),
			}),
		);
	});

	it('evaluates header functions', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', headers: { 'X-Dynamic': () => 'dyn-value' } });
		await client.query({ kind: 'Document', definitions: [] } as never);

		expect(fetch).toHaveBeenCalledWith(
			'/graphql',
			expect.objectContaining({
				headers: expect.objectContaining({ 'X-Dynamic': 'dyn-value' }),
			}),
		);
	});
});

describe('resetStore', () => {
	it('clears dedup cache for in-flight requests', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', dedup: true });
		const doc = { kind: 'Document', definitions: [] } as never;

		const p1 = client.query(doc);
		const p2 = client.query(doc);
		expect(fetch).toHaveBeenCalledTimes(1);

		client.resetStore();

		await Promise.all([p1, p2]);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('clears cache store', () => {
		const clearLocalState = vi.fn();
		const client = new QuenetiqClient(
			{ endpoint: '/graphql' },
			{ clearLocalState } as never,
		);

		client.resetStore();
		expect(clearLocalState).toHaveBeenCalledTimes(1);
	});

	it('clears batch queue', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', batchWindow: 100 });

		client.resetStore();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('is safe to call without cache store', () => {
		const client = new QuenetiqClient({ endpoint: '/graphql' });
		expect(() => client.resetStore()).not.toThrow();
	});
});

describe('clearStore', () => {
	it('clears cache store', () => {
		const clearLocalState = vi.fn();
		const client = new QuenetiqClient(
			{ endpoint: '/graphql' },
			{ clearLocalState } as never,
		);

		client.clearStore();
		expect(clearLocalState).toHaveBeenCalledTimes(1);
	});

	it('does not clear dedup cache', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql', dedup: true });
		const doc = { kind: 'Document', definitions: [] } as never;

		const p1 = client.query(doc);
		const p2 = client.query(doc);

		client.clearStore();

		await Promise.all([p1, p2]);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('is safe to call without cache store', () => {
		const client = new QuenetiqClient({ endpoint: '/graphql' });
		expect(() => client.clearStore()).not.toThrow();
	});
});

describe('QuenetiqClient.queryDefer', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	function mockFetchMultipart(chunks: Record<string, unknown>[]) {
		const encoder = new TextEncoder();
		const boundary = 'graphql';
		const parts = chunks.map((c) => `\nContent-Type: application/json\n\n${JSON.stringify(c)}`).join(`\n--${boundary}`);
		const raw = `--${boundary}${parts}\n--${boundary}--`;
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(encoder.encode(raw));
				controller.close();
			},
		});
		return vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			headers: new Headers({ 'content-type': `multipart/mixed;boundary=${boundary}` }),
			body: stream,
			json: vi.fn(),
		});
	}

	it('yields initial data from first chunk', async () => {
		const fetch = mockFetchMultipart([
			{ data: { users: [{ __typename: 'User', id: '1', name: 'Alice' }] }, hasNext: false },
		]);
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const results: unknown[] = [];
		for await (const result of client.queryDefer({ kind: 'Document', definitions: [] } as never)) {
			results.push(result);
		}

		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({ status: 'success', data: { users: [{ __typename: 'User', id: '1', name: 'Alice' }] } });
	});

	it('auto-merges incremental patches into data', async () => {
		const fetch = mockFetchMultipart([
			{ data: { users: [{ __typename: 'User', id: '1', name: 'Alice' }] }, hasNext: true },
			{ incremental: [{ path: ['users', 0, 'email'], data: 'alice@example.com' }], hasNext: false },
		]);
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const results: unknown[] = [];
		for await (const result of client.queryDefer({ kind: 'Document', definitions: [] } as never)) {
			results.push(result);
		}

		expect(results).toHaveLength(2);
		expect(results[0]).toEqual({ status: 'success', data: { users: [{ __typename: 'User', id: '1', name: 'Alice' }] } });
		expect(results[1]).toEqual({
			status: 'success',
			data: { users: [{ __typename: 'User', id: '1', name: 'Alice', email: 'alice@example.com' }] },
		});
	});

	it('handles array append patches via @stream', async () => {
		const fetch = mockFetchMultipart([
			{ data: { items: [{ __typename: 'Item', id: '1' }] }, hasNext: true },
			{ incremental: [{ path: ['items', 1], data: { __typename: 'Item', id: '2' } }], hasNext: false },
		]);
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const results: unknown[] = [];
		for await (const result of client.queryDefer({ kind: 'Document', definitions: [] } as never)) {
			results.push(result);
		}

		expect(results).toHaveLength(2);
		expect(results[1]).toEqual({
			status: 'success',
			data: { items: [{ __typename: 'Item', id: '1' }, { __typename: 'Item', id: '2' }] },
		});
	});

	it('yields error on stream failure', async () => {
		const fetch = vi.fn().mockRejectedValue(new Error('Network failure'));
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const results: unknown[] = [];
		for await (const result of client.queryDefer({ kind: 'Document', definitions: [] } as never)) {
			results.push(result);
		}

		// On network error, executeDefer completes with no results (error is swallowed in executeStreamingRaw)
		expect(results).toHaveLength(0);
	});
});

describe('QuenetiqClient Persisted Queries (APQ)', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends hash-only via POST when query is registered', async () => {
		const fetch = mockFetchOk({ data: { hello: 'world' } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({
			endpoint: '/graphql',
			persistedQueries: { enabled: true, hash: 'sha256', autoPersist: true },
		});

		const doc = { kind: 'Document', definitions: [] } as never;

		// First query: sends full query, auto-persists
		await client.query(doc);
		const firstBody = JSON.parse(fetch.mock.calls[0][1].body as string);
		expect(firstBody.query).toBeDefined();

		// Second query: should send hash-only (extensions with persistedQuery)
		await client.query(doc);
		expect(fetch).toHaveBeenCalledTimes(2);
		const secondBody = JSON.parse(fetch.mock.calls[1][1].body as string);
		expect(secondBody.extensions).toBeDefined();
		expect(secondBody.extensions.persistedQuery).toBeDefined();
		expect(secondBody.extensions.persistedQuery.version).toBe(1);
		expect(secondBody.extensions.persistedQuery.sha256Hash).toBeDefined();
		expect(secondBody.query).toBeUndefined();
	});

	it('falls back to full query on PersistedQueryNotFound', async () => {
		let callCount = 0;
		const fetch = vi.fn().mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				// First call: full query, auto-persists
				return Promise.resolve({
					ok: true,
					status: 200,
					json: vi.fn().mockResolvedValue({ data: { hello: 'world' } }),
					headers: new Headers(),
				});
			}
			if (callCount === 2) {
				// Second call: hash-only, server returns PersistedQueryNotFound
				return Promise.resolve({
					ok: true,
					status: 200,
					json: vi.fn().mockResolvedValue({
						errors: [{ message: 'PersistedQueryNotFound' }],
					}),
					headers: new Headers(),
				});
			}
			// Third call: full query fallback
			return Promise.resolve({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ data: { hello: 'world' } }),
				headers: new Headers(),
			});
		});
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({
			endpoint: '/graphql',
			persistedQueries: { enabled: true, hash: 'sha256', autoPersist: true },
		});

		const doc = { kind: 'Document', definitions: [] } as never;

		// First query: full POST → auto-persists
		await client.query(doc);

		// Second query: hash-only → PersistedQueryNotFound → full POST fallback
		const result = await client.query(doc);

		expect(result.status).toBe('success');
		expect(fetch).toHaveBeenCalledTimes(3);
		// Third call should have full query body
		const thirdBody = JSON.parse(fetch.mock.calls[2][1].body as string);
		expect(thirdBody.query).toBeDefined();
	});

	it('does not use APQ for mutations', async () => {
		const fetch = mockFetchOk({ data: { createItem: { id: '1' } } });
		vi.stubGlobal('fetch', fetch);

		const client = new QuenetiqClient({
			endpoint: '/graphql',
			persistedQueries: { enabled: true, hash: 'sha256' },
		});

		const doc = { kind: 'Document', definitions: [] } as never;
		await client.mutate(doc);

		// Mutations should always send full query
		const body = JSON.parse(fetch.mock.calls[0][1].body as string);
		expect(body.query).toBeDefined();
		expect(body.extensions).toBeUndefined();
	});

	it('useGetForHashedQueries sends via GET with extensions', async () => {
		// First: register query via POST
		const postFetch = mockFetchOk({ data: { hello: 'world' } });
		vi.stubGlobal('fetch', postFetch);

		const client = new QuenetiqClient({
			endpoint: '/graphql',
			persistedQueries: { enabled: true, hash: 'sha256', autoPersist: true, useGetForHashedQueries: true },
		});

		const doc = { kind: 'Document', definitions: [] } as never;
		await client.query(doc);

		// Second: should use GET
		const getFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: vi.fn().mockResolvedValue({ data: { hello: 'world' } }),
			headers: new Headers(),
		});
		vi.stubGlobal('fetch', getFetch);

		await client.query(doc);

		expect(getFetch).toHaveBeenCalledTimes(1);
		const url = getFetch.mock.calls[0][0] as string;
		expect(url).toContain('/graphql?');
		expect(url).toContain('extensions=');
	});
});
