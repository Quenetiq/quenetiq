import type { CacheEntity } from './normalized-cache';

const noop = (): void => {
	// intentionally empty
};

export interface CacheWriteEvent {
	entity: CacheEntity;
	key: string;
}

export interface CacheEvictEvent {
	typename: string;
	id: string;
	entity?: CacheEntity;
}

export interface CacheGcSweepEvent {
	evicted: string[];
	refCounts: Record<string, number>;
}

export interface CacheOptimisticEvent {
	action: 'apply' | 'rollback' | 'commit';
	id: string;
}

export interface CacheClearEvent {
	entityCount: number;
}

export interface CacheErrorEvent {
	operation: string;
	key?: string;
	error: unknown;
}

export interface CacheReadEvent {
	typename: string;
	id: string;
	hit: boolean;
}

export interface CacheMergeEvent {
	entity: Partial<CacheEntity> & { __typename: string; id?: string };
	key: string;
	existed: boolean;
	changedFields?: string[];
	previousValues?: Record<string, unknown>;
}

export type CacheEvent =
	| { type: 'write'; data: CacheWriteEvent; timestamp: number; seq: number }
	| { type: 'evict'; data: CacheEvictEvent; timestamp: number; seq: number }
	| { type: 'gcSweep'; data: CacheGcSweepEvent; timestamp: number; seq: number }
	| { type: 'optimistic'; data: CacheOptimisticEvent; timestamp: number; seq: number }
	| { type: 'clear'; data: CacheClearEvent; timestamp: number; seq: number }
	| { type: 'read'; data: CacheReadEvent; timestamp: number; seq: number }
	| { type: 'merge'; data: CacheMergeEvent; timestamp: number; seq: number }
	| { type: 'error'; data: CacheErrorEvent; timestamp: number; seq: number };

export type CacheEventListener = (event: CacheEvent) => void;

export interface CacheEventsConfig {
	/** When true, logs all cache events to console with prefix [quenetiq:cache]. */
	enableLogging?: boolean;
	/** Custom log function. Defaults to console.debug. */
	logger?: (...args: unknown[]) => void;
}

function formatEvent(event: CacheEvent): string {
	const ts = new Date(event.timestamp).toISOString().slice(11, 23);
	switch (event.type) {
	case 'read':
		return `[${ts}] read ${event.data.hit ? 'HIT' : 'MISS'} ${event.data.typename}:${event.data.id}`;
	case 'write':
		return `[${ts}] write ${event.data.key}`;
	case 'merge': {
		const diff = event.data.changedFields?.length ? ` [${event.data.changedFields.join(',')}]` : '';
		return `[${ts}] merge ${event.data.key} ${event.data.existed ? '(updated)' : '(new)'}${diff}`;
	}
	case 'evict':
		return `[${ts}] evict ${event.data.typename}:${event.data.id}`;
	case 'gcSweep': {
		const count = event.data.evicted.length;
		return `[${ts}] gc: evicted ${count} entit${count === 1 ? 'y' : 'ies'}`;
	}
	case 'optimistic':
		return `[${ts}] optimistic ${event.data.action} ${event.data.id}`;
	case 'clear':
		return `[${ts}] clear (${event.data.entityCount} entities removed)`;
	case 'error':
		return `[${ts}] error ${event.data.operation}${event.data.key ? ` ${event.data.key}` : ''}: ${event.data.error}`;
	}
}

export class CacheEvents {
	private listeners = new Set<CacheEventListener>();
	private loggingUnsub: (() => void) | null = null;
	private seq = 0;

	on(listener: CacheEventListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	emit(event: Omit<CacheEvent, 'timestamp' | 'seq'>): void {
		const stamped: CacheEvent = { ...event, timestamp: Date.now(), seq: this.seq++ } as CacheEvent;
		for (const listener of this.listeners) {
			listener(stamped);
		}
	}

	/**
	 * Enable or disable automatic console logging of all cache events.
	 * Returns an unsubscribe function to stop logging.
	 */
	setLogging(config: CacheEventsConfig | boolean): () => void {
		// Clean up previous logging subscription
		if (this.loggingUnsub) {
			this.loggingUnsub();
			this.loggingUnsub = null;
		}

		if (!config) {
			return noop;
		}

		const cfg: CacheEventsConfig = typeof config === 'boolean' ? { enableLogging: config } : config;
		if (!cfg.enableLogging) {
			return noop;
		}

		const log = cfg.logger ?? ((...args: unknown[]): void => {
			console.debug(...args); // eslint-disable-line no-console
		});
		const prefix = '[quenetiq:cache]';

		this.loggingUnsub = this.on((event) => {
			log(prefix, formatEvent(event));
		});

		return () => {
			if (this.loggingUnsub) {
				this.loggingUnsub();
				this.loggingUnsub = null;
			}
		};
	}

	clear(): void {
		this.listeners.clear();
		if (this.loggingUnsub) {
			this.loggingUnsub();
			this.loggingUnsub = null;
		}
	}

	get listenerCount(): number {
		return this.listeners.size;
	}
}
