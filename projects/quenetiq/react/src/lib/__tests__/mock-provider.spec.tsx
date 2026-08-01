import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { gql } from '@quenetiq/client';
import { MockedProvider } from '../mock-provider';
import { useClient } from '../provider';

const TEST_QUERY = gql`
	query TestQuery { user(id: "1") { id name } }
`;

const SCHEMA = `
	type Query { user(id: ID!): User }
	type User { id: ID!, name: String!, email: String! }
`;

describe('MockedProvider', () => {
	it('provides a client via context', () => {
		const { result } = renderHook(() => useClient(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={[]}>{children}</MockedProvider>
			),
		});

		expect(result.current).toBeDefined();
		expect(result.current.query).toBeTypeOf('function');
	});

	it('returns mock result for matching query', async () => {
		const mockData = { user: { id: '1', name: 'Alice', __typename: 'User' } };
		const { result } = renderHook(() => useClient(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={[{ document: TEST_QUERY, result: { status: 'success', data: mockData } }]}>
					{children}
				</MockedProvider>
			),
		});

		const res = await result.current.query(TEST_QUERY);
		expect(res.status).toBe('success');
		if (res.status === 'success') {
			expect(res.data).toEqual(mockData);
		}
	});

	it('returns schema-generated data for unmatched query', async () => {
		const { result } = renderHook(() => useClient(), {
			wrapper: ({ children }) => (
				<MockedProvider schema={SCHEMA} addTypename>
					{children}
				</MockedProvider>
			),
		});

		const res = await result.current.query(TEST_QUERY);
		expect(res.status).toBe('success');
	});

	it('throws in strict mode with no mock and no schema', async () => {
		const { result } = renderHook(() => useClient(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={[]} strict>
					{children}
				</MockedProvider>
			),
		});

		await expect(result.current.query(TEST_QUERY)).rejects.toThrow('No mock found');
	});

	it('addTypename adds __typename to mock result', async () => {
		const mockData = { user: { id: '1', name: 'Alice' } };
		const { result } = renderHook(() => useClient(), {
			wrapper: ({ children }) => (
				<MockedProvider
					mocks={[{ document: TEST_QUERY, result: { status: 'success', data: mockData } }]}
					addTypename
				>
					{children}
				</MockedProvider>
			),
		});

		const res = await result.current.query(TEST_QUERY);
		expect(res.status).toBe('success');
		if (res.status === 'success') {
			expect((res.data as Record<string, unknown>).user).toHaveProperty('__typename');
		}
	});

	it('respects delay on mock', async () => {
		const mockData = { user: { id: '1' } };
		const { result } = renderHook(() => useClient(), {
			wrapper: ({ children }) => (
				<MockedProvider
					mocks={[{ document: TEST_QUERY, result: { status: 'success', data: mockData }, delay: 100 }]}
				>
					{children}
				</MockedProvider>
			),
		});

		const start = Date.now();
		await result.current.query(TEST_QUERY);
		const elapsed = Date.now() - start;

		expect(elapsed).toBeGreaterThanOrEqual(90);
	});
});
