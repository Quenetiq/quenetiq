import type { CacheEntity } from './normalized-cache';
import type { EntityStorage, EntityStorageConfig, StoredEntityMeta } from './entity-storage';

const DB_NAME = 'quenetiq-cache';
const DB_VERSION = 1;
const STORE_NAME = 'entities';
const META_STORE_NAME = 'meta';

interface IdbEntityRecord {
	key: string;
	entity: CacheEntity;
}

interface IdbMetaRecord {
	key: string;
	meta: StoredEntityMeta;
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
				store.createIndex('typename', 'entity.__typename', { unique: false });
			}
			if (!db.objectStoreNames.contains(META_STORE_NAME)) {
				db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export class IndexedDbEntityStorage implements EntityStorage {
	private ttlConfig: Record<string, number>;
	private prefix: string;

	constructor(config?: EntityStorageConfig) {
		this.prefix = config?.prefix ?? 'qntc:ec:';
		this.ttlConfig = config?.ttl ?? {};
	}

	private storageKey(key: string): string {
		return `${this.prefix}${key}`;
	}

	async get(key: string): Promise<{ entity: CacheEntity; meta: StoredEntityMeta } | undefined> {
		const sk = this.storageKey(key);
		const db = await openDb();
		try {
			const entityRec = await new Promise<IdbEntityRecord | undefined>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readonly');
				const store = tx.objectStore(STORE_NAME);
				const req = store.get(sk);
				req.onsuccess = () => resolve(req.result ?? undefined);
				req.onerror = () => reject(req.error);
			});
			if (!entityRec) return undefined;

			const metaRec = await new Promise<IdbMetaRecord | undefined>((resolve, reject) => {
				const tx = db.transaction(META_STORE_NAME, 'readonly');
				const store = tx.objectStore(META_STORE_NAME);
				const req = store.get(sk);
				req.onsuccess = () => resolve(req.result ?? undefined);
				req.onerror = () => reject(req.error);
			});
			const meta: StoredEntityMeta = metaRec?.meta ?? { createdAt: Date.now(), updatedAt: Date.now() };

			const typeTtl = this.ttlConfig[entityRec.entity.__typename];
			if (typeTtl != null && Date.now() - meta.updatedAt > typeTtl) {
				await this.delete(key);
				return undefined;
			}

			return { entity: entityRec.entity, meta };
		} finally {
			db.close();
		}
	}

	async set(key: string, entity: CacheEntity, meta?: Partial<StoredEntityMeta>): Promise<void> {
		const sk = this.storageKey(key);
		const db = await openDb();
		try {
			const existingMeta = await new Promise<IdbMetaRecord | undefined>((resolve, reject) => {
				const tx = db.transaction(META_STORE_NAME, 'readonly');
				const store = tx.objectStore(META_STORE_NAME);
				const req = store.get(sk);
				req.onsuccess = () => resolve(req.result ?? undefined);
				req.onerror = () => reject(req.error);
			});

			const now = Date.now();
			const fullMeta: StoredEntityMeta = {
				createdAt: existingMeta?.meta.createdAt ?? now,
				updatedAt: now,
				...meta,
			};

			const entityTx = db.transaction(STORE_NAME, 'readwrite');
			entityTx.objectStore(STORE_NAME).put({ key: sk, entity } as IdbEntityRecord);
			await new Promise<void>((resolve, reject) => {
				entityTx.oncomplete = () => resolve();
				entityTx.onerror = () => reject(entityTx.error);
			});

			const metaTx = db.transaction(META_STORE_NAME, 'readwrite');
			metaTx.objectStore(META_STORE_NAME).put({ key: sk, meta: fullMeta } as IdbMetaRecord);
			await new Promise<void>((resolve, reject) => {
				metaTx.oncomplete = () => resolve();
				metaTx.onerror = () => reject(metaTx.error);
			});
		} finally {
			db.close();
		}
	}

	async delete(key: string): Promise<void> {
		const sk = this.storageKey(key);
		const db = await openDb();
		try {
			const entityTx = db.transaction(STORE_NAME, 'readwrite');
			entityTx.objectStore(STORE_NAME).delete(sk);
			await new Promise<void>((resolve, reject) => {
				entityTx.oncomplete = () => resolve();
				entityTx.onerror = () => reject(entityTx.error);
			});

			const metaTx = db.transaction(META_STORE_NAME, 'readwrite');
			metaTx.objectStore(META_STORE_NAME).delete(sk);
			await new Promise<void>((resolve, reject) => {
				metaTx.oncomplete = () => resolve();
				metaTx.onerror = () => reject(metaTx.error);
			});
		} finally {
			db.close();
		}
	}

	async keys(): Promise<string[]> {
		const db = await openDb();
		try {
			const records = await new Promise<IdbEntityRecord[]>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readonly');
				const store = tx.objectStore(STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => resolve(req.result ?? []);
				req.onerror = () => reject(req.error);
			});
			const prefixLen = this.prefix.length;
			return records.map((r) => r.key.slice(prefixLen));
		} finally {
			db.close();
		}
	}

	async clear(): Promise<void> {
		const db = await openDb();
		try {
			const entityTx = db.transaction(STORE_NAME, 'readwrite');
			entityTx.objectStore(STORE_NAME).clear();
			await new Promise<void>((resolve, reject) => {
				entityTx.oncomplete = () => resolve();
				entityTx.onerror = () => reject(entityTx.error);
			});

			const metaTx = db.transaction(META_STORE_NAME, 'readwrite');
			metaTx.objectStore(META_STORE_NAME).clear();
			await new Promise<void>((resolve, reject) => {
				metaTx.oncomplete = () => resolve();
				metaTx.onerror = () => reject(metaTx.error);
			});
		} finally {
			db.close();
		}
	}

	async count(): Promise<number> {
		return (await this.keys()).length;
	}

	async evictLru(count: number): Promise<string[]> {
		const allMeta = await new Promise<IdbMetaRecord[]>((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onsuccess = () => {
				const tx = req.result.transaction(META_STORE_NAME, 'readonly');
				const store = tx.objectStore(META_STORE_NAME);
				const getAll = store.getAll();
				getAll.onsuccess = () => resolve(getAll.result ?? []);
				getAll.onerror = () => reject(getAll.error);
			};
			req.onerror = () => reject(req.error);
		});

		const prefixLen = this.prefix.length;
		allMeta.sort((a, b) => a.meta.updatedAt - b.meta.updatedAt);

		const evicted: string[] = [];
		for (let i = 0; i < Math.min(count, allMeta.length); i++) {
			const key = allMeta[i].key.slice(prefixLen);
			await this.delete(key);
			evicted.push(key);
		}
		return evicted;
	}
}
