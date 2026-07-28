import { QuenetiqError } from './base';

export enum CacheErrorCode {
	MISS = 'CACHE_MISS',
	SERIALIZATION = 'CACHE_SERIALIZATION',
	GC = 'CACHE_GC',
	PERSISTENCE = 'CACHE_PERSISTENCE',
	INVALIDATION = 'CACHE_INVALIDATION',
}

export class CacheError extends QuenetiqError {
	constructor(code: CacheErrorCode, message: string, context?: Record<string, unknown>) {
		super(message, code, context);
		this.name = 'CacheError';
	}
}
