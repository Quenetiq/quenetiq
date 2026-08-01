import type { CacheEntity, OptimisticUpdate } from './normalized-cache';

export function applyOptimistic(
	entities: Map<string, CacheEntity>,
	optimistics: Map<string, OptimisticUpdate>,
	update: OptimisticUpdate,
): void {
	const before = new Map(entities);
	update.apply(entities);

	const changed = new Map<string, CacheEntity | undefined>();
	for (const [k, v] of entities) {
		const prev = before.get(k);
		if (prev !== v) {
			changed.set(k, prev);
		}
	}
	for (const [k, v] of before) {
		if (!entities.has(k)) {
			changed.set(k, v);
		}
	}

	optimistics.set(update.id, {
		...update,
		rollback: () => {
			for (const [k, prevVal] of changed) {
				if (prevVal === undefined) {
					entities.delete(k);
				} else {
					entities.set(k, prevVal);
				}
			}
			optimistics.delete(update.id);
		},
	});
}

export function rollbackOptimistic(
	entities: Map<string, CacheEntity>,
	optimistics: Map<string, OptimisticUpdate>,
	id: string,
): void {
	const update = optimistics.get(id);
	if (update) {
		update.rollback(entities);
	}
}

export function commitOptimistic(
	optimistics: Map<string, OptimisticUpdate>,
	id: string,
): void {
	optimistics.delete(id);
}
