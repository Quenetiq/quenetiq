import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../plugin', () => ({
	useClient: vi.fn(),
}));

import { useFragment } from '../use-fragment';
import { useClient } from '../plugin';

describe('useFragment (Vue)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns entity data when found in cache', () => {
		const cache = { query: vi.fn().mockReturnValue({ id: '1', title: 'Dune', __typename: 'Book' }) };
		const client = { getCacheService: vi.fn().mockReturnValue(cache) };
		vi.mocked(useClient).mockReturnValue(client as never);

		const { data, complete } = useFragment<{ id: string; title: string; __typename: string }>({} as never, {
			__typename: 'Book',
			id: '1',
		});

		expect(cache.query).toHaveBeenCalledWith('Book', '1');
		expect(data).toEqual({ id: '1', title: 'Dune', __typename: 'Book' });
		expect(complete).toBe(true);
	});

	it('returns complete: false when entity not in cache', () => {
		const cache = { query: vi.fn().mockReturnValue(null) };
		const client = { getCacheService: vi.fn().mockReturnValue(cache) };
		vi.mocked(useClient).mockReturnValue(client as never);

		const { data, complete } = useFragment({} as never, { __typename: 'Book', id: 'missing' });

		expect(data).toBeNull();
		expect(complete).toBe(false);
	});

	it('returns complete: false when identifier is null', () => {
		const { data, complete } = useFragment({} as never, null);

		expect(data).toBeNull();
		expect(complete).toBe(false);
	});

	it('returns complete: false when no cache service available', () => {
		const client = { getCacheService: vi.fn().mockReturnValue(null) };
		vi.mocked(useClient).mockReturnValue(client as never);

		const { data, complete } = useFragment({} as never, { __typename: 'Book', id: '1' });

		expect(data).toBeNull();
		expect(complete).toBe(false);
	});

	it('passes empty string as id when identifier has no id', () => {
		const cache = { query: vi.fn().mockReturnValue(null) };
		const client = { getCacheService: vi.fn().mockReturnValue(cache) };
		vi.mocked(useClient).mockReturnValue(client as never);

		useFragment({} as never, { __typename: 'Book' });

		expect(cache.query).toHaveBeenCalledWith('Book', '');
	});
});
