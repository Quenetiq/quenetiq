import { describe, it, expect, vi, afterEach } from 'vitest';
import { QuenetiqClient } from '../client';
import { gql } from '../gql';

function mockFetchOk(data: unknown) {
	return vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: vi.fn().mockResolvedValue({ data }),
		headers: new Headers(),
	});
}

function mockFetchAbort() {
	return vi.fn().mockImplementation(() => {
		return new Promise((_, reject) => {
			const err = new DOMException('The operation was aborted.', 'AbortError');
			reject(err);
		});
	});
}

const QUERY = gql`{ __typename }`;

describe('QuenetiqClient AbortController', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('passes signal to fetch', async () => {
		vi.stubGlobal('fetch', mockFetchOk({ __typename: 'Query' }));
		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const controller = new AbortController();

		await client.query(QUERY, undefined, undefined, { signal: controller.signal });

		expect(fetch).toHaveBeenCalledTimes(1);
		const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(callArgs[1].signal).toBe(controller.signal);
	});

	it('returns NETWORK_ERROR when request is aborted', async () => {
		vi.stubGlobal('fetch', mockFetchAbort());
		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const controller = new AbortController();

		const result = await client.query(QUERY, undefined, undefined, { signal: controller.signal });

		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.error).toBe('Request aborted');
		}
	});

	it('works without signal (no abort)', async () => {
		vi.stubGlobal('fetch', mockFetchOk({ __typename: 'Query' }));
		const client = new QuenetiqClient({ endpoint: '/graphql' });

		const result = await client.query(QUERY);

		expect(result.status).toBe('success');
	});

	it('abort before fetch completes', async () => {
		vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
			return new Promise((_, reject) => {
				opts.signal?.addEventListener('abort', () => {
					reject(new DOMException('The operation was aborted.', 'AbortError'));
				});
			});
		}));

		const client = new QuenetiqClient({ endpoint: '/graphql' });
		const controller = new AbortController();

		const promise = client.query(QUERY, undefined, undefined, { signal: controller.signal });

		controller.abort();

		const result = await promise;
		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.error).toBe('Request aborted');
		}
	});
});
