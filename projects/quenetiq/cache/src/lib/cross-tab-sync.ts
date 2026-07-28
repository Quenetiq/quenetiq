import { type CacheEvents } from './cache-events';
import type { CacheEntity } from './normalized-cache';

const DEFAULT_CHANNEL = 'quenetiq:cache-sync';

interface SyncMessageBase {
	sender: string;
	seq: number;
}

interface SyncMerge extends SyncMessageBase {
	type: 'merge';
	entity: CacheEntity;
}

interface SyncWrite extends SyncMessageBase {
	type: 'write';
	entity: CacheEntity;
}

interface SyncEvict extends SyncMessageBase {
	type: 'evict';
	typename: string;
	id: string;
}

interface SyncOptimistic extends SyncMessageBase {
	type: 'optimistic';
	action: 'apply' | 'rollback' | 'commit';
	id: string;
}

interface SyncClear extends SyncMessageBase {
	type: 'clear';
}

type SyncMessage = SyncMerge | SyncWrite | SyncEvict | SyncOptimistic | SyncClear;

type SyncMessagePayload =
	| { type: 'merge'; entity: CacheEntity }
	| { type: 'write'; entity: CacheEntity }
	| { type: 'evict'; typename: string; id: string }
	| { type: 'optimistic'; action: 'apply' | 'rollback' | 'commit'; id: string }
	| { type: 'clear' };

export interface CrossTabSyncConfig {
	channel?: string;
	enabled?: boolean;
}

export interface CacheSyncOperations {
	merge(entity: CacheEntity, source: string): void;
	write(entity: CacheEntity, source: string): void;
	evict(typename: string, id: string): void;
	rollbackOptimistic(id: string): void;
	commitOptimistic(id: string): void;
	clear(): Promise<void>;
}

export class CrossTabSync {
	private channel: BroadcastChannel | null = null;
	private senderId: string;
	private seq = 0;
	private unsub: (() => void) | null = null;
	private namespace: string;

	constructor(
		private events: CacheEvents,
		private ops: CacheSyncOperations,
		config?: CrossTabSyncConfig,
	) {
		this.senderId = crypto.randomUUID();
		this.namespace = config?.channel ?? DEFAULT_CHANNEL;
		if (config?.enabled !== false) {
			this.connect();
		}
	}

	private connect(): void {
		if (typeof BroadcastChannel === 'undefined') return;
		if (this.channel) return;

		this.channel = new BroadcastChannel(this.namespace);
		this.channel.onmessage = (event: MessageEvent) => {
			this.handleMessage(event.data);
		};

		this.unsub = this.events.on((event) => {
			switch (event.type) {
			case 'merge':
				this.broadcast({ type: 'merge', entity: event.data.entity as CacheEntity });
				break;
			case 'write':
				this.broadcast({ type: 'write', entity: event.data.entity });
				break;
			case 'evict':
				this.broadcast({ type: 'evict', typename: event.data.typename, id: event.data.id });
				break;
			case 'optimistic':
				this.broadcast({ type: 'optimistic', action: event.data.action, id: event.data.id });
				break;
			case 'clear':
				this.broadcast({ type: 'clear' });
				break;
			}
		});
	}

	private broadcast(msg: SyncMessagePayload): void {
		if (!this.channel) return;
		this.channel.postMessage({ ...msg, sender: this.senderId, seq: this.seq++ } as unknown as SyncMessage);
	}

	private handleMessage(msg: SyncMessage): void {
		if (!msg || msg.sender === this.senderId) return;

		switch (msg.type) {
		case 'merge':
			this.ops.merge(msg.entity, 'cross-tab');
			break;
		case 'write':
			this.ops.write(msg.entity, 'cross-tab');
			break;
		case 'evict':
			this.ops.evict(msg.typename, msg.id);
			break;
		case 'optimistic':
			switch (msg.action) {
			case 'apply':
				break;
			case 'rollback':
				this.ops.rollbackOptimistic(msg.id);
				break;
			case 'commit':
				this.ops.commitOptimistic(msg.id);
				break;
			}
			break;
		case 'clear':
			this.ops.clear().catch(() => {});
			break;
		}
	}

	disconnect(): void {
		if (this.unsub) {
			this.unsub();
			this.unsub = null;
		}
		if (this.channel) {
			this.channel.close();
			this.channel = null;
		}
	}
}
