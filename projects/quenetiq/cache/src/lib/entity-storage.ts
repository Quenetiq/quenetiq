import type { CacheEntity } from './normalized-cache';

export interface StoredEntityMeta {
	createdAt: number;
	updatedAt: number;
	ttl?: number;
}

export interface EntityStorageConfig {
	prefix?: string;
	ttl?: Record<string, number>;
	maxSizeBytes?: number;
}

export interface EntityStorage {
	get(key: string): Promise<{ entity: CacheEntity; meta: StoredEntityMeta } | undefined>;
	set(key: string, entity: CacheEntity, meta?: Partial<StoredEntityMeta>): Promise<void>;
	delete(key: string): Promise<void>;
	keys(): Promise<string[]>;
	clear(): Promise<void>;
	count(): Promise<number>;
	evictLru(count: number): Promise<string[]>;
}

export class LocalEntityStorage implements EntityStorage {
	private prefix: string;
	private ttlConfig: Record<string, number>;
	private maxSizeBytes: number;
	private sizeHint = 0;
	private sizeValid = false;

	constructor(config?: EntityStorageConfig) {
		this.prefix = config?.prefix ?? 'qntc:ec:';
		this.ttlConfig = config?.ttl ?? {};
		this.maxSizeBytes = config?.maxSizeBytes ?? 4_000_000;
	}

	private storageKey(key: string): string {
		return `${this.prefix}${key}`;
	}

	private metaKey(key: string): string {
		return `${this.prefix}__meta:${key}`;
	}

	async get(key: string): Promise<{ entity: CacheEntity; meta: StoredEntityMeta } | undefined> {
		try {
			const raw = localStorage.getItem(this.storageKey(key));
			if (!raw) return undefined;
			const entity = JSON.parse(raw) as CacheEntity;
			const metaRaw = localStorage.getItem(this.metaKey(key));
			const meta: StoredEntityMeta = metaRaw
				? JSON.parse(metaRaw)
				: { createdAt: Date.now(), updatedAt: Date.now() };
			const typeTtl = this.ttlConfig[entity.__typename];
			if (typeTtl != null && Date.now() - meta.updatedAt > typeTtl) {
				await this.delete(key);
				return undefined;
			}
			return { entity, meta };
		} catch {
			return undefined;
		}
	}

	async set(key: string, entity: CacheEntity, meta?: Partial<StoredEntityMeta>): Promise<void> {
		try {
			const existingRaw = localStorage.getItem(this.storageKey(key));
			const existingMeta: StoredEntityMeta = existingRaw
				? JSON.parse(localStorage.getItem(this.metaKey(key)) ?? 'null') ?? { createdAt: Date.now(), updatedAt: Date.now() }
				: { createdAt: Date.now(), updatedAt: Date.now() };

			localStorage.setItem(this.storageKey(key), JSON.stringify(entity));
			localStorage.setItem(
				this.metaKey(key),
				JSON.stringify({
					...existingMeta,
					...meta,
					updatedAt: Date.now(),
				} as StoredEntityMeta),
			);
			this.sizeValid = false;
		} catch (e) {
			if (e instanceof DOMException && e.name === 'QuotaExceededError') {
				await this.evictLru(1);
				try {
					localStorage.setItem(this.storageKey(key), JSON.stringify(entity));
				} catch {
					// storage full
				}
			}
		}
	}

	async delete(key: string): Promise<void> {
		try {
			localStorage.removeItem(this.storageKey(key));
			localStorage.removeItem(this.metaKey(key));
		} catch {
			// ignore
		}
	}

	async keys(): Promise<string[]> {
		const result: string[] = [];
		const prefix = this.prefix;
		const metaPrefix = `${prefix}__meta:`;
		try {
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				if (k && k.startsWith(prefix) && !k.startsWith(metaPrefix)) {
					result.push(k.slice(prefix.length));
				}
			}
		} catch {
			// ignore
		}
		return result;
	}

	async clear(): Promise<void> {
		try {
			const toRemove: string[] = [];
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				if (k && k.startsWith(this.prefix)) {
					toRemove.push(k);
				}
			}
			for (const k of toRemove) {
				localStorage.removeItem(k);
			}
		} catch {
			// ignore
		}
		this.sizeValid = false;
	}

	async count(): Promise<number> {
		return (await this.keys()).length;
	}

	async evictLru(count: number): Promise<string[]> {
		const entries: { key: string; updatedAt: number }[] = [];
		for (const k of await this.keys()) {
			try {
				const metaRaw = localStorage.getItem(this.metaKey(k));
				if (metaRaw) {
					const meta = JSON.parse(metaRaw) as StoredEntityMeta;
					entries.push({ key: k, updatedAt: meta.updatedAt });
				} else {
					entries.push({ key: k, updatedAt: 0 });
				}
			} catch {
				entries.push({ key: k, updatedAt: 0 });
			}
		}
		entries.sort((a, b) => a.updatedAt - b.updatedAt);

		const evicted: string[] = [];
		for (let i = 0; i < Math.min(count, entries.length); i++) {
			await this.delete(entries[i].key);
			evicted.push(entries[i].key);
		}
		return evicted;
	}
}
