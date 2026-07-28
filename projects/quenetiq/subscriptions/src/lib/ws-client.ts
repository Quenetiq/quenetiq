import type { DocumentNode, TypedDocumentNode } from 'graphql';

export interface WsClientOptions {
	/** WebSocket endpoint URL. */
	readonly url: string;
	/** Sub-protocol, defaults to 'graphql-transport-ws'. */
	readonly protocol?: string;
	/** Connection parameters sent in connection_init. */
	readonly connectionParams?: () => Record<string, unknown>;
	/** Ping interval in ms (default: 30000). Set to 0 to disable. */
	readonly keepAliveInterval?: number;
	/** Timeout in ms for connection_init ack (default: 10000). */
	readonly connectionTimeout?: number;
	/** Maximum reconnection attempts (default: Infinity). */
	readonly maxReconnectAttempts?: number;
	/** Initial reconnect delay in ms (default: 1000). */
	readonly reconnectDelay?: number;
	/** Maximum reconnect delay in ms (default: 30000). */
	readonly maxReconnectDelay?: number;
	/** Called when the connection is established. */
	readonly onConnected?: () => void;
	/** Called when the connection is lost. */
	readonly onDisconnected?: (event: CloseEvent) => void;
	/** Called on reconnection attempts. */
	readonly onReconnecting?: (attempt: number) => void;
}

export interface SubscriptionCallbacks<T = unknown> {
	readonly next: (data: T) => void;
	readonly error: (err: unknown) => void;
	readonly complete: () => void;
}

interface ActiveSubscription {
	readonly id: string;
	readonly document: string;
	readonly variables?: Record<string, unknown>;
	readonly callbacks: SubscriptionCallbacks;
	readonly operationName?: string;
}

type WsState = 'connecting' | 'connected' | 'reconnecting' | 'closed';

/**
 * WebSocket connection manager that multiplexes multiple GraphQL subscriptions
 * over a single connection using the graphql-transport-ws protocol.
 */
export class WsClient {
	private ws: WebSocket | null = null;
	private state: WsState = 'closed';
	private subscriptions = new Map<string, ActiveSubscription>();
	private nextSubId = 0;
	private reconnectAttempts = 0;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
	private pongReceived = true;
	private connectionAckTimeout: ReturnType<typeof setTimeout> | null = null;

	private readonly url: string;
	private readonly protocol: string;
	private readonly connectionParams?: () => Record<string, unknown>;
	private readonly keepAliveInterval: number;
	private readonly connectionTimeout: number;
	private readonly maxReconnectAttempts: number;
	private readonly reconnectDelay: number;
	private readonly maxReconnectDelay: number;
	private readonly onConnected?: () => void;
	private readonly onDisconnected?: (event: CloseEvent) => void;
	private readonly onReconnecting?: (attempt: number) => void;

	constructor(options: WsClientOptions) {
		this.url = options.url;
		this.protocol = options.protocol ?? 'graphql-transport-ws';
		this.connectionParams = options.connectionParams;
		this.keepAliveInterval = options.keepAliveInterval ?? 30000;
		this.connectionTimeout = options.connectionTimeout ?? 10000;
		this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;
		this.reconnectDelay = options.reconnectDelay ?? 1000;
		this.maxReconnectDelay = options.maxReconnectDelay ?? 30000;
		this.onConnected = options.onConnected;
		this.onDisconnected = options.onDisconnected;
		this.onReconnecting = options.onReconnecting;
	}

	get connectionState(): WsState {
		return this.state;
	}

	get subscriptionCount(): number {
		return this.subscriptions.size;
	}

	/**
	 * Subscribe to a GraphQL operation over the shared WebSocket.
	 * Returns an unsubscribe function.
	 */
	subscribe<TData = unknown>(
		document: DocumentNode | TypedDocumentNode<TData, Record<string, unknown>>,
		variables: Record<string, unknown> | undefined,
		callbacks: SubscriptionCallbacks<TData>,
	): () => void {
		const id = String(this.nextSubId++);
		const query = typeof document === 'string' ? document : printDoc(document);
		const operationName = extractOperationName(document);

		const sub: ActiveSubscription = {
			id,
			document: query,
			variables,
			callbacks: callbacks as SubscriptionCallbacks,
			operationName,
		};
		this.subscriptions.set(id, sub);

		if (this.state === 'connected') {
			this.sendSubscribe(sub);
		} else if (this.state === 'closed' || this.state === 'reconnecting') {
			this.connect();
		}

		return () => {
			this.subscriptions.delete(id);
			if (this.state === 'connected') {
				this.sendComplete(id);
			}
			if (this.subscriptions.size === 0) {
				this.close();
			}
		};
	}

	/** Close the connection and all subscriptions. */
	close(): void {
		this.stopKeepAlive();
		if (this.connectionAckTimeout) {
			clearTimeout(this.connectionAckTimeout);
			this.connectionAckTimeout = null;
		}
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.state = 'closed';
		if (this.ws) {
			this.ws.onclose = null;
			this.ws.close(1000, 'client');
			this.ws = null;
		}
		this.subscriptions.clear();
	}

	private connect(): void {
		if (this.state === 'connecting' || this.state === 'connected') return;
		this.state = 'connecting';
		this.pongReceived = true;

		try {
			this.ws = new WebSocket(this.url, this.protocol);
		} catch {
			this.scheduleReconnect();
			return;
		}

		this.ws.onopen = () => {
			this.sendConnectionInit();
		};

		this.ws.onmessage = (event) => {
			this.handleMessage(event.data);
		};

		this.ws.onerror = () => {
			// onclose will fire after onerror
		};

		this.ws.onclose = (event) => {
			this.stopKeepAlive();
			if (this.connectionAckTimeout) {
				clearTimeout(this.connectionAckTimeout);
				this.connectionAckTimeout = null;
			}
			this.state = 'closed';
			this.onDisconnected?.(event);

			if (this.subscriptions.size > 0 && event.code !== 1000) {
				this.scheduleReconnect();
			}
		};
	}

	private handleMessage(raw: string | ArrayBuffer | Blob): void {
		if (typeof raw !== 'string') return;
		let msg: { type: string; id?: string; payload?: unknown };
		try {
			msg = JSON.parse(raw);
		} catch {
			return;
		}

		switch (msg.type) {
		case 'connection_ack':
			if (this.connectionAckTimeout) {
				clearTimeout(this.connectionAckTimeout);
				this.connectionAckTimeout = null;
			}
			this.state = 'connected';
			this.reconnectAttempts = 0;
			this.startKeepAlive();
			this.onConnected?.();
			// Re-subscribe all active subscriptions
			for (const sub of this.subscriptions.values()) {
				this.sendSubscribe(sub);
			}
			break;

		case 'ping':
			this.sendMessage({ type: 'pong' });
			break;

		case 'pong':
			this.pongReceived = true;
			break;

		case 'next':
			if (msg.id && msg.payload !== undefined) {
				this.subscriptions.get(msg.id)?.callbacks.next(msg.payload);
			}
			break;

		case 'error':
			if (msg.id) {
				this.subscriptions.get(msg.id)?.callbacks.error(msg.payload);
			}
			break;

		case 'complete':
			if (msg.id) {
				this.subscriptions.get(msg.id)?.callbacks.complete();
				this.subscriptions.delete(msg.id);
			}
			break;
		}
	}

	private sendConnectionInit(): void {
		const payload = this.connectionParams?.() ?? {};
		this.sendMessage({ type: 'connection_init', payload });

		this.connectionAckTimeout = setTimeout(() => {
			this.ws?.close(4408, 'Connection initialisation timeout');
		}, this.connectionTimeout);
	}

	private sendSubscribe(sub: ActiveSubscription): void {
		this.sendMessage({
			type: 'subscribe',
			id: sub.id,
			payload: {
				query: sub.document,
				variables: sub.variables,
				operationName: sub.operationName,
			},
		});
	}

	private sendComplete(id: string): void {
		this.sendMessage({ type: 'complete', id });
	}

	private sendMessage(msg: Record<string, unknown>): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(msg));
		}
	}

	private startKeepAlive(): void {
		this.stopKeepAlive();
		if (this.keepAliveInterval <= 0) return;
		this.keepAliveTimer = setInterval(() => {
			if (!this.pongReceived) {
				this.ws?.close(4401, 'Keepalive timeout');
				return;
			}
			this.pongReceived = false;
			this.sendMessage({ type: 'ping' });
		}, this.keepAliveInterval);
	}

	private stopKeepAlive(): void {
		if (this.keepAliveTimer) {
			clearInterval(this.keepAliveTimer);
			this.keepAliveTimer = null;
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
		this.state = 'reconnecting';
		this.reconnectAttempts++;
		this.onReconnecting?.(this.reconnectAttempts);

		const delay = Math.min(
			this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
			this.maxReconnectDelay,
		);
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, delay);
	}
}

function printDoc(doc: DocumentNode | TypedDocumentNode<unknown, Record<string, unknown>>): string {
	// graphql-js DocumentNode has a loc.source.body property
	const d = doc as { loc?: { source?: { body: string } }; definitions?: unknown[] };
	return d.loc?.source?.body ?? JSON.stringify(d);
}

function extractOperationName(
	doc: DocumentNode | TypedDocumentNode<unknown, Record<string, unknown>>,
): string | undefined {
	const d = doc as { definitions?: { kind?: string; name?: { value?: string } }[] };
	for (const def of d.definitions ?? []) {
		if (def.kind === 'OperationDefinition' && def.name?.value) {
			return def.name.value;
		}
	}
	return undefined;
}
