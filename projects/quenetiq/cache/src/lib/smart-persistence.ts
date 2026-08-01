import type { CacheStorePersist } from './cache-store';
import type { CacheEntity } from './normalized-cache';
import {
	LocalEntityStorage,
	type EntityStorage,
	type EntityStorageConfig,
} from './entity-storage';
import { IndexedDbEntityStorage } from './entity-storage-idb';

export interface SmartPersistConfig extends EntityStorageConfig {
	storage?: 'localStorage' | 'indexedDB' | EntityStorage;
}

export class SmartPersistence implements CacheStorePersist {
	private readonly storage: EntityStorage;

	constructor(config?: SmartPersistConfig) {
		if (config?.storage && typeof config.storage === 'object' && 'get' in config.storage) {
			this.storage = config.storage;
		} else if (config?.storage === 'indexedDB' && typeof indexedDB !== 'undefined') {
			this.storage = new IndexedDbEntityStorage(config);
		} else {
			this.storage = new LocalEntityStorage(config);
		}
	}

	async persist(data: [string, Record<string, unknown>][]): Promise<void> {
		for (const [key, value] of data) {
			const entity = value as CacheEntity;
			if (entity.__typename) {
				await this.storage.set(key, entity);
			} else if (key === '__local_state') {
				this.persistLocalState(value as Record<string, unknown>);
			}
		}
	}

	async restore(): Promise<[string, Record<string, unknown>][] | null> {
		const keys = await this.storage.keys();
		const result: [string, Record<string, unknown>][] = [];
		for (const key of keys) {
			const entry = await this.storage.get(key);
			if (entry) {
				result.push([key, entry.entity as unknown as Record<string, unknown>]);
			}
		}
		return result.length > 0 ? result : null;
	}

	async clear(): Promise<void> {
		await this.storage.clear();
	}

	private persistLocalState(state: Record<string, unknown>): void {
		try {
			localStorage.setItem('qntc:ls', JSON.stringify(state));
		} catch {
			/* empty */
		}
	}
}
