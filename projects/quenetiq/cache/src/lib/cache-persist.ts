export interface CachePersistConfig {
	storageKey?: string;
	throttle?: number;
	version?: string;
	maxAge?: number;
	storage?: 'localStorage' | 'memory';
	/** Migrate persisted data from an older version. Called when stored version !== current version. */
	migrate?: (data: [string, Record<string, unknown>][], storedVersion: string) => [string, Record<string, unknown>][];
}

interface StorageBackend {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

function createStorage(config: CachePersistConfig): StorageBackend {
	if (config.storage === 'memory') {
		return new InMemoryStorage();
	}
	try {
		const testKey = '__quenetiq_storage_test__';
		localStorage.setItem(testKey, '1');
		localStorage.removeItem(testKey);
		return localStorage;
	} catch {
		return new InMemoryStorage();
	}
}

class InMemoryStorage implements StorageBackend {
	private readonly store = new Map<string, string>();

	getItem(key: string): string | null {
		return this.store.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.store.set(key, value);
	}

	removeItem(key: string): void {
		this.store.delete(key);
	}
}

interface PersistedPayload {
	version?: string;
	timestamp: number;
	data: [string, Record<string, unknown>][];
}

export class CachePersistence {
	private readonly key: string;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private readonly storage: StorageBackend;
	private readonly version?: string;
	private readonly maxAge?: number;

	constructor(config?: CachePersistConfig) {
		this.key = config?.storageKey ?? '__quenetiq_cache';
		this.storage = createStorage(config ?? {});
		this.version = config?.version;
		this.maxAge = config?.maxAge;
	}

	persist(data: [string, Record<string, unknown>][]): void {
		const payload: PersistedPayload = {
			version: this.version,
			timestamp: Date.now(),
			data,
		};
		try {
			this.storage.setItem(this.key, JSON.stringify(payload));
		} catch {
			// storage full or unavailable
		}
	}

	persistThrottled(data: [string, Record<string, unknown>][], delay = 1000): void {
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			this.persist(data);
			this.timer = null;
		}, delay);
	}

	restore(): [string, Record<string, unknown>][] | null {
		try {
			const raw = this.storage.getItem(this.key);
			if (!raw) return null;

			const payload: PersistedPayload = JSON.parse(raw);

			if (this.version !== undefined && payload.version !== this.version) {
				this.storage.removeItem(this.key);
				return null;
			}

			if (this.maxAge && Date.now() - payload.timestamp > this.maxAge) {
				this.storage.removeItem(this.key);
				return null;
			}

			return payload.data;
		} catch {
			this.storage.removeItem(this.key);
			return null;
		}
	}

	clear(): void {
		try {
			this.storage.removeItem(this.key);
		} catch {
			// ignore
		}
	}
}
