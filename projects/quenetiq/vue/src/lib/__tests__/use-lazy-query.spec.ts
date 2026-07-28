import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLazyQuery } from '../use-lazy-query';

vi.mock('../plugin', () => ({
	useClient: vi.fn(),
}));

import { useClient } from '../plugin';

describe('useLazyQuery (Vue)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns initial state with called=false, loading=false', () => {
		const client = { query: vi.fn(), refetch: vi.fn() };
		vi.mocked(useClient).mockReturnValue(client as never);

		const { data, loading, called, error } = useLazyQuery('query { x }' as any);

		expect(called.value).toBe(false);
		expect(loading.value).toBe(false);
		expect(data.value).toBeNull();
		expect(error.value).toBeNull();
	});

	it('execute() calls client.query and sets data', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { title: 'Dune' } }),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { data, loading, called, execute } = useLazyQuery('query { x }' as any);

		await execute();

		expect(client.query).toHaveBeenCalled();
		expect(called.value).toBe(true);
		expect(loading.value).toBe(false);
		expect(data.value).toEqual({ title: 'Dune' });
	});

	it('execute() sets loading=true during execution', async () => {
		let resolvePromise!: (value: unknown) => void;
		const queryPromise = new Promise((resolve) => { resolvePromise = resolve; });
		const client = { query: vi.fn().mockReturnValue(queryPromise), refetch: vi.fn() };
		vi.mocked(useClient).mockReturnValue(client as never);

		const { loading, execute } = useLazyQuery('query { x }' as any);

		const p = execute();
		expect(loading.value).toBe(true);

		resolvePromise({ status: 'success', data: { ok: true } });
		await p;

		expect(loading.value).toBe(false);
	});

	it('execute() handles error result', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'error', error: 'Not found', errorCode: 'GRAPHQL_ERROR' }),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const onError = vi.fn();
		const { error, errorCode, execute } = useLazyQuery('query { x }' as any, { onError });

		await execute();

		expect(error.value).toBe('Not found');
		expect(errorCode.value).toBe('GRAPHQL_ERROR');
		expect(onError).toHaveBeenCalledWith('Not found', 'GRAPHQL_ERROR');
	});

	it('execute() calls onCompleted on success', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: { ok: true } }),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const onCompleted = vi.fn();
		const { execute } = useLazyQuery('query { x }' as any, { onCompleted });

		await execute();

		expect(onCompleted).toHaveBeenCalledWith({ ok: true });
	});

	it('execute() passes variables to client.query', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { execute } = useLazyQuery('query { x }' as any, { variables: { id: '123' } });

		await execute();

		expect(client.query).toHaveBeenCalledWith('query { x }', { id: '123' });
	});

	it('execute() uses override variables when provided', async () => {
		const client = {
			query: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
			refetch: vi.fn(),
		};
		vi.mocked(useClient).mockReturnValue(client as never);

		const { execute } = useLazyQuery('query { x }' as any, { variables: { id: 'default' } });

		await execute({ id: 'override' });

		expect(client.query).toHaveBeenCalledWith('query { x }', { id: 'override' });
	});
});
