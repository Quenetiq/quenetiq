import { NormalizedCache } from './normalized-cache';

export class CacheGc {
	private refCount = new Map<string, number>();
	private danglingSince = new Map<string, number>();

	constructor(
		private cache: NormalizedCache,
		private ttlMs = 60_000,
	) {}

	track(entities: { __typename: string; id: string }[]): void {
		for (const e of entities) {
			const key = `${e.__typename}:${e.id}`;
			const prev = this.refCount.get(key) ?? 0;
			this.refCount.set(key, prev + 1);
			this.danglingSince.delete(key);
		}
	}

	release(entities: { __typename: string; id: string }[]): void {
		const now = Date.now();
		for (const e of entities) {
			const key = `${e.__typename}:${e.id}`;
			const prev = this.refCount.get(key) ?? 0;
			if (prev <= 1) {
				this.refCount.delete(key);
				this.danglingSince.set(key, now);
			} else {
				this.refCount.set(key, prev - 1);
			}
		}
	}

	sweep(): { evicted: string[]; count: number } {
		const now = Date.now();
		const evicted: string[] = [];
		for (const [key, since] of this.danglingSince) {
			if (now - since >= this.ttlMs) {
				const [typename, id] = key.split(':');
				this.cache.remove(typename, id);
				this.danglingSince.delete(key);
				evicted.push(key);
			}
		}
		return { evicted, count: evicted.length };
	}

	refCountOf(typename: string, id: string): number {
		return this.refCount.get(`${typename}:${id}`) ?? 0;
	}
}
