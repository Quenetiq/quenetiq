import { WsClient, type WsClientOptions, type SubscriptionCallbacks } from './ws-client';
import type { DocumentNode, TypedDocumentNode } from 'graphql';

export interface WsClientManagerOptions {
	/** Shared connection parameters for all clients. */
	readonly connectionParams?: () => Record<string, unknown>;
	/** Ping interval in ms (default: 30000). */
	readonly keepAliveInterval?: number;
	/** Connection timeout in ms (default: 10000). */
	readonly connectionTimeout?: number;
	/** Maximum reconnection attempts (default: Infinity). */
	readonly maxReconnectAttempts?: number;
	/** Initial reconnect delay in ms (default: 1000). */
	readonly reconnectDelay?: number;
	/** Maximum reconnect delay in ms (default: 30000). */
	readonly maxReconnectDelay?: number;
	/** Called when any client connects. */
	readonly onConnected?: (url: string) => void;
	/** Called when any client disconnects. */
	readonly onDisconnected?: (url: string, event: CloseEvent) => void;
}

/**
 * Manages shared WebSocket connections per endpoint URL.
 * Multiple subscriptions to the same URL share a single connection.
 */
export class WsClientManager {
	private clients = new Map<string, WsClient>();
	private readonly options: WsClientManagerOptions;

	constructor(options: WsClientManagerOptions = {}) {
		this.options = options;
	}

	/**
	 * Subscribe to a GraphQL operation. The connection is managed automatically.
	 * Returns an unsubscribe function.
	 */
	subscribe<TData = unknown>(
		url: string,
		document: DocumentNode | TypedDocumentNode<TData, Record<string, unknown>>,
		variables: Record<string, unknown> | undefined,
		callbacks: SubscriptionCallbacks<TData>,
	): () => void {
		let client = this.clients.get(url);
		if (!client) {
			const clientOptions: WsClientOptions = {
				url,
				connectionParams: this.options.connectionParams,
				keepAliveInterval: this.options.keepAliveInterval,
				connectionTimeout: this.options.connectionTimeout,
				maxReconnectAttempts: this.options.maxReconnectAttempts,
				reconnectDelay: this.options.reconnectDelay,
				maxReconnectDelay: this.options.maxReconnectDelay,
				onConnected: () => this.options.onConnected?.(url),
				onDisconnected: (event) => this.options.onDisconnected?.(url, event),
			};
			client = new WsClient(clientOptions);
			this.clients.set(url, client);
		}
		return client.subscribe(document, variables, callbacks);
	}

	/** Close a specific endpoint's connection. */
	closeClient(url: string): void {
		this.clients.get(url)?.close();
		this.clients.delete(url);
	}

	/** Close all connections. */
	closeAll(): void {
		for (const client of this.clients.values()) {
			client.close();
		}
		this.clients.clear();
	}

	/** Get the number of active subscriptions for a URL. */
	subscriptionCount(url: string): number {
		return this.clients.get(url)?.subscriptionCount ?? 0;
	}

	/** Check if a client exists for a URL. */
	hasClient(url: string): boolean {
		return this.clients.has(url);
	}
}
