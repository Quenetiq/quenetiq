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

	receiveMessage(data: string): void {
		this.onmessage?.(new MessageEvent('message', { data }));
	}

	simulateMessage(obj: Record<string, unknown>): void {
		this.receiveMessage(JSON.stringify(obj));
	}

	simulateError(): void {
		this.onerror?.(new Event('error'));
	}

	simulateClose(code = 1000, reason = ''): void {
		this.readyState = 3;
		this.onclose?.(new CloseEvent('close', { code, reason }));
	}
}

const OriginalWebSocket = globalThis.WebSocket;
let lastMockWs: MockWebSocket;

beforeEach(() => {
	(globalThis as any).WebSocket = class extends MockWebSocket {
		constructor(url: string, protocol: string) {
			super(url, protocol);
			const instance = this as MockWebSocket;
			lastMockWs = instance;
		}
	} as unknown as typeof WebSocket;
});

afterEach(() => {
	(globalThis as any).WebSocket = OriginalWebSocket;
	vi.restoreAllMocks();
});

function fakeDoc(name?: string) {
	return {
		kind: 'Document',
		definitions: name
			? [{ kind: 'OperationDefinition', name: { value: name } }]
			: [],
	} as any;
}

function getWs(): MockWebSocket {
	return lastMockWs;
}

describe('WsClient message dispatch', () => {
	it('dispatches next message to correct subscription', async () => {
		const next1 = vi.fn();
		const next2 = vi.fn();
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		client.subscribe(fakeDoc('Q1'), undefined, { next: next1, error: vi.fn(), complete: vi.fn() });
		client.subscribe(fakeDoc('Q2'), undefined, { next: next2, error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));

		getWs().simulateMessage({ type: 'connection_ack' });

		getWs().simulateMessage({ type: 'next', id: '0', payload: { data: { q1: 'result1' } } });
		getWs().simulateMessage({ type: 'next', id: '1', payload: { data: { q2: 'result2' } } });

		expect(next1).toHaveBeenCalledWith({ data: { q1: 'result1' } });
		expect(next2).toHaveBeenCalledWith({ data: { q2: 'result2' } });

		client.close();
	});

	it('dispatches error to correct subscription', async () => {
		const error1 = vi.fn();
		const error2 = vi.fn();
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: error1, complete: vi.fn() });
		client.subscribe(fakeDoc('Q2'), undefined, { next: vi.fn(), error: error2, complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		getWs().simulateMessage({ type: 'error', id: '0', payload: { message: 'Rate limited' } });

		expect(error1).toHaveBeenCalledWith({ message: 'Rate limited' });
		expect(error2).not.toHaveBeenCalled();

		client.close();
	});

	it('dispatches complete and removes subscription', async () => {
		const complete = vi.fn();
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		expect(client.subscriptionCount).toBe(1);

		getWs().simulateMessage({ type: 'complete', id: '0' });

		expect(complete).toHaveBeenCalled();
		expect(client.subscriptionCount).toBe(0);

		client.close();
	});

	it('ignores next message for unknown subscription id', async () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		getWs().simulateMessage({ type: 'next', id: '999', payload: { data: 'orphan' } });

		client.close();
	});

	it('ignores non-string messages', async () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		getWs().receiveMessage('not json at all');

		client.close();
	});
});

describe('WsClient connection lifecycle', () => {
	it('sets state to connected after connection_ack', async () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		expect(client.connectionState).toBe('connecting');

		await new Promise((r) => setTimeout(r, 10));

		getWs().simulateMessage({ type: 'connection_ack' });

		expect(client.connectionState).toBe('connected');

		client.close();
	});

	it('re-subscribes all active subscriptions after reconnection', async () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql', reconnectDelay: 10 });

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });
		client.subscribe(fakeDoc('Q2'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		const sent1 = getWs().getSent();
		const subscribeMsgs = sent1.filter((s) => JSON.parse(s).type === 'subscribe');
		expect(subscribeMsgs).toHaveLength(2);

		// Disconnect with abnormal code to trigger reconnect
		getWs().simulateClose(1006, 'abnormal');

		// Wait for reconnect timer + new WebSocket open + connection_init
		await new Promise((r) => setTimeout(r, 30));

		// Simulate connection_ack on the reconnected WebSocket
		getWs().simulateMessage({ type: 'connection_ack' });

		// Wait for re-subscription messages to be sent
		await new Promise((r) => setTimeout(r, 10));

		const sent2 = getWs().getSent();
		const reSubscribeMsgs = sent2.filter((s) => {
			const msg = JSON.parse(s);
			return msg.type === 'subscribe';
		});
		expect(reSubscribeMsgs.length).toBeGreaterThanOrEqual(2);

		client.close();
	});

	it('sends ping on keepalive interval', async () => {
		const client = new WsClient({
			url: 'ws://localhost:4000/graphql',
			keepAliveInterval: 50,
		});

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		await new Promise((r) => setTimeout(r, 80));

		const sent = getWs().getSent();
		const pingMsgs = sent.filter((s) => JSON.parse(s).type === 'ping');
		expect(pingMsgs.length).toBeGreaterThanOrEqual(1);

		client.close();
	});

	it('responds to server ping with pong', async () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		getWs().simulateMessage({ type: 'ping' });

		const sent = getWs().getSent();
		const pongMsgs = sent.filter((s) => JSON.parse(s).type === 'pong');
		expect(pongMsgs).toHaveLength(1);

		client.close();
	});

	it('calls onConnected after connection_ack', async () => {
		const onConnected = vi.fn();
		const client = new WsClient({ url: 'ws://localhost:4000/graphql', onConnected });

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		expect(onConnected).toHaveBeenCalled();

		client.close();
	});

	it('calls onDisconnected on close', async () => {
		const onDisconnected = vi.fn();
		const client = new WsClient({ url: 'ws://localhost:4000/graphql', onDisconnected });

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		getWs().simulateClose(1006, 'abnormal');

		expect(onDisconnected).toHaveBeenCalled();

		client.close();
	});

	it('calls onReconnecting on reconnect attempt', async () => {
		const onReconnecting = vi.fn();
		const client = new WsClient({
			url: 'ws://localhost:4000/graphql',
			reconnectDelay: 10,
			maxReconnectAttempts: 3,
			onReconnecting,
		});

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		getWs().simulateClose(1006, 'abnormal');

		await new Promise((r) => setTimeout(r, 50));

		expect(onReconnecting).toHaveBeenCalled();

		client.close();
	});

	it('stops reconnecting after maxReconnectAttempts', async () => {
		const onReconnecting = vi.fn();
		const client = new WsClient({
			url: 'ws://localhost:4000/graphql',
			reconnectDelay: 10,
			maxReconnectAttempts: 1,
			onReconnecting,
		});

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		getWs().simulateClose(1006, 'abnormal');
		await new Promise((r) => setTimeout(r, 50));

		getWs().simulateClose(1006, 'abnormal');
		await new Promise((r) => setTimeout(r, 50));

		expect(onReconnecting).toHaveBeenCalledTimes(1);

		client.close();
	});

	it('does not reconnect on clean close (code 1000)', async () => {
		const onReconnecting = vi.fn();
		const client = new WsClient({
			url: 'ws://localhost:4000/graphql',
			reconnectDelay: 10,
			onReconnecting,
		});

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		getWs().simulateClose(1000, 'normal');

		await new Promise((r) => setTimeout(r, 50));

		expect(onReconnecting).not.toHaveBeenCalled();

		client.close();
	});

	it('sends complete to server when unsubscribing', async () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		const unsub = client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		unsub();

		const sent = getWs().getSent();
		const completeMsgs = sent.filter((s) => {
			const msg = JSON.parse(s);
			return msg.type === 'complete' && msg.id === '0';
		});
		expect(completeMsgs).toHaveLength(1);

		client.close();
	});

	it('closes connection when last subscription is unsubscribed', async () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		const unsub = client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		unsub();

		expect(client.connectionState).toBe('closed');
	});

	it('sends connection_init with connectionParams', async () => {
		const client = new WsClient({
			url: 'ws://localhost:4000/graphql',
			connectionParams: () => ({ token: 'secret', userId: '123' }),
		});

		client.subscribe(fakeDoc('Q1'), undefined, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));

		const sent = getWs().getSent();
		const initMsg = sent.find((s) => JSON.parse(s).type === 'connection_init');
		expect(initMsg).toBeDefined();

		const parsed = JSON.parse(initMsg!);
		expect(parsed.payload).toEqual({ token: 'secret', userId: '123' });

		client.close();
	});

	it('sends subscribe with query, variables, and operationName', async () => {
		const client = new WsClient({ url: 'ws://localhost:4000/graphql' });

		client.subscribe(fakeDoc('GetPosts'), { first: 10 }, { next: vi.fn(), error: vi.fn(), complete: vi.fn() });

		await new Promise((r) => setTimeout(r, 10));
		getWs().simulateMessage({ type: 'connection_ack' });

		const sent = getWs().getSent();
		const subscribeMsg = sent.find((s) => {
			const msg = JSON.parse(s);
			return msg.type === 'subscribe';
		});

		expect(subscribeMsg).toBeDefined();
		const parsed = JSON.parse(subscribeMsg!);
		expect(parsed.payload.operationName).toBe('GetPosts');
		expect(parsed.payload.variables).toEqual({ first: 10 });
	});
});
