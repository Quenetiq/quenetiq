import type { CacheEntity, TypePolicy } from './normalized-cache';

let inlineCounter = 0;

export function inlineKey(typename: string): string {
	return `${typename}:__inline__${++inlineCounter}`;
}

export function resetInlineCounter(): void {
	inlineCounter = 0;
}

export function buildKey(typename: string, entity: CacheEntity, policy?: TypePolicy): string | null {
	if (policy?.keyFn) {
		return policy.keyFn(entity);
	}
	const keyFields = policy?.keyFields;
	if (!keyFields || keyFields.length === 0) {
		const id = entity['id'];
		if (id !== undefined && id !== null) return `${typename}:${String(id)}`;
		return null;
	}
	const parts = keyFields.map((f) => {
		const v = entity[f];
		return v !== undefined && v !== null ? String(v) : 'null';
	});
	return `${typename}:${parts.join('.')}`;
}

export function simpleKey(typename: string, id: string): string {
	return `${typename}:${id}`;
}

export function allKeys(entities: Map<string, CacheEntity>): string[] {
	return Array.from(entities.keys());
}

export function keysByType(entities: Map<string, CacheEntity>, typename: string): string[] {
	const prefix = `${typename}:`;
	return Array.from(entities.keys()).filter((k) => k.startsWith(prefix));
}

export function getEntityTypes(entities: Map<string, CacheEntity>): string[] {
	const types = new Set<string>();
	for (const key of entities.keys()) {
		const idx = key.indexOf(':');
		if (idx > 0) types.add(key.slice(0, idx));
	}
	return Array.from(types);
}
