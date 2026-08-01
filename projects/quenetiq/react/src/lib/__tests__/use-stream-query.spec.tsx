import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QuenetiqProvider } from '../provider';
import { useStreamQuery } from '../use-stream-query';

const BOOK_QUERY = { __key: 'BookQuery' } as never;

function createWrapper(client: Record<string, unknown>) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <QuenetiqProvider client={client as never}>{children}</QuenetiqProvider>;
	};
}

function createStreamClient(chunks: Array<{ status: string; data: unknown }>) {
	let callCount = 0;
	return {
		queryDefer: vi.fn().mockImplementation(async function* () {
			for (const chunk of chunks) {
				yield chunk;
			}
		}),
		query: vi.fn(),
		refetch: vi.fn(),
		endpoint: '/graphql',
		getCacheService: vi.fn(),
	};
}

describe('useStreamQuery', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns initial idle state', () => {
		const client = createStreamClient([]);
		const wrapper = createWrapper(client);

		const { result } = renderHook(
			() => useStreamQuery(BOOK_QUERY),
			{ wrapper },
		);

		expect(result.current.data).toBeNull();
		expect(result.current.loading).toBe(false);
		expect(result.current.status).toBe('idle');
		expect(result.current.error).toBeNull();
	});

	it('start() triggers streaming and updates data', async () => {
		const client = createStreamClient([
			{ status: 'success', data: { title: 'Page 1' } },
			{ status: 'success', data: { title: 'Page 1 & 2' } },
		]);
		const wrapper = createWrapper(client);

		const { result } = renderHook(
			() => useStreamQuery(BOOK_QUERY),
			{ wrapper },
		);

		await act(async () => {
			result.current.start();
			// wait for async iteration
			await new Promise((r) => setTimeout(r, 50));
		});

		expect(client.queryDefer).toHaveBeenCalledWith(BOOK_QUERY, undefined);
		expect(result.current.status).toBe('completed');
		expect(result.current.data).toEqual({ title: 'Page 1 & 2' });
		expect(result.current.loading).toBe(false);
	});

	it('stop() aborts the stream', async () => {
		let resolveChunk!: () => void;
		const slowChunk = new Promise<void>((r) => { resolveChunk = r; });

		const client = {
			queryDefer: vi.fn().mockImplementation(async function* () {
				yield { status: 'success', data: { title: 'First' } };
				await slowChunk;
				yield { status: 'success', data: { title: 'Second' } };
			}),
			query: vi.fn(),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		};
		const wrapper = createWrapper(client);

		const { result } = renderHook(
			() => useStreamQuery(BOOK_QUERY),
			{ wrapper },
		);

		act(() => {
			result.current.start();
		});

		// Wait for first chunk
		await act(async () => {
			await new Promise((r) => setTimeout(r, 20));
		});

		act(() => {
			result.current.stop();
		});

		expect(result.current.loading).toBe(false);
		expect(['idle', 'streaming']).toContain(result.current.status);
	});

	it('calls onData callback for each chunk', async () => {
		const onData = vi.fn();
		const client = createStreamClient([
			{ status: 'success', data: { title: 'Page 1' } },
			{ status: 'success', data: { title: 'Page 1 & 2' } },
		]);
		const wrapper = createWrapper(client);

		const { result } = renderHook(
			() => useStreamQuery(BOOK_QUERY, { onData }),
			{ wrapper },
		);

		await act(async () => {
			result.current.start();
			await new Promise((r) => setTimeout(r, 50));
		});

		expect(onData).toHaveBeenCalledTimes(2);
		expect(onData).toHaveBeenCalledWith({ title: 'Page 1' });
		expect(onData).toHaveBeenCalledWith({ title: 'Page 1 & 2' });
	});

	it('handles errors during streaming', async () => {
		const client = {
			queryDefer: vi.fn().mockImplementation(async function* () {
				yield { status: 'error', error: 'Network failure', errorCode: 'NETWORK_ERROR' };
			}),
			query: vi.fn(),
			refetch: vi.fn(),
			endpoint: '/graphql',
			getCacheService: vi.fn(),
		};
		const onError = vi.fn();
		const wrapper = createWrapper(client);

		const { result } = renderHook(
			() => useStreamQuery(BOOK_QUERY, { onError }),
			{ wrapper },
		);

		await act(async () => {
			result.current.start();
			await new Promise((r) => setTimeout(r, 20));
		});

		expect(result.current.status).toBe('error');
		expect(result.current.error).toBe('Network failure');
		expect(result.current.errorCode).toBe('NETWORK_ERROR');
		expect(onError).toHaveBeenCalledWith('Network failure', 'NETWORK_ERROR');
	});

	it('calls onCompleted when stream finishes', async () => {
		const onCompleted = vi.fn();
		const client = createStreamClient([
			{ status: 'success', data: { title: 'Done' } },
		]);
		const wrapper = createWrapper(client);

		const { result } = renderHook(
			() => useStreamQuery(BOOK_QUERY, { onCompleted }),
			{ wrapper },
		);

		await act(async () => {
			result.current.start();
			await new Promise((r) => setTimeout(r, 50));
		});

		expect(result.current.status).toBe('completed');
		expect(onCompleted).toHaveBeenCalledWith({ title: 'Done' });
	});
});
