import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createPartialQueryEngine,
	getCachedPartition,
	setCachedPartition,
	clearPartitionCache,
	type QueryPartition,
} from '../partial-query';
import { gql } from '../gql';

const USER_QUERY = gql`query { user { name } }`;
const POSTS_QUERY = gql`query { posts { title } }`;
const NOTIFICATIONS_QUERY = gql`query { notifications { message } }`;

function createMockClient(results: Record<string, unknown>) {
	let callCount = 0;
	return {
		query: vi.fn().mockImplementation(async (doc: unknown, vars?: Record<string, unknown>) => {
			const queryStr = typeof doc === 'string' ? doc : JSON.stringify(doc);
			callCount++;
			// Simulate different results based on call order
			const keys = Object.keys(results);
			const key = keys[callCount - 1] ?? keys[keys.length - 1];
			return { status: 'success', data: results[key] };
		}),
	};
}

describe('Partial Query Engine', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearPartitionCache();
	});

	it('executes all partitions and merges data', async () => {
		const client = createMockClient({
			user: { name: 'John' },
			posts: { title: 'Hello' },
			notifications: { message: 'Welcome' },
		});

		const partitions: QueryPartition[] = [
			{ name: 'user', document: USER_QUERY },
			{ name: 'posts', document: POSTS_QUERY },
			{ name: 'notifications', document: NOTIFICATIONS_QUERY },
		];

		const engine = createPartialQueryEngine(client, partitions);
		const state = await engine.execute();

		expect(state.isComplete).toBe(true);
		expect(state.loading).toBe(false);
		expect(state.error).toBeNull();
		expect(state.partitions['user'].status).toBe('success');
		expect(state.partitions['posts'].status).toBe('success');
		expect(state.partitions['notifications'].status).toBe('success');
	});

	it('returns cached partitions on re-execute', async () => {
		const client = createMockClient({
			user: { name: 'John' },
			posts: { title: 'Hello' },
			notifications: { message: 'Welcome' },
		});

		const partitions: QueryPartition[] = [
			{ name: 'user', document: USER_QUERY },
			{ name: 'posts', document: POSTS_QUERY },
		];

		const engine = createPartialQueryEngine(client, partitions);
		await engine.execute();

		// Second call — should use cache
		const engine2 = createPartialQueryEngine(client, partitions);
		const state = await engine2.execute();

		expect(state.partitions['user'].status).toBe('cached');
		expect(state.partitions['posts'].status).toBe('cached');
	});

	it('resume() only re-executes failed partitions', async () => {
		let callCount = 0;
		const client = {
			query: vi.fn().mockImplementation(async () => {
				callCount++;
				if (callCount === 2) {
					return { status: 'error', error: 'Network timeout' };
				}
				return { status: 'success', data: { result: `call-${callCount}` } };
			}),
		};

		const partitions: QueryPartition[] = [
			{ name: 'user', document: USER_QUERY },
			{ name: 'posts', document: POSTS_QUERY },
			{ name: 'notifications', document: NOTIFICATIONS_QUERY },
		];

		const engine = createPartialQueryEngine(client, partitions);
		const state1 = await engine.execute();

		expect(state1.partitions['user'].status).toBe('success');
		expect(state1.partitions['posts'].status).toBe('error');
		expect(state1.partitions['notifications'].status).toBe('success');
		expect(state1.isComplete).toBe(false);

		// Resume — should only re-execute 'posts'
		client.query.mockImplementation(async () => {
			return { status: 'success', data: { result: 'recovered' } };
		});

		const state2 = await engine.resume();
		expect(state2.isComplete).toBe(true);
		expect(state2.partitions['user'].status).toBe('cached');
		expect(state2.partitions['posts'].status).toBe('success');
		expect(state2.partitions['notifications'].status).toBe('cached');
	});

	it('respects dependency order', async () => {
		const executionOrder: string[] = [];
		const client = {
			query: vi.fn().mockImplementation(async (doc: unknown) => {
				return { status: 'success', data: {} };
			}),
		};

		const partitions: QueryPartition[] = [
			{ name: 'base', document: USER_QUERY },
			{ name: 'derived', document: POSTS_QUERY, dependsOn: ['base'] },
		];

		const engine = createPartialQueryEngine(client, partitions);
		await engine.execute();

		// Both should complete
		const state = engine.getState();
		expect(state.isComplete).toBe(true);
	});

	it('isPartial is true when some partitions were cached', async () => {
		// First run — cache only 'user', fail 'posts'
		let callCount = 0;
		const client1 = {
			query: vi.fn().mockImplementation(async () => {
				callCount++;
				if (callCount === 1) return { status: 'success', data: { name: 'John' } };
				return { status: 'error', error: 'Network error' };
			}),
		};
		const engine1 = createPartialQueryEngine(client1, [
			{ name: 'user', document: USER_QUERY },
			{ name: 'posts', document: POSTS_QUERY },
		]);
		await engine1.execute();

		// Second run — 'user' is cached, 'posts' succeeds now
		const client2 = createMockClient({ posts: { title: 'Hello' } });
		const engine2 = createPartialQueryEngine(client2, [
			{ name: 'user', document: USER_QUERY },
			{ name: 'posts', document: POSTS_QUERY },
		]);
		const state = await engine2.execute();

		expect(state.isPartial).toBe(true);
		expect(state.partitions['user'].status).toBe('cached');
		expect(state.partitions['posts'].status).toBe('success');
	});

	it('reports errors per partition', async () => {
		let callCount = 0;
		const client = {
			query: vi.fn().mockImplementation(async () => {
				callCount++;
				if (callCount === 1) {
					return { status: 'success', data: { name: 'John' } };
				}
				return { status: 'error', error: 'Server error' };
			}),
		};

		const engine = createPartialQueryEngine(client, [
			{ name: 'user', document: USER_QUERY },
			{ name: 'posts', document: POSTS_QUERY },
		]);
		const state = await engine.execute();

		expect(state.error).toBe('Server error');
		expect(state.partitions['user'].status).toBe('success');
		expect(state.partitions['posts'].status).toBe('error');
		expect(state.partitions['posts'].error).toBe('Server error');
	});

	it('onStateChange is called on each state update', async () => {
		const client = createMockClient({ user: { name: 'John' } });
		const onStateChange = vi.fn();

		const engine = createPartialQueryEngine(client, [
			{ name: 'user', document: USER_QUERY },
		], { onStateChange });

		await engine.execute();
		expect(onStateChange).toHaveBeenCalled();
	});

	it('clearPartitionCache resets all cached data', async () => {
		setCachedPartition('test', { data: 'hello' });
		expect(getCachedPartition('test')).toEqual({ data: 'hello' });

		clearPartitionCache();
		expect(getCachedPartition('test')).toBeUndefined();
	});

	it('cache uses variables in key', () => {
		setCachedPartition('user', { name: 'John' }, { id: '1' });
		setCachedPartition('user', { name: 'Jane' }, { id: '2' });

		expect(getCachedPartition('user', { id: '1' })).toEqual({ name: 'John' });
		expect(getCachedPartition('user', { id: '2' })).toEqual({ name: 'Jane' });
	});
});
