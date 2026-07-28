import { Observable } from 'rxjs';
import type { CacheEntity, CacheStore } from '@quenetiq/cache';

interface EntityRef {
	__typename: string;
	id: string;
}

function extractEntities(value: unknown, results: EntityRef[] = []): EntityRef[] {
	if (!value || typeof value !== 'object') return results;
	if (Array.isArray(value)) {
		for (const item of value) {
			extractEntities(item, results);
		}
		return results;
	}

	const obj = value as Record<string, unknown>;
	if (typeof obj.__typename === 'string' && typeof obj.id === 'string') {
		results.push({ __typename: obj.__typename as string, id: obj.id as string });
	}

	for (const v of Object.values(obj)) {
		extractEntities(v, results);
	}

	return results;
}

function entitiesChanged(
	prev: Set<string>,
	entity: Partial<CacheEntity> & { __typename: string; id?: string },
): boolean {
	if (entity.id !== undefined) {
		return prev.has(`${entity.__typename}:${entity.id}`);
	}
	for (const key of prev) {
		if (key.startsWith(`${entity.__typename}:`)) {
			return true;
		}
	}
	return false;
}

export function observeQuery<TData = Record<string, unknown>>(
	store: CacheStore,
	queryHash: string,
	extractData?: () => TData | undefined,
): Observable<TData | undefined> {
	return new Observable<TData | undefined>((subscriber) => {
		let lastEntities = new Set<string>();

		const emit = (): void => {
			try {
				const data = extractData
					? extractData()
					: (store.readQuery<TData>(queryHash) ?? undefined);
				subscriber.next(data);
			} catch (e) {
				subscriber.error(e);
			}
		};

		const rebuildEntitySet = (): Set<string> => {
			const data = extractData
				? extractData()
				: (store.readQuery<unknown>(queryHash) ?? undefined);
			if (!data) return new Set();
			const refs = extractEntities(data);
			return new Set(refs.map((r) => `${r.__typename}:${r.id}`));
		};

		emit();
		lastEntities = rebuildEntitySet();

		const unsub = store.events.on((event) => {
			if (event.type === 'clear') {
				emit();
				lastEntities = rebuildEntitySet();
				return;
			}

			if (event.type === 'write' || event.type === 'merge') {
				const entity = event.data.entity;
				if (entitiesChanged(lastEntities, entity)) {
					emit();
					lastEntities = rebuildEntitySet();
				}
				return;
			}

			if (event.type === 'evict') {
				const key = `${event.data.typename}:${event.data.id}`;
				if (lastEntities.has(key)) {
					emit();
					lastEntities = rebuildEntitySet();
				}
				return;
			}
		});

		return () => {
			unsub();
		};
	});
}
