import { describe, it, expect } from 'vitest';
import { applyOptimistic, rollbackOptimistic, commitOptimistic } from '../cache-optimistic';
import type { CacheEntity, OptimisticUpdate } from '../normalized-cache';

function makeEntities(): Map<string, CacheEntity> {
	return new Map([
		['User:1', { __typename: 'User', id: '1', name: 'Alice', age: 30 }],
		['User:2', { __typename: 'User', id: '2', name: 'Bob', age: 25 }],
	]);
}

describe('applyOptimistic', () => {
	it('applies the update to entities and stores rollback', () => {
		const entities = makeEntities();
		const optimistics = new Map<string, OptimisticUpdate>();

		applyOptimistic(entities, optimistics, {
			id: 'opt-1',
			apply: (e) => {
				const alice = e.get('User:1')!;
				e.set('User:1', { ...alice, name: 'Optimistic Alice' });
			},
			rollback: () => {},
		});

		expect(entities.get('User:1')!['name']).toBe('Optimistic Alice');
		expect(optimistics.has('opt-1')).toBe(true);
	});

	it('preserves unrelated entities', () => {
		const entities = makeEntities();
		const optimistics = new Map<string, OptimisticUpdate>();

		applyOptimistic(entities, optimistics, {
			id: 'opt-1',
			apply: (e) => e.delete('User:2'),
			rollback: () => {},
		});

		expect(entities.has('User:1')).toBe(true);
		expect(entities.has('User:2')).toBe(false);
	});

	it('wraps rollback to restore previous state', () => {
		const entities = makeEntities();
		const optimistics = new Map<string, OptimisticUpdate>();

		applyOptimistic(entities, optimistics, {
			id: 'opt-1',
			apply: (e) => {
				const alice = e.get('User:1')!;
				e.set('User:1', { ...alice, name: 'Mutated' });
			},
			rollback: () => {},
		});

		const update = optimistics.get('opt-1')!;
		update.rollback(entities);

		expect(entities.get('User:1')!['name']).toBe('Alice');
	});

	it('rollback restores deleted entities', () => {
		const entities = makeEntities();
		const optimistics = new Map<string, OptimisticUpdate>();

		applyOptimistic(entities, optimistics, {
			id: 'opt-del',
			apply: (e) => {
				e.delete('User:1');
			},
			rollback: () => {},
		});

		expect(entities.has('User:1')).toBe(false);

		const update = optimistics.get('opt-del')!;
		update.rollback(entities);

		expect(entities.get('User:1')).toEqual({ __typename: 'User', id: '1', name: 'Alice', age: 30 });
	});

	it('tracks new entities added by the optimistic update for deletion on rollback', () => {
		const entities = makeEntities();
		const optimistics = new Map<string, OptimisticUpdate>();

		applyOptimistic(entities, optimistics, {
			id: 'opt-new',
			apply: (e) => {
				e.set('User:3', { __typename: 'User', id: '3', name: 'New', age: 99 });
			},
			rollback: () => {},
		});

		expect(entities.has('User:3')).toBe(true);

		const update = optimistics.get('opt-new')!;
		update.rollback(entities);

		expect(entities.has('User:3')).toBe(false);
	});
});

describe('rollbackOptimistic', () => {
	it('calls rollback and removes the optimistic update', () => {
		const entities = makeEntities();
		const optimistics = new Map<string, OptimisticUpdate>();

		applyOptimistic(entities, optimistics, {
			id: 'opt-rb',
			apply: (e) => {
				const b = e.get('User:2')!;
				e.set('User:2', { ...b, age: 100 });
			},
			rollback: () => {},
		});

		expect(entities.get('User:2')!['age']).toBe(100);

		rollbackOptimistic(entities, optimistics, 'opt-rb');

		expect(entities.get('User:2')!['age']).toBe(25);
		expect(optimistics.has('opt-rb')).toBe(false);
	});

	it('does nothing if optimistic id does not exist', () => {
		const entities = makeEntities();
		const optimistics = new Map<string, OptimisticUpdate>();

		expect(() => rollbackOptimistic(entities, optimistics, 'nonexistent')).not.toThrow();
	});
});

describe('commitOptimistic', () => {
	it('removes the optimistic update without rolling back', () => {
		const entities = makeEntities();
		const optimistics = new Map<string, OptimisticUpdate>();

		applyOptimistic(entities, optimistics, {
			id: 'opt-commit',
			apply: (e) => {
				const a = e.get('User:1')!;
				e.set('User:1', { ...a, name: 'Committed' });
			},
			rollback: () => {},
		});

		commitOptimistic(optimistics, 'opt-commit');

		expect(optimistics.has('opt-commit')).toBe(false);
		expect(entities.get('User:1')!['name']).toBe('Committed');
	});

	it('does nothing if optimistic id does not exist', () => {
		const optimistics = new Map<string, OptimisticUpdate>();
		expect(() => commitOptimistic(optimistics, 'ghost')).not.toThrow();
	});
});
