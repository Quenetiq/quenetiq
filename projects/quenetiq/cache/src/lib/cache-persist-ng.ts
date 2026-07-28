import { type Provider, ENVIRONMENT_INITIALIZER } from '@angular/core';
import { CachePersistence, type CachePersistConfig } from './cache-persist';

export type { CachePersistConfig };

export class CachePersistenceService {
	private inner: CachePersistence;

	constructor(config?: CachePersistConfig) {
		this.inner = new CachePersistence(config ?? {});
	}

	async persist(data: [string, Record<string, unknown>][]): Promise<void> {
		return this.inner.persist(data);
	}

	persistThrottled(data: [string, Record<string, unknown>][], delay?: number): void {
		this.inner.persistThrottled(data, delay);
	}

	async restore(): Promise<[string, Record<string, unknown>][] | null> {
		return this.inner.restore();
	}

	async clear(): Promise<void> {
		return this.inner.clear();
	}
}

export function provideCachePersistence(config?: CachePersistConfig): Provider[] {
	const service = new CachePersistenceService(config);
	return [
		{ provide: CachePersistenceService, useValue: service },
		{
			provide: ENVIRONMENT_INITIALIZER,
			multi: true,
			useValue: () => service,
		},
	];
}
