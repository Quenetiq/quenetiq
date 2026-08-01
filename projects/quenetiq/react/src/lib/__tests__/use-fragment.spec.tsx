import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { gql, type TypedDocumentNode } from '@quenetiq/client';
import { CacheStore } from '@quenetiq/cache';
import { useFragment } from '../use-fragment';
import { QuenetiqProvider, useClient } from '../provider';
import { QuenetiqClient } from '@quenetiq/client';
import type { ReactNode } from 'react';

const USER_FRAGMENT = gql`
	fragment UserFields on User {
		id
		name
		email
	}
` as TypedDocumentNode<{ id: string; name: string; email: string }>;

function wrapper(client: QuenetiqClient, cache: CacheStore) {
	return ({ children }: { children: ReactNode }) =>
		<QuenetiqProvider client={client} cache={cache}>{children}</QuenetiqProvider>;
}

describe('useFragment', () => {
	it('returns null for null identifier', () => {
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);

		const { result } = renderHook(
			() => useFragment(USER_FRAGMENT, null),
			{ wrapper: wrapper(client, cache) },
		);

		expect(result.current.data).toBeNull();
		expect(result.current.complete).toBe(false);
	});

	it('reads entity from cache by typename and id', () => {
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);
		cache.write({ __typename: 'User', id: '1', name: 'Alice', email: 'a@b.com' });

		const { result } = renderHook(
			() => useFragment(USER_FRAGMENT, { __typename: 'User', id: '1' }),
			{ wrapper: wrapper(client, cache) },
		);

		expect(result.current.data).toBeDefined();
		expect(result.current.complete).toBe(true);
		if (result.current.data) {
			expect(result.current.data.name).toBe('Alice');
		}
	});

	it('returns null for non-existent entity', () => {
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);

		const { result } = renderHook(
			() => useFragment(USER_FRAGMENT, { __typename: 'User', id: '999' }),
			{ wrapper: wrapper(client, cache) },
		);

		expect(result.current.data).toBeNull();
	});

	it('returns masked fields (only what fragment declares)', () => {
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);
		cache.write({ __typename: 'User', id: '1', name: 'Alice', email: 'a@b.com', age: 30, secret: 'hidden' });

		const { result } = renderHook(
			() => useFragment(USER_FRAGMENT, { __typename: 'User', id: '1' }),
			{ wrapper: wrapper(client, cache) },
		);

		expect(result.current.data).toBeDefined();
		if (result.current.data) {
			expect(result.current.data).toHaveProperty('id');
			expect(result.current.data).toHaveProperty('name');
			expect(result.current.data).toHaveProperty('email');
			expect((result.current.data as Record<string, unknown>)).not.toHaveProperty('age');
			expect((result.current.data as Record<string, unknown>)).not.toHaveProperty('secret');
		}
	});

	it('updates data when entity is written', async () => {
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);
		cache.write({ __typename: 'User', id: '1', name: 'Alice' });

		const { result } = renderHook(
			() => useFragment(USER_FRAGMENT, { __typename: 'User', id: '1' }),
			{ wrapper: wrapper(client, cache) },
		);

		expect(result.current.data?.name).toBe('Alice');

		cache.write({ __typename: 'User', id: '1', name: 'Bob' });

		await waitFor(() => {
			expect(result.current.data?.name).toBe('Bob');
		});
	});

	it('sets data to null when entity is evicted', async () => {
		const cache = new CacheStore();
		const client = new QuenetiqClient({ endpoint: '/graphql' }, cache);
		cache.write({ __typename: 'User', id: '1', name: 'Alice' });

		const { result } = renderHook(
			() => useFragment(USER_FRAGMENT, { __typename: 'User', id: '1' }),
			{ wrapper: wrapper(client, cache) },
		);

		expect(result.current.data).not.toBeNull();

		cache.evict('User', '1');

		await waitFor(() => {
			expect(result.current.data).toBeNull();
		});
	});
});
