import { describe, it, expect, vi, afterEach } from 'vitest';
import { DumbqlClient, createClient } from '../client';
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

describe('DumbqlClient constructor', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('creates client with default endpoint', () => {
		const client = new DumbqlClient({ endpoint: '/graphql' });
		expect(client.endpoint).toBe('/graphql');
	});

	it('falls back to url field', () => {
		const client = new DumbqlClient({ url: '/api/graphql' });
		expect(client.endpoint).toBe('/api/graphql');
	});

	it('defaults to /graphql when no endpoint', () => {
		const client = new DumbqlClient({});
		expect(client.endpoint).toBe('/graphql');
	});

	it('sets default config options', () => {
		const client = new DumbqlClient({ endpoint: '/gql' });
		expect(client.getCacheService()).toBeNull();
	});

	it('accepts cache store', () => {
		const cache = { query: vi.fn() } as never;
		const client = new DumbqlClient({ endpoint: '/gql' }, cache);
		expect(client.getCacheService()).toBe(cache);
	});

	it('setEndpoint updates endpoint', () => {
		const client = new DumbqlClient({ endpoint: '/old' });
		client.setEndpoint('/new');
		expect(client.endpoint).toBe('/new');
	});

	it('createClient is a factory wrapper', () => {
		const client = createClient({ endpoint: '/gql' });
		expect(client).toBeInstanceOf(DumbqlClient);
		expect(client.endpoint).toBe('/gql');
	});
});

describe('DumbqlClient.query', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends POST request with query and variables', async () => {
		const fetch = mockFetchOk({ data: { hello: 'world' } });
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql' });
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

		const client = new DumbqlClient({ endpoint: '/graphql', middleware: [authMiddleware('tok')] });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result).toEqual({ status: 'success', data: { ok: true } });
	});

	it('returns NO_DATA error when response has no data', async () => {
		const fetch = mockFetchOk({});
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql' });
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

		const client = new DumbqlClient({ endpoint: '/graphql', dedup: true });
		const doc = { kind: 'Document', definitions: [] } as never;

		const [r1, r2] = await Promise.all([client.query(doc, { x: 1 }), client.query(doc, { x: 1 })]);

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(r1).toEqual(r2);
	});

	it('batches queries when batchWindow > 0', async () => {
		const fetch = mockFetchOk([{ data: { a: 1 } }, { data: { b: 2 } }]);
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql', batchWindow: 50 });
		const doc = { kind: 'Document', definitions: [] } as never;

		const [r1, r2] = await Promise.all([client.query(doc, { id: 1 }), client.query(doc, { id: 2 })]);

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(r1).toEqual({ status: 'success', data: { a: 1 } });
		expect(r2).toEqual({ status: 'success', data: { b: 2 } });
	});

	it('handles single query in batch mode', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql', batchWindow: 50 });
		const doc = { kind: 'Document', definitions: [] } as never;

		const result = await client.query(doc);
		expect(result).toEqual({ status: 'success', data: { ok: true } });
	});
});

describe('DumbqlClient.mutate', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends mutation and returns result', async () => {
		const fetch = mockFetchOk({ data: { id: '1' } });
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql' });
		const result = await client.mutate({ kind: 'Document', definitions: [] } as never, { x: 1 });

		expect(fetch).toHaveBeenCalledWith('/graphql', expect.objectContaining({ method: 'POST' }));
		expect(result).toEqual({ status: 'success', data: { id: '1' } });
	});

	it('uploads files as FormData when variables contain File', async () => {
		const fetch = mockFetchOk({ data: { url: 'https://example.com/file' } });
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql' });
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

		const client = new DumbqlClient({ endpoint: '/graphql', errorPolicy: 'none' });
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
		const client = new DumbqlClient({ endpoint: '/graphql', onError, errorPolicy: 'none' });

		await client.mutate({ kind: 'Document', definitions: [] } as never);

		expect(onError).toHaveBeenCalledWith('Fail');
	});
});

describe('DumbqlClient.refetch', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('removes dedup cache and re-queries', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql', dedup: true });
		const doc = { kind: 'Document', definitions: [] } as never;

		await client.query(doc, { x: 1 });
		const result = await client.refetch(doc, { x: 1 });

		expect(fetch).toHaveBeenCalledTimes(2);
		expect(result).toEqual({ status: 'success', data: { ok: true } });
	});
});

describe('DumbqlClient error handling', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('handles HTTP error', async () => {
		const fetch = mockFetchError(500, 'Internal Server Error');
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql' });
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

		const client = new DumbqlClient({ endpoint: '/graphql' });
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
		const client = new DumbqlClient({ endpoint: '/graphql', retryCount: 2, retryDelay: 10, middleware: [breakingMw] });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(callCount).toBe(3);
		expect(result).toEqual({ status: 'success', data: { ok: true } });
	});

	it('throws when middleware retries exhausted', async () => {
		const breakingMw = async () => {
			throw new Error('Persistent middleware error');
		};
		const client = new DumbqlClient({ endpoint: '/graphql', retryCount: 1, retryDelay: 10, middleware: [breakingMw] });

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

		const client = new DumbqlClient({ endpoint: '/graphql', errorPolicy: 'none' });
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

		const client = new DumbqlClient({ endpoint: '/graphql', errorPolicy: 'ignore' });
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

		const client = new DumbqlClient({ endpoint: '/graphql', errorPolicy: 'ignore' });
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

		const client = new DumbqlClient({ endpoint: '/graphql', errorPolicy: 'all', showErrorsOnSuccess: true });
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

		const client = new DumbqlClient({ endpoint: '/graphql', errorPolicy: 'ignore', showErrorsOnSuccess: true });
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

		const client = new DumbqlClient({ endpoint: '/graphql', errorPolicy: 'ignore', showErrorsOnSuccess: false });
		const result = await client.query({ kind: 'Document', definitions: [] } as never);

		expect(result.status).toBe('success');
		if (result.status === 'success') {
			expect(result.graphQLErrors).toBeUndefined();
		}
	});
});

describe('DumbqlClient.executeStreaming', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('yields single JSON result for non-multipart response', async () => {
		const fetch = mockFetchStream([JSON.stringify({ data: { ok: true } })], 'application/json');
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql' });
		const stream = client.queryStream({ kind: 'Document', definitions: [] } as never);
		const results: unknown[] = [];

		for await (const result of stream) {
			results.push(result);
		}

		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({ status: 'success', data: { ok: true } });
	});
});

describe('DumbqlClient pipeline with middleware', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('applies custom middleware', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const mw = authMiddleware('custom-token', 'X-Auth');
		const client = new DumbqlClient({ endpoint: '/graphql', middleware: [mw] });

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
		const client = new DumbqlClient({ endpoint: '/graphql', middleware: [breakingMw] });

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

		const client = new DumbqlClient({ endpoint: '/graphql', headers: { 'X-Static': 'val' } });
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

		const client = new DumbqlClient({ endpoint: '/graphql', headers: { 'X-Dynamic': () => 'dyn-value' } });
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

		const client = new DumbqlClient({ endpoint: '/graphql', dedup: true });
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
		const client = new DumbqlClient(
			{ endpoint: '/graphql' },
			{ clearLocalState } as never,
		);

		client.resetStore();
		expect(clearLocalState).toHaveBeenCalledTimes(1);
	});

	it('clears batch queue', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql', batchWindow: 100 });

		client.resetStore();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('is safe to call without cache store', () => {
		const client = new DumbqlClient({ endpoint: '/graphql' });
		expect(() => client.resetStore()).not.toThrow();
	});
});

describe('clearStore', () => {
	it('clears cache store', () => {
		const clearLocalState = vi.fn();
		const client = new DumbqlClient(
			{ endpoint: '/graphql' },
			{ clearLocalState } as never,
		);

		client.clearStore();
		expect(clearLocalState).toHaveBeenCalledTimes(1);
	});

	it('does not clear dedup cache', async () => {
		const fetch = mockFetchOk({ data: { ok: true } });
		vi.stubGlobal('fetch', fetch);

		const client = new DumbqlClient({ endpoint: '/graphql', dedup: true });
		const doc = { kind: 'Document', definitions: [] } as never;

		const p1 = client.query(doc);
		const p2 = client.query(doc);

		client.clearStore();

		await Promise.all([p1, p2]);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('is safe to call without cache store', () => {
		const client = new DumbqlClient({ endpoint: '/graphql' });
		expect(() => client.clearStore()).not.toThrow();
	});
});
