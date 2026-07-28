import { describe, it, expect, beforeEach } from 'vitest';
import { Observable, of } from 'rxjs';
import { CacheStore } from '@quenetiq/cache';
import { invalidateOn } from '../invalidate-on';

describe('invalidateOn', () => {
	let store: CacheStore;

	beforeEach(() => {
		store = new CacheStore();
	});

	it('passes through values from source', () => {
		const values: unknown[] = [];
		of('a', 'b').pipe(invalidateOn(store, 'User', '1')).subscribe({ next: (v) => values.push(v) });

		expect(values).toEqual(['a', 'b']);
	});

	it('re-subscribes to source when watched entity is written', () => {
		let subscriptions = 0;
		const values: unknown[] = [];

		const source = new Observable<string>((subscriber) => {
			const id = subscriptions++;
			subscriber.next(`val-${id}`);
		});

		source.pipe(invalidateOn(store, 'User', '1')).subscribe({ next: (v) => values.push(v) });

		store.write({ __typename: 'User', id: '1', name: 'Updated' });

		expect(values.length).toBeGreaterThanOrEqual(2);
	});

	it('does not re-subscribe for different entity', () => {
		const values: unknown[] = [];
		of('val').pipe(invalidateOn(store, 'User', '1')).subscribe({ next: (v) => values.push(v) });

		store.write({ __typename: 'Note', id: '99', text: 'irrelevant' });

		expect(values).toEqual(['val']);
	});

	it('does not re-subscribe after source completes', () => {
		let subscriptions = 0;
		const values: unknown[] = [];

		const source = new Observable<string>((subscriber) => {
			subscriptions++;
			subscriber.next('val');
			subscriber.complete();
		});

		source.pipe(invalidateOn(store, 'User', '1')).subscribe({ next: (v) => values.push(v) });

		const before = subscriptions;
		store.write({ __typename: 'User', id: '1', name: 'X' });

		expect(subscriptions).toBe(before);
	});
});
