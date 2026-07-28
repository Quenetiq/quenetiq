import { describe, it, expect, vi, beforeEach } from 'vitest';


let mockQueryFn: any;

// Mock @angular/core — inject returns a mock service whose query() delegates to mockQueryFn
vi.mock('@angular/core', () => {
	function createMockSignal(value: unknown) {
		const sig = (() => sig._value) as any;
		sig._value = value;
		sig.set = (v: unknown) => { sig._value = v; };
		sig.asReadonly = () => sig;
		return sig;
	}

	return {
		inject: vi.fn(() => ({
			query: (...args: unknown[]) => ({
				toPromise: () => Promise.resolve(mockQueryFn(...args)),
			}),
		})),
		signal: vi.fn((v: unknown) => createMockSignal(v)),
	};
});

vi.mock('@quenetiq/core', () => ({ gql: (strings: TemplateStringsArray) => strings.join('') }));

// Mock services — these exist so imports resolve, but inject() overrides them
vi.mock('../graphql.service', () => ({
	GraphqlService: class {
		query() { return { toPromise: () => Promise.resolve(mockQueryFn()) }; }
	},
}));

vi.mock('../endpoints.service', () => ({
	EndpointsService: class {
		getRoute() { return undefined; }
	},
}));

import { injectPartialQuery, getCachedPartition, setCachedPartition, clearPartitionCache } from '../partial-query';
import { gql } from '../gql';

const USER_QUERY = gql`query { user { name } }`;
const POSTS_QUERY = gql`query { posts { title } }`;
const NOTIFICATIONS_QUERY = gql`query { notifications { message } }`;

describe('injectPartialQuery (Angular)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearPartitionCache();
	});

	it('executes all partitions and merges data', async () => {
		let callCount = 0;
		const results = [
			{ status: 'success' as const, data: { name: 'John' } },
			{ status: 'success' as const, data: { title: 'Hello' } },
			{ status: 'success' as const, data: { message: 'Welcome' } },
		];
		mockQueryFn = () => results[callCount++];

		const handle = injectPartialQuery([
			{ name: 'user', document: USER_QUERY },
			{ name: 'posts', document: POSTS_QUERY },
			{ name: 'notifications', document: NOTIFICATIONS_QUERY },
		]);

		await new Promise((r) => setTimeout(r, 50));

		expect(handle.isComplete()).toBe(true);
		expect(handle.loading()).toBe(false);
		expect(handle.partitions()['user'].status).toBe('success');
		expect(handle.partitions()['posts'].status).toBe('success');
		expect(handle.partitions()['notifications'].status).toBe('success');
	});

	it('reports per-partition errors', async () => {
		let callCount = 0;
		mockQueryFn = () => {
			callCount++;
			if (callCount === 2) return { status: 'error' as const, error: 'Network error' };
			return { status: 'success' as const, data: { name: 'John' } };
		};

		const handle = injectPartialQuery([
			{ name: 'user', document: USER_QUERY },
			{ name: 'posts', document: POSTS_QUERY },
			{ name: 'notifications', document: NOTIFICATIONS_QUERY },
		]);

		await new Promise((r) => setTimeout(r, 50));

		expect(handle.isComplete()).toBe(false);
		expect(handle.partitions()['user'].status).toBe('success');
		expect(handle.partitions()['posts'].status).toBe('error');
		expect(handle.partitions()['posts'].error).toBe('Network error');
	});

	it('isPartial is true when some partitions were cached', async () => {
		setCachedPartition('user', { name: 'John' });

		mockQueryFn = () => ({ status: 'success' as const, data: { title: 'Hello' } });

		const handle = injectPartialQuery([
			{ name: 'user', document: USER_QUERY },
			{ name: 'posts', document: POSTS_QUERY },
		]);

		await new Promise((r) => setTimeout(r, 50));

		expect(handle.isPartial()).toBe(true);
		expect(handle.partitions()['user'].status).toBe('cached');
		expect(handle.partitions()['posts'].status).toBe('success');
	});

	it('cache uses variables in key', () => {
		setCachedPartition('user', { name: 'John' }, { id: '1' });
		setCachedPartition('user', { name: 'Jane' }, { id: '2' });

		expect(getCachedPartition('user', { id: '1' })).toEqual({ name: 'John' });
		expect(getCachedPartition('user', { id: '2' })).toEqual({ name: 'Jane' });
	});

	it('clearPartitionCache resets all cached data', () => {
		setCachedPartition('test', { data: 'hello' });
		expect(getCachedPartition('test')).toEqual({ data: 'hello' });

		clearPartitionCache();
		expect(getCachedPartition('test')).toBeUndefined();
	});

	it('calls onPartitionComplete callback', async () => {
		mockQueryFn = () => ({ status: 'success' as const, data: { name: 'John' } });
		const onPartitionComplete = vi.fn();

		injectPartialQuery([{ name: 'user', document: USER_QUERY }], { onPartitionComplete });

		await new Promise((r) => setTimeout(r, 50));

		expect(onPartitionComplete).toHaveBeenCalledWith('user', { name: 'John' });
	});

	it('calls onPartitionError callback', async () => {
		mockQueryFn = () => ({ status: 'error' as const, error: 'Failed' });
		const onPartitionError = vi.fn();

		injectPartialQuery([{ name: 'user', document: USER_QUERY }], { onPartitionError });

		await new Promise((r) => setTimeout(r, 50));

		expect(onPartitionError).toHaveBeenCalledWith('user', 'Failed');
	});

	it('respects dependency order', async () => {
		mockQueryFn = () => ({ status: 'success' as const, data: {} });

		const handle = injectPartialQuery([
			{ name: 'base', document: USER_QUERY },
			{ name: 'derived', document: POSTS_QUERY, dependsOn: ['base'] },
		]);

		await new Promise((r) => setTimeout(r, 50));

		expect(handle.isComplete()).toBe(true);
		expect(handle.partitions()['base'].status).toBe('success');
		expect(handle.partitions()['derived'].status).toBe('success');
	});
});
