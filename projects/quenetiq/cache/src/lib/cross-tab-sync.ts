import { type CacheEvents } from './cache-events';
import type { CacheEntity } from './normalized-cache';

const DEFAULT_CHANNEL = 'quenetiq:cache-sync';

/** Upper bound for the recently-seen message ring used for dedup. */
const MAX_SEEN_MESSAGES = 128;

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

interface SyncClear extends SyncMessageBase {
	type: 'clear';
}

type SyncMessage = SyncMerge | SyncWrite | SyncEvict | SyncClear;

type SyncMessagePayload =
	| { type: 'merge'; entity: CacheEntity }
	| { type: 'write'; entity: CacheEntity }
	| { type: 'evict'; typename: string; id: string }
	| { type: 'clear' };

export interface CrossTabSyncConfig {
	channel?: string;
	enabled?: boolean;
}

export interface CacheSyncOperations {
	merge(entity: CacheEntity, source: string): void;
	write(entity: CacheEntity, source: string): void;
	evict(typename: string, id: string): void;
	clear(): Promise<void>;
}

function isSyncMessage(value: unknown): value is SyncMessage {
	if (typeof value !== 'object' || value === null) return false;
	const msg = value as Record<string, unknown>;
	const sender = msg['sender'];
	const seq = msg['seq'];
	if (typeof sender !== 'string' || sender.length === 0) return false;
	if (typeof seq !== 'number' || !Number.isInteger(seq)) return false;

	switch (msg['type']) {
	case 'merge':
	case 'write': {
		const entity = msg['entity'] as Record<string, unknown> | null;
		return typeof entity?.['__typename'] === 'string';
	}
	case 'evict':
		return typeof msg['typename'] === 'string' && typeof msg['id'] === 'string';
	case 'clear':
		return true;
	default:
		return false;
	}
}

export class CrossTabSync {
	private channel: BroadcastChannel | null = null;
	private readonly senderId: string;
	private seq = 0;
	private unsub: (() => void) | null = null;
	private readonly namespace: string;

	/**
	 * True while a remote message is being applied to the cache. Cache events
	 * emitted from those calls must not be re-broadcast, otherwise every tab
	 * would echo messages back and forth in an infinite loop.
	 */
	private applyingCrossTab = false;

	/** Bounded ring of recently seen `sender:seq` keys to drop duplicate deliveries. */
	private readonly seen = new Set<string>();

	constructor(
		private readonly events: CacheEvents,
		private readonly ops: CacheSyncOperations,
		config?: CrossTabSyncConfig,
	) {
		this.senderId = crypto.randomUUID();
		this.namespace = config?.channel ?? DEFAULT_CHANNEL;
		if (config?.enabled !== false) {
			this.connect();
		}
	}

	private connect(): void {
		if (typeof BroadcastChannel === 'undefined' || this.channel) return;

		this.channel = new BroadcastChannel(this.namespace);
		this.channel.onmessage = (event: MessageEvent) => {
			this.handleMessage(event.data);
		};
		this.channel.onmessageerror = () => {
			/* ignore malformed frames */
		};

		this.unsub = this.events.on((event) => {
			if (this.applyingCrossTab) return;
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
			case 'clear':
				this.broadcast({ type: 'clear' });
				break;
			case 'gcSweep':
			case 'optimistic':
			case 'read':
			case 'error':
				/* local-only events are not propagated cross-tab */
				break;
			}
		});
	}

	private broadcast(payload: SyncMessagePayload): void {
		if (!this.channel) return;
		this.channel.postMessage({ ...payload, sender: this.senderId, seq: this.seq++ });
	}

	private handleMessage(msg: unknown): void {
		if (!isSyncMessage(msg) || msg.sender === this.senderId) return;
		if (this.isDuplicate(msg)) return;

		this.applyingCrossTab = true;
		try {
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
			case 'clear':
				void this.ops.clear().catch(() => {
					/* clear is fire-and-forget */
				});
				break;
			}
		} catch (error) {
			this.events.emit({ type: 'error', data: { operation: 'cross-tab-sync', error } });
		} finally {
			this.applyingCrossTab = false;
		}
	}

	private isDuplicate(msg: SyncMessage): boolean {
		const key = `${msg.sender}:${msg.seq}`;
		if (this.seen.has(key)) return true;
		if (this.seen.size >= MAX_SEEN_MESSAGES) {
			const oldest = this.seen.values().next().value;
			if (typeof oldest === 'string') this.seen.delete(oldest);
		}
		this.seen.add(key);
		return false;
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
		this.seen.clear();
	}
}
