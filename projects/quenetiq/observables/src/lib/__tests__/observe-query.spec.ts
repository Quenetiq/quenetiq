import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { CacheStore } from '@quenetiq/cache';
import { observeQuery } from '../observe-query';

describe('observeQuery', () => {
	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	it('emits initial data from readQuery', async () => {
		const data = { users: [{ __typename: 'User', id: '1', name: 'Alice' }] };
		store.writeQuery('q:hash', data);

		const result = await firstValueFrom(observeQuery(store, 'q:hash'));

		expect(result).toEqual(data);
	});

	it('emits undefined when no query data exists', async () => {
		const result = await firstValueFrom(observeQuery(store, 'q:missing'));

		expect(result).toBeUndefined();
	});

	it('re-emits when a referenced entity changes', async () => {
		const data = { users: [{ __typename: 'User', id: '1', name: 'Alice' }] };
		store.writeQuery('q:users', data);
		store.recordQueryDependencies('q:users', new Set(['User:1']));

		const values: unknown[] = [];
		observeQuery(store, 'q:users').subscribe({ next: (v) => values.push(v) });

		store.write({ __typename: 'User', id: '1', name: 'Bob' });

		expect(values.length).toBeGreaterThanOrEqual(2);
	});

	it('uses custom extractData function', async () => {
		const extractData = () => ({ custom: true });

		const result = await firstValueFrom(observeQuery(store, 'q:hash', extractData));

		expect(result).toEqual({ custom: true });
	});
});
