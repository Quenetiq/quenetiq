import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@quenetiq/client', async () => {
  const actual = await vi.importActual<typeof import('@quenetiq/client')>('@quenetiq/client');
  return { ...actual, print: vi.fn(() => 'subscription { x }') };
});

import { QuenetiqClient } from '@quenetiq/client';
import { useSubscription } from '../use-subscription';
import { QuenetiqProvider } from '../provider';

function createMockWebSocket() {
  let onopen: (() => void) | null = null;
  let onclose: ((event: CloseEvent) => void) | null = null;
  let onerror: ((event: Event) => void) | null = null;
  let onmessage: ((event: MessageEvent) => void) | null = null;
  let closeCode: number | undefined;
  let closeReason: string | undefined;

  const ws = {
    readyState: WebSocket.CONNECTING,
    send: vi.fn(),
    close: vi.fn((code?: number, reason?: string) => {
      closeCode = code;
      closeReason = reason;
      onclose?.({ code: code ?? 1000, reason: reason ?? '', wasClean: true } as CloseEvent);
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    get onopen() { return onopen; },
    set onopen(fn) { onopen = fn; },
    get onclose() { return onclose; },
    set onclose(fn) { onclose = fn; },
    get onerror() { return onerror; },
    set onerror(fn) { onerror = fn; },
    get onmessage() { return onmessage; },
    set onmessage(fn) { onmessage = fn; },
  };

  const triggerOpen = () => {
    (ws as any).readyState = WebSocket.OPEN;
    onopen?.();
  };

  const triggerMessage = (data: unknown) => {
    onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  };

  const triggerClose = (code = 1000, reason = '') => {
    (ws as any).readyState = WebSocket.CLOSED;
    onclose?.({ code, reason, wasClean: code === 1000 } as CloseEvent);
  };

  const triggerError = () => {
    onerror?.(new Event('error'));
  };

  return { ws, triggerOpen, triggerMessage, triggerClose, triggerError };
}

describe('useSubscription reconnect (React)', () => {
  let mockWs: ReturnType<typeof createMockWebSocket>;
  let wsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWs = createMockWebSocket();
    wsMock = vi.fn(function() { return mockWs.ws as unknown as WebSocket; });
    globalThis.WebSocket = wsMock as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function wrapper(client: QuenetiqClient) {
    return ({ children }: { children: React.ReactNode }) =>
      <QuenetiqProvider client={client}>{children}</QuenetiqProvider>;
  }

  it('reconnects on close when reconnect is enabled', () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    renderHook(
      () => useSubscription('subscription { x }' as any, { reconnect: true, reconnectInterval: 100, maxReconnects: 3 }),
      { wrapper: wrapper(client) },
    );

    // first connection
    mockWs.triggerOpen();
    expect(wsMock).toHaveBeenCalledTimes(1);

    // close triggers reconnect
    mockWs.triggerClose(1006, 'abnormal');
    expect(vi.getTimerCount()).toBe(1);

    // fast-forward past the reconnect delay
    act(() => { vi.advanceTimersByTime(5000); });
    expect(wsMock).toHaveBeenCalledTimes(2);
  });

  it('stops reconnecting after maxReconnects attempts', () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    renderHook(
      () => useSubscription('subscription { x }' as any, { reconnect: true, reconnectInterval: 100, maxReconnects: 2 }),
      { wrapper: wrapper(client) },
    );

    // connect → close × 3 = 1 initial + 2 reconnect max = 3 total
    for (let i = 0; i < 4; i++) {
      act(() => { vi.advanceTimersByTime(10000); });
      mockWs.triggerClose(1006, 'abnormal');
    }

    // 1 initial + 2 reconnects = 3
    expect(wsMock).toHaveBeenCalledTimes(3);
  });

  it('does not reconnect when reconnect is disabled', () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    renderHook(
      () => useSubscription('subscription { x }' as any, { reconnect: false }),
      { wrapper: wrapper(client) },
    );

    mockWs.triggerClose(1006, 'abnormal');
    act(() => { vi.advanceTimersByTime(10000); });

    expect(wsMock).toHaveBeenCalledTimes(1);
  });

  it('cleans up reconnect timer on unmount', () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    const { unmount } = renderHook(
      () => useSubscription('subscription { x }' as any, { reconnect: true, reconnectInterval: 100, maxReconnects: 5 }),
      { wrapper: wrapper(client) },
    );

    mockWs.triggerClose();
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sets error on WebSocket error event', () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    const onError = vi.fn();
    const { result } = renderHook(
      () => useSubscription('subscription { x }' as any, { onError }),
      { wrapper: wrapper(client) },
    );

    act(() => { mockWs.triggerError(); });

    expect(result.current.error).toBe('WebSocket connection error');
    expect(result.current.errorCode).toBe('NETWORK_ERROR');
    expect(onError).toHaveBeenCalledWith('WebSocket connection error', 'NETWORK_ERROR');
  });

  it('calls onComplete when complete message received', () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    const onComplete = vi.fn();
    const { result } = renderHook(
      () => useSubscription('subscription { x }' as any, { onComplete }),
      { wrapper: wrapper(client) },
    );

    act(() => {
      mockWs.triggerMessage({ type: 'complete' });
    });

    expect(onComplete).toHaveBeenCalledOnce();
    expect(result.current.loading).toBe(false);
  });

  it('handles malformed message without throwing', () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    const onError = vi.fn();
    const { result } = renderHook(
      () => useSubscription('subscription { x }' as any, { onError }),
      { wrapper: wrapper(client) },
    );

    act(() => {
      mockWs.onmessage?.({ data: 'not-json' } as MessageEvent);
    });

    expect(result.current.error).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});
