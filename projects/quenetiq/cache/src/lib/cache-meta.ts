import type { EntityMeta } from './normalized-cache';

export function getMeta(meta: Map<string, EntityMeta>, key: string): EntityMeta | undefined {
	return meta.get(key);
}

export function getAllMeta(meta: Map<string, EntityMeta>): Map<string, EntityMeta> {
	return new Map(meta);
}

export function getEntityAge(meta: Map<string, EntityMeta>, key: string): number | undefined {
	const m = meta.get(key);
	if (!m) return undefined;
	return Date.now() - m.updatedAt;
}

export function isStale(meta: Map<string, EntityMeta>, key: string, maxAge: number): boolean {
	const m = meta.get(key);
	if (!m) return true;
	return Date.now() - m.updatedAt > maxAge;
}

export function touchMeta(
	meta: Map<string, EntityMeta>,
	key: string,
	source: string,
): void {
	const now = Date.now();
	const existing = meta.get(key);
	if (existing) {
		existing.updatedAt = now;
		existing.source = source;
		existing.mergeCount++;
	} else {
		meta.set(key, { createdAt: now, updatedAt: now, source, mergeCount: 0 });
	}
}
