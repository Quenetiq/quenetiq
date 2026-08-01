import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStreamQuery } from '../use-stream-query';

vi.mock('../plugin', () => ({
	useClient: vi.fn(),
}));

import { useClient } from '../plugin';

describe('useStreamQuery (Vue)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns initial idle state', () => {
		const client = {
			queryDefer: vi.fn().mockImplementation(async function* () {}),
			query: vi.fn(),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { data, loading, status, error } = useStreamQuery('query { x }' as any);

		expect(data.value).toBeNull();
		expect(loading.value).toBe(false);
		expect(status.value).toBe('idle');
		expect(error.value).toBeNull();
	});

	it('start() triggers streaming and updates data', async () => {
		const client = {
			queryDefer: vi.fn().mockImplementation(async function* () {
				yield { status: 'success', data: { title: 'Page 1' } };
				yield { status: 'success', data: { title: 'Page 1 & 2' } };
			}),
			query: vi.fn(),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { data, status, start } = useStreamQuery('query { x }' as any);

		start();
		await new Promise((r) => setTimeout(r, 50));

		expect(status.value).toBe('completed');
		expect(data.value).toEqual({ title: 'Page 1 & 2' });
	});

	it('stop() aborts the stream', async () => {
		const client = {
			queryDefer: vi.fn().mockImplementation(async function* () {
				yield { status: 'success', data: { title: 'First' } };
				await new Promise(() => {}); // hang forever
				yield { status: 'success', data: { title: 'Second' } };
			}),
			query: vi.fn(),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { loading, status, start, stop } = useStreamQuery('query { x }' as any);

		start();
		await new Promise((r) => setTimeout(r, 20));

		stop();

		expect(loading.value).toBe(false);
	});

	it('calls onData for each chunk', async () => {
		const onData = vi.fn();
		const client = {
			queryDefer: vi.fn().mockImplementation(async function* () {
				yield { status: 'success', data: { a: 1 } };
				yield { status: 'success', data: { a: 2 } };
			}),
			query: vi.fn(),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { start } = useStreamQuery('query { x }' as any, { onData });

		start();
		await new Promise((r) => setTimeout(r, 50));

		expect(onData).toHaveBeenCalledTimes(2);
	});

	it('handles errors', async () => {
		const onError = vi.fn();
		const client = {
			queryDefer: vi.fn().mockImplementation(async function* () {
				yield { status: 'error', error: 'fail', errorCode: 'NETWORK_ERROR' };
			}),
			query: vi.fn(),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { status, error, errorCode, start } = useStreamQuery('query { x }' as any, { onError });

		start();
		await new Promise((r) => setTimeout(r, 20));

		expect(status.value).toBe('error');
		expect(error.value).toBe('fail');
		expect(errorCode.value).toBe('NETWORK_ERROR');
		expect(onError).toHaveBeenCalledWith('fail', 'NETWORK_ERROR');
	});

	it('calls onCompleted when stream finishes', async () => {
		const onCompleted = vi.fn();
		const client = {
			queryDefer: vi.fn().mockImplementation(async function* () {
				yield { status: 'success', data: { done: true } };
			}),
			query: vi.fn(),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { status, start } = useStreamQuery('query { x }' as any, { onCompleted });

		start();
		await new Promise((r) => setTimeout(r, 50));

		expect(status.value).toBe('completed');
		expect(onCompleted).toHaveBeenCalledWith({ done: true });
	});
});
