import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../plugin', () => ({
	useClient: vi.fn(),
}));

vi.mock('@quenetiq/client', async () => {
	const actual = await vi.importActual<typeof import('@quenetiq/client')>('@quenetiq/client');
	return { ...actual, print: vi.fn(() => 'subscription { x }') };
});

vi.mock('vue', async () => {
	const actual = await vi.importActual<typeof import('vue')>('vue');
	return {
		...actual,
		onMounted: vi.fn((fn: () => void) => fn()),
		onUnmounted: vi.fn(),
	};
});

import { useSubscription } from '../use-subscription';
import { useClient } from '../plugin';
import { onUnmounted } from 'vue';

function createMockWebSocket() {
	let onopen: (() => void) | null = null;
	let onclose: ((event: CloseEvent) => void) | null = null;
	let onerror: ((event: Event) => void) | null = null;
	let onmessage: ((event: MessageEvent) => void) | null = null;

	const ws = {
		readyState: WebSocket.CONNECTING,
		send: vi.fn(),
		close: vi.fn((code?: number, reason?: string) => {
			onclose?.({ code: code ?? 1000, reason: reason ?? '', wasClean: true } as CloseEvent);
		}),
		get onopen() {
			return onopen;
		},
		set onopen(fn) {
			onopen = fn;
		},
		get onclose() {
			return onclose;
		},
		set onclose(fn) {
			onclose = fn;
		},
		get onerror() {
			return onerror;
		},
		set onerror(fn) {
			onerror = fn;
		},
		get onmessage() {
			return onmessage;
		},
		set onmessage(fn) {
			onmessage = fn;
		},
	};

	const triggerOpen = () => {
		onopen?.();
	};
	const triggerMessage = (data: unknown) => {
		onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
	};
	const triggerClose = (code = 1000, reason = '') => {
		onclose?.({ code, reason, wasClean: code === 1000 } as CloseEvent);
	};
	const triggerError = () => {
		onerror?.(new Event('error'));
	};

	return { ws, triggerOpen, triggerMessage, triggerClose, triggerError };
}

describe('useSubscription reconnect (Vue)', () => {
	let mockWs: ReturnType<typeof createMockWebSocket>;
	let wsMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mockWs = createMockWebSocket();
		wsMock = vi.fn(function () {
			return mockWs.ws as unknown as WebSocket;
		});
		globalThis.WebSocket = wsMock as unknown as typeof WebSocket;
		vi.mocked(useClient).mockReturnValue({ endpoint: 'http://test/graphql' } as never);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('reconnects on close when reconnect is enabled', () => {
		useSubscription('subscription { x }' as any, { reconnect: true, reconnectInterval: 100, maxReconnects: 3 });

		mockWs.triggerOpen();
		expect(wsMock).toHaveBeenCalledTimes(1);

		mockWs.triggerClose(1006, 'abnormal');
		expect(vi.getTimerCount()).toBe(1);

		vi.advanceTimersByTime(5000);
		expect(wsMock).toHaveBeenCalledTimes(2);
	});

	it('stops reconnecting after maxReconnects attempts', () => {
		useSubscription('subscription { x }' as any, { reconnect: true, reconnectInterval: 100, maxReconnects: 2 });

		for (let i = 0; i < 4; i++) {
			vi.advanceTimersByTime(10000);
			mockWs.triggerClose(1006, 'abnormal');
		}

		// 1 initial + 2 reconnects = 3
		expect(wsMock).toHaveBeenCalledTimes(3);
	});

	it('does not reconnect when reconnect is disabled', () => {
		useSubscription('subscription { x }' as any, { reconnect: false });

		mockWs.triggerClose(1006, 'abnormal');
		vi.advanceTimersByTime(10000);

		expect(wsMock).toHaveBeenCalledTimes(1);
	});

	it('cleans up reconnect timer on unmount', () => {
		useSubscription('subscription { x }' as any, { reconnect: true, reconnectInterval: 100, maxReconnects: 5 });

		mockWs.triggerClose();
		expect(vi.getTimerCount()).toBe(1);

		const cleanup = vi.mocked(onUnmounted).mock.calls[0][0];
		cleanup();

		expect(vi.getTimerCount()).toBe(0);
	});

	it('sets error on WebSocket error event', () => {
		const onError = vi.fn();
		const { error, errorCode } = useSubscription('subscription { x }' as any, { onError });

		mockWs.triggerError();

		expect(error.value).toBe('WebSocket connection error');
		expect(errorCode.value).toBe('NETWORK_ERROR');
		expect(onError).toHaveBeenCalledWith('WebSocket connection error', 'NETWORK_ERROR');
	});

	it('calls onComplete when complete message received', () => {
		const onComplete = vi.fn();
		const { loading } = useSubscription('subscription { x }' as any, { onComplete });

		mockWs.triggerMessage({ type: 'complete' });

		expect(onComplete).toHaveBeenCalledOnce();
		expect(loading.value).toBe(false);
	});

	it('handles malformed message without throwing', () => {
		const onError = vi.fn();
		const { error } = useSubscription('subscription { x }' as any, { onError });

		mockWs.onmessage?.({ data: 'not-json' } as MessageEvent);

		expect(error.value).toBeNull();
		expect(onError).not.toHaveBeenCalled();
	});

	it('reports GraphQL errors in next message payload', () => {
		const onError = vi.fn();
		const { error, errorCode, loading } = useSubscription('subscription { x }' as any, { onError });

		mockWs.triggerMessage({
			type: 'next',
			payload: { errors: [{ message: 'Access denied' }] },
		});

		expect(error.value).toBe('Access denied');
		expect(errorCode.value).toBe('GRAPHQL_ERROR');
		expect(loading.value).toBe(false);
		expect(onError).toHaveBeenCalledWith('Access denied', 'GRAPHQL_ERROR');
	});

	it('receives subscription data on next message', () => {
		const onNext = vi.fn();
		const { data, loading } = useSubscription<{ content: string }>('subscription { x }' as any, { onNext });

		mockWs.triggerMessage({
			type: 'next',
			payload: { data: { content: 'hello' } },
		});

		expect(data.value).toEqual({ content: 'hello' });
		expect(loading.value).toBe(false);
		expect(onNext).toHaveBeenCalledWith({ content: 'hello' });
	});
});
