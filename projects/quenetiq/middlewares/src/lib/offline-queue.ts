import { Injectable, inject, type Provider, ENVIRONMENT_INITIALIZER, DestroyRef, InjectionToken } from '@angular/core';
import { Observable, fromEvent, of } from 'rxjs';
import { parse } from 'graphql';
import { GraphqlService, type GraphQLResult, type GraphqlMiddleware } from '@quenetiq/core';

export interface OfflineQueueConfig {
	storageKey?: string;
	maxQueue?: number;
	autoReplay?: boolean;
}

export const OFFLINE_QUEUE_CONFIG = new InjectionToken<OfflineQueueConfig>('OFFLINE_QUEUE_CONFIG');

interface QueuedMutation {
	id: string;
	query: string;
	variables: Record<string, unknown>;
	timestamp: number;
}

let mutationIdCounter = 0;

/** In-memory fallback when localStorage is unavailable (SSR, private browsing). */
const memoryStore = new Map<string, QueuedMutation[]>();

function isOnline(): boolean {
	return typeof navigator === 'undefined' || navigator.onLine;
}

function getStorage(): Pick<Storage, 'getItem' | 'setItem'> {
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.getItem('__quenetiq_probe');
			return localStorage;
		}
	} catch {
		// localStorage forbidden
	}
	return {
		getItem(key: string): string | null {
			const v = memoryStore.get(key);
			return v ? JSON.stringify(v) : null;
		},
		setItem(key: string, value: string): void {
			memoryStore.set(key, JSON.parse(value));
		},
	};
}

function loadQueue(key: string): QueuedMutation[] {
	try {
		const raw = storage.getItem(key);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveQueue(key: string, queue: QueuedMutation[]): void {
	try {
		storage.setItem(key, JSON.stringify(queue));
	} catch {
		// storage full or unavailable
	}
}

const storage = getStorage();

@Injectable()
export class OfflineQueueService {
	private readonly config: OfflineQueueConfig;
	private readonly key: string;
	private readonly svc = inject(GraphqlService);
	private _queue: QueuedMutation[] = [];

	constructor() {
		this.config = inject(OFFLINE_QUEUE_CONFIG, { optional: true }) ?? {};
		this.key = this.config.storageKey ?? '__quenetiq_offline_queue';
		this._queue = loadQueue(this.key);
		const destroyRef = inject(DestroyRef);

		if (this.config.autoReplay !== false && typeof window !== 'undefined') {
			const online$ = fromEvent(window, 'online');
			online$.subscribe(() => this.replay());
		}

		destroyRef.onDestroy(() => (this._queue = []));
	}

	get queue(): readonly QueuedMutation[] {
		return this._queue;
	}

	get size(): number {
		return this._queue.length;
	}

	enqueue(query: string, variables: Record<string, unknown>): void {
		const max = this.config.maxQueue ?? 50;
		const entry: QueuedMutation = {
			id: `offline_${++mutationIdCounter}`,
			query,
			variables,
			timestamp: Date.now(),
		};
		this._queue.push(entry);
		if (this._queue.length > max) {
			this._queue.splice(0, this._queue.length - max);
		}
		saveQueue(this.key, this._queue);
	}

	replay(): Observable<GraphQLResult<unknown>[]> {
		this._queue = loadQueue(this.key);
		const queue = [...this._queue];
		if (queue.length === 0) return of([]);

		this._queue = [];
		saveQueue(this.key, this._queue);

		const results = queue.map(
			(item) => this.svc.mutate(parse(item.query), item.variables as Record<string, unknown>),
		);

		return new Observable<GraphQLResult<unknown>[]>((sub) => {
			const completed: GraphQLResult<unknown>[] = [];
			let remaining = results.length;
			for (const obs of results) {
				obs.subscribe({
					next: (result) => {
						completed.push(result);
						if (--remaining === 0) {
							sub.next(completed);
							sub.complete();
						}
					},
					error: (err) => {
						completed.push({ status: 'error', error: String(err) });
						if (--remaining === 0) {
							sub.next(completed);
							sub.complete();
						}
					},
				});
			}
		});
	}

	clear(): void {
		this._queue = [];
		saveQueue(this.key, this._queue);
	}

	remove(id: string): void {
		this._queue = this._queue.filter((e) => e.id !== id);
		saveQueue(this.key, this._queue);
	}
}

export function offlineQueueMiddleware(config?: OfflineQueueConfig): GraphqlMiddleware {
	const key = config?.storageKey ?? '__quenetiq_offline_queue';

	return (request, next) => {
		if (request.type !== 'mutation') return next(request);
		if (isOnline()) return next(request);

		try {
			const queue = loadQueue(key);
			const max = config?.maxQueue ?? 50;
			const entry: QueuedMutation = {
				id: `offline_${++mutationIdCounter}`,
				query: request.query,
				variables: request.variables,
				timestamp: Date.now(),
			};
			queue.push(entry);
			if (queue.length > max) queue.splice(0, queue.length - max);
			saveQueue(key, queue);
		} catch {
			// ignore
		}

		return of<GraphQLResult<unknown>>({ status: 'error', error: 'Offline: mutation queued' });
	};
}

export function provideOfflineQueue(config?: OfflineQueueConfig): Provider[] {
	return [
		...(config ? [{ provide: OFFLINE_QUEUE_CONFIG, useValue: config }] : []),
		OfflineQueueService,
		{
			provide: ENVIRONMENT_INITIALIZER,
			multi: true,
			useValue: () => inject(OfflineQueueService),
		},
	];
}
