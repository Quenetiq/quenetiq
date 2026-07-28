import { describe, it, expect, vi, beforeEach } from 'vitest';
import { discoverEndpoints } from '../endpoint-discovery';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('discoverEndpoints', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns accessible + hasSchema for valid endpoint', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				data: {
					__schema: {
						queryType: { name: 'Query' },
						types: [{ name: 'User' }, { name: 'Post' }],
					},
				},
			}),
		});

		const results = await discoverEndpoints({
			primary: { url: 'https://api.example.com/graphql' },
		});

		expect(results).toHaveLength(1);
		expect(results[0].accessible).toBe(true);
		expect(results[0].hasSchema).toBe(true);
		expect(results[0].sdlPreview).toBe('2 types found');
	});

	it('returns accessible but no schema when __schema is missing', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ data: {} }),
		});

		const results = await discoverEndpoints({
			beta: { url: 'https://beta.example.com/graphql' },
		});

		expect(results[0].accessible).toBe(true);
		expect(results[0].hasSchema).toBe(false);
	});

	it('returns error when endpoint is unreachable', async () => {
		mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

		const results = await discoverEndpoints({
			dead: { url: 'https://dead.example.com/graphql' },
		});

		expect(results[0].accessible).toBe(false);
		expect(results[0].error).toBe('ECONNREFUSED');
	});

	it('returns error when response is not ok', async () => {
		mockFetch.mockResolvedValue({ ok: false });

		const results = await discoverEndpoints({
			four04: { url: 'https://example.com/404' },
		});

		expect(results[0].accessible).toBe(false);
	});

	it('reports GraphQL errors from introspection', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				errors: [{ message: 'Cannot query field __schema' }],
			}),
		});

		const results = await discoverEndpoints({
			bad: { url: 'https://bad.example.com/graphql' },
		});

		expect(results[0].accessible).toBe(true);
		expect(results[0].hasSchema).toBe(false);
		expect(results[0].error).toBe('Cannot query field __schema');
	});

	it('probes multiple endpoints', async () => {
		mockFetch
			.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ data: { __schema: { types: [1, 2, 3] } } }) })
			.mockResolvedValueOnce({ ok: false });

		const results = await discoverEndpoints({
			a: { url: 'https://a.example.com/graphql' },
			b: { url: 'https://b.example.com/graphql' },
		});

		expect(results).toHaveLength(2);
		expect(results[0].accessible).toBe(true);
		expect(results[1].accessible).toBe(false);
	});
});
