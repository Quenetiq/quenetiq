import { describe, it, expect, vi, beforeEach } from 'vitest';
import { endpointMockMiddleware } from '../endpoint-mock-middleware';
import type { GraphqlRequestContext } from '@quenetiq/client';

function mockRequest(overrides?: Partial<GraphqlRequestContext>): GraphqlRequestContext {
	return {
		query: 'query GetUser { user { id name email } }',
		variables: {},
		headers: {},
		type: 'query',
		...overrides,
	};
}

describe('endpointMockMiddleware', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns mock data without calling next', async () => {
		const next = vi.fn();
		const mw = endpointMockMiddleware();

		const result = await mw(mockRequest(), next);

		expect(next).not.toHaveBeenCalled();
		expect(result.status).toBe('success');
		expect(result.data).toHaveProperty('id');
		expect(result.data).toHaveProperty('name');
		expect(result.data).toHaveProperty('email');
	});

	it('extracts type name from query', async () => {
		const next = vi.fn();
		const mw = endpointMockMiddleware();

		const result = await mw(
			mockRequest({ query: 'mutation CreatePost { createPost { id title } }' }),
			next,
		);

		expect(result.status).toBe('success');
		expect(result.data).toHaveProperty('id');
	});

	it('uses custom mock resolvers', async () => {
		const next = vi.fn();
		const mw = endpointMockMiddleware({
			mocks: {
				user: (typeName, fieldName) => {
					if (fieldName === 'name') return 'Custom Alice';
					return undefined;
				},
			},
		});

		const result = await mw(mockRequest(), next);

		expect(result.status).toBe('success');
		expect((result.data as Record<string, unknown>)['name']).toBe('Custom Alice');
	});

	it('passthrough URL goes to next', async () => {
		const next = vi.fn().mockResolvedValue({ status: 'success', data: { real: true } });
		const mw = endpointMockMiddleware({ passthrough: ['https://real.api.com/graphql'] });

		const result = await mw(
			mockRequest({ endpoint: 'https://real.api.com/graphql' }),
			next,
		);

		expect(next).toHaveBeenCalled();
		expect(result).toEqual({ status: 'success', data: { real: true } });
	});

	it('applies delay', async () => {
		const next = vi.fn();
		const start = Date.now();
		const mw = endpointMockMiddleware({ delay: 50 });

		await mw(mockRequest(), next);

		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(40);
	});
});
