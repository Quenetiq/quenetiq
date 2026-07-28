import { describe, it, expect } from 'vitest';
import { NormalizedCache } from '@quenetiq/cache';

describe('NormalizedCache — FieldPolicy', () => {
	describe('keyFields', () => {
		it('uses custom key fields to build cache key', () => {
			const cache = new NormalizedCache({
				Post: { keyFields: ['slug'] },
			});

			cache.set({ __typename: 'Post', slug: 'hello-world', title: 'Hello' } as never);
			expect(cache.count()).toBe(1);

			const found = cache.get('Post', 'hello-world');
			expect(found).toBeDefined();
			expect((found as Record<string, unknown>)['title']).toBe('Hello');
		});

		it('uses multiple key fields', () => {
			const cache = new NormalizedCache({
				Translation: { keyFields: ['locale', 'key'] },
			});

			cache.set({ __typename: 'Translation', locale: 'en', key: 'greeting', value: 'Hello' } as never);
			expect(cache.count()).toBe(1);

			const found = cache.get('Translation', 'en.greeting');
			expect(found).toBeDefined();
			expect((found as Record<string, unknown>)['value']).toBe('Hello');
		});

		it('falls back to id when keyFields not defined', () => {
			const cache = new NormalizedCache();
			cache.set({ __typename: 'User', id: '1', name: 'Alice' });
			expect(cache.get('User', '1')).toBeDefined();
		});

		it('accounts for keyFields in merge', () => {
			const cache = new NormalizedCache({
				Post: { keyFields: ['slug'] },
			});

			cache.merge({ __typename: 'Post', slug: 'my-post', title: 'Original' } as never);
			cache.merge({ __typename: 'Post', slug: 'my-post', views: 42 } as never);

			const found = cache.get('Post', 'my-post') as Record<string, unknown>;
			expect(found['title']).toBe('Original');
			expect(found['views']).toBe(42);
		});
	});

	describe('custom merge function', () => {
		it('uses custom merge function for pagination', () => {
			const cache = new NormalizedCache({
				PaginatedPosts: {
					merge: (existing, incoming) => ({
						...(incoming as Record<string, unknown>),
						items: [
							...(((existing as Record<string, unknown> | undefined)?.['items'] as unknown[]) ?? []),
							...((incoming as Record<string, unknown>)['items'] as unknown[]),
						],
					}),
				},
			});

			cache.merge({ __typename: 'PaginatedPosts', id: '1', items: [{ id: 'a' }] } as never);
			cache.merge({ __typename: 'PaginatedPosts', id: '1', items: [{ id: 'b' }] } as never);

			const result = cache.get('PaginatedPosts', '1') as Record<string, unknown>;
			expect(result['items'] as unknown[]).toHaveLength(2);
			expect((result['items'] as Record<string, unknown>[])[0]['id']).toBe('a');
			expect((result['items'] as Record<string, unknown>[])[1]['id']).toBe('b');
		});

		it('append merge policy shallow-merges fields into existing', () => {
			const cache = new NormalizedCache({
				LogEntry: { merge: 'append' },
			});

			cache.set({ __typename: 'LogEntry', id: '1', message: 'first', count: 1 } as never);
			cache.merge({ __typename: 'LogEntry', id: '1', message: 'second' } as never);

			const result = cache.get('LogEntry', '1') as Record<string, unknown>;
			expect(result['message']).toBe('second');
			expect(result['count']).toBe(1);
		});

		it('prepend merge policy shallow-merges fields into existing', () => {
			const cache = new NormalizedCache({
				Timeline: { merge: 'prepend' },
			});

			cache.set({ __typename: 'Timeline', id: '1', event: 'old', count: 1 } as never);
			cache.merge({ __typename: 'Timeline', id: '1', event: 'new' } as never);

			const result = cache.get('Timeline', '1') as Record<string, unknown>;
			expect(result['event']).toBe('new');
			expect(result['count']).toBe(1);
		});
	});

	describe('setTypePolicies', () => {
		it('updates policies after construction', () => {
			const cache = new NormalizedCache();

			cache.set({ __typename: 'Post', slug: 'hello', title: 'Original' } as never);
			// Without policy, slug is not used as key -> inline key assigned
			expect(cache.count()).toBe(1);

			// Now set policies
			cache.setTypePolicies({ Post: { keyFields: ['slug'] } });

			// Existing entity with inline key won't be found by slug key
			// But new ones will use the policy
			cache.set({ __typename: 'Post', slug: 'world', title: 'New' } as never);

			const found = cache.get('Post', 'world');
			expect(found).toBeDefined();
			expect((found as Record<string, unknown>)['title']).toBe('New');
		});
	});
});
