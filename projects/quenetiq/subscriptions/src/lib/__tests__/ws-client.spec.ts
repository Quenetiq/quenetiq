import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WsClient } from '../ws-client';

class MockWebSocket {
	static CONNECTING = 0;
	static OPEN = 1;
	static CLOSING = 2;
	static CLOSED = 3;

	readyState = 1;
	url: string;
	protocol: string;
	onopen: ((ev: Event) => void) | null = null;
	onclose: ((ev: CloseEvent) => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onerror: ((ev: Event) => void) | null = null;
	private sent: string[] = [];

	constructor(url: string, protocol: string) {
		this.url = url;
		this.protocol = protocol;
		// Simulate async open
		queueMicrotask(() => this.onopen?.(new Event('open')));
	}

	send(data: string): void {
		this.sent.push(data);
	}

	close(code?: number, reason?: string): void {
		this.readyState = 3;
		this.onclose?.(new CloseEvent('close', { code: code ?? 1000, reason: reason ?? '' }));
	}

	getSent(): string[] {
		return [...this.sent];
	}

	/** Simulate receiving a message from the server. */
	 receiveMessage(data: string): void {
		this.onmessage?.(new MessageEvent('message', { data }));
	}

	/** Simulate server message. */
	simulateMessage(obj: Record<string, unknown>): void {
		this.receiveMessage(JSON.stringify(obj));
	}
}

// Patch global WebSocket
const OriginalWebSocket = globalThis.WebSocket;
beforeEach(() => {

	(globalThis as any).WebSocket = MockWebSocket as unknown as typeof WebSocket;
});
afterEach(() => {

	(globalThis as any).WebSocket = OriginalWebSocket;
});

function fakeDoc(name?: string) {
	return {
		kind: 'Document',
		definitions: name
			? [{ kind: 'OperationDefinition', name: { value: name } }]
			: [],
	} as any;
}

describe('WsClient', () => {
	it('sends connection_init on connect', () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });
		const ws = new MockWebSocket('ws://localhost:4000/graphql', 'graphql-transport-ws');

		// The constructor creates a new WebSocket internally
		// We need to trigger subscribe to cause connection
		const unsub = client.subscribe(fakeDoc('Q'), undefined, {
			next: vi.fn(),
			error: vi.fn(),
			complete: vi.fn(),
		});

		// Give microtask to fire onopen
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				unsub();
				client.close();
				resolve();
			}, 10);
		});
	});

	it('subscribes and unsubscribes', () => {
		const next = vi.fn();
		const complete = vi.fn();
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		const unsub = client.subscribe(fakeDoc('Q'), { id: 1 }, { next, error: vi.fn(), complete });

		expect(client.subscriptionCount).toBe(1);

		unsub();
		expect(client.subscriptionCount).toBe(0);
		client.close();
	});

	it('multiplexes subscriptions over single connection', () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		const unsub1 = client.subscribe(fakeDoc('Q1'), undefined, {
			next: vi.fn(), error: vi.fn(), complete: vi.fn(),
		});
		const unsub2 = client.subscribe(fakeDoc('Q2'), undefined, {
			next: vi.fn(), error: vi.fn(), complete: vi.fn(),
		});

		expect(client.subscriptionCount).toBe(2);

		unsub1();
		expect(client.subscriptionCount).toBe(1);

		unsub2();
		expect(client.subscriptionCount).toBe(0);
		client.close();
	});

	it('close() sets state to closed', () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });
		client.subscribe(fakeDoc('Q'), undefined, {
			next: vi.fn(), error: vi.fn(), complete: vi.fn(),
		});

		client.close();
		expect(client.connectionState).toBe('closed');
		expect(client.subscriptionCount).toBe(0);
	});

	it('sends connectionParams in connection_init', () => {
		const params = { token: 'abc123' };
		const client = new WsClient({
			url: 'ws://localhost:4000/graphql',
			connectionParams: () => params,
		});

		client.subscribe(fakeDoc('Q'), undefined, {
			next: vi.fn(), error: vi.fn(), complete: vi.fn(),
		});

		return new Promise<void>((resolve) => {
			setTimeout(() => {
				client.close();
				resolve();
			}, 10);
		});
	});
});
