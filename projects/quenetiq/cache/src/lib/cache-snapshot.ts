import type { CacheEntity, EntityMeta } from './normalized-cache';

export interface CacheSnapshot {
	entities: [string, CacheEntity][];
	meta: [string, EntityMeta][];
}

export function takeSnapshot(
	entities: Map<string, CacheEntity>,
	meta: Map<string, EntityMeta>,
): CacheSnapshot {
	return {
		entities: Array.from(entities.entries()),
		meta: Array.from(meta.entries()),
	};
}

export function restoreSnapshot(
	entities: Map<string, CacheEntity>,
	meta: Map<string, EntityMeta>,
	snapshot: CacheSnapshot,
): void {
	entities.clear();
	meta.clear();
	for (const [key, entity] of snapshot.entities) {
		entities.set(key, entity);
	}
	for (const [key, m] of snapshot.meta) {
		meta.set(key, m);
	}
}
