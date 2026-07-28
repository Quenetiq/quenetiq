import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@quenetiq/client', async () => {
  const actual = await vi.importActual<typeof import('@quenetiq/client')>('@quenetiq/client');
  return { ...actual, print: vi.fn(() => 'query { foo }') };
});

import { QuenetiqClient } from '@quenetiq/client';
import { useLiveQuery } from '../use-live-query';
import { QuenetiqProvider } from '../provider';

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

describe('useLiveQuery', () => {
  let mockWs: ReturnType<typeof createMockWebSocket>;
  let wsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockWs = createMockWebSocket();
    wsMock = vi.fn(function () { return mockWs.ws as unknown as WebSocket; });
    globalThis.WebSocket = wsMock as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function wrapper(client: QuenetiqClient) {
    return ({ children }: { children: React.ReactNode }) =>
      <QuenetiqProvider client={client}>{children}</QuenetiqProvider>;
  }

  it('starts with loading=true and data=null', () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(
      () => useLiveQuery('query { foo }' as any),
      { wrapper: wrapper(client) },
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets data and loading=false on successful query', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });

    const { result } = renderHook(
      () => useLiveQuery('query { foo }' as any),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ foo: 'bar' });
    expect(result.current.error).toBeNull();
  });

  it('sets error and errorCode on failed query', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({
      status: 'error',
      error: 'Not found',
      errorCode: 'GRAPHQL_ERROR',
    });

    const onError = vi.fn();
    const { result } = renderHook(
      () => useLiveQuery('query { foo }' as any, { onError }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Not found');
    expect(result.current.errorCode).toBe('GRAPHQL_ERROR');
    expect(onError).toHaveBeenCalledWith('Not found', 'GRAPHQL_ERROR');
  });

  it('calls onCompleted callback on success', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });
    const onCompleted = vi.fn();

    renderHook(
      () => useLiveQuery('query { foo }' as any, { onCompleted }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(onCompleted).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('opens WebSocket and subscribes after successful query', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });

    renderHook(
      () => useLiveQuery('query { foo }' as any),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // WebSocket created with ws:// protocol
    expect(wsMock).toHaveBeenCalledWith('ws://test/graphql', 'graphql-transport-ws');

    // onopen sends connection_init
    act(() => { mockWs.triggerOpen(); });
    expect(mockWs.ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'connection_init' }));

    // connection_ack triggers subscribe
    act(() => { mockWs.triggerMessage({ type: 'connection_ack' }); });
    expect(mockWs.ws.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'subscribe',
      id: 'live1',
      payload: { query: 'query { foo }', variables: {} },
    }));
  });

  it('updates data when WebSocket sends next message', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'initial' } });

    const { result } = renderHook(
      () => useLiveQuery('query { foo }' as any),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => { mockWs.triggerOpen(); });
    act(() => { mockWs.triggerMessage({ type: 'connection_ack' }); });

    act(() => {
      mockWs.triggerMessage({
        type: 'next',
        payload: { data: { foo: 'updated' } },
      });
    });

    expect(result.current.data).toEqual({ foo: 'updated' });
  });

  it('sets error when WebSocket sends next with errors', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'ok' } });
    const onError = vi.fn();

    const { result } = renderHook(
      () => useLiveQuery('query { foo }' as any, { onError }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => { mockWs.triggerOpen(); });
    act(() => { mockWs.triggerMessage({ type: 'connection_ack' }); });

    act(() => {
      mockWs.triggerMessage({
        type: 'next',
        payload: { errors: [{ message: 'Subscription failed' }] },
      });
    });

    expect(result.current.error).toBe('Subscription failed');
    expect(result.current.errorCode).toBe('GRAPHQL_ERROR');
    expect(onError).toHaveBeenCalledWith('Subscription failed', 'GRAPHQL_ERROR');
  });

  it('sets error when WebSocket sends error message', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'ok' } });
    const onError = vi.fn();

    const { result } = renderHook(
      () => useLiveQuery('query { foo }' as any, { onError }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => { mockWs.triggerOpen(); });
    act(() => { mockWs.triggerMessage({ type: 'error' }); });

    expect(result.current.error).toBe('Live query subscription error');
    expect(result.current.errorCode).toBe('GRAPHQL_ERROR');
    expect(onError).toHaveBeenCalledWith('Live query subscription error', 'GRAPHQL_ERROR');
  });

  it('sets NETWORK_ERROR on WebSocket error event', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'ok' } });
    const onError = vi.fn();

    const { result } = renderHook(
      () => useLiveQuery('query { foo }' as any, { onError }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => { mockWs.triggerError(); });

    expect(result.current.error).toBe('WebSocket connection error');
    expect(result.current.errorCode).toBe('NETWORK_ERROR');
    expect(onError).toHaveBeenCalledWith('WebSocket connection error', 'NETWORK_ERROR');
  });

  it('does not open WebSocket when shouldSubscribe=false', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });

    renderHook(
      () => useLiveQuery('query { foo }' as any, { shouldSubscribe: false }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(wsMock).not.toHaveBeenCalled();
  });

  it('derives wsEndpoint from client.endpoint by replacing http with ws', async () => {
    const client = new QuenetiqClient({ endpoint: 'https://example.com/api/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });

    renderHook(
      () => useLiveQuery('query { foo }' as any),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(wsMock).toHaveBeenCalledWith('wss://example.com/api/graphql', 'graphql-transport-ws');
  });

  it('uses custom wsEndpoint when provided', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });

    renderHook(
      () => useLiveQuery('query { foo }' as any, { wsEndpoint: 'ws://custom:9090/ws' }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(wsMock).toHaveBeenCalledWith('ws://custom:9090/ws', 'graphql-transport-ws');
  });

  it('closes WebSocket on unmount', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });

    const { unmount } = renderHook(
      () => useLiveQuery('query { foo }' as any),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => { mockWs.triggerOpen(); });

    unmount();

    expect(mockWs.ws.close).toHaveBeenCalledWith(1000, 'unsubscribe');
  });

  it('ignores malformed WebSocket messages without throwing', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });

    const { result } = renderHook(
      () => useLiveQuery('query { foo }' as any),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => { mockWs.triggerOpen(); });

    act(() => {
      mockWs.ws.onmessage?.({ data: 'not-json' } as MessageEvent);
    });

    expect(result.current.error).toBeNull();
  });

  it('does not set data after component is cancelled (unmounted mid-query)', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    let resolveQuery!: (value: unknown) => void;
    client.query = vi.fn().mockReturnValue(new Promise((resolve) => { resolveQuery = resolve; }));

    const { result, unmount } = renderHook(
      () => useLiveQuery('query { foo }' as any),
      { wrapper: wrapper(client) },
    );

    expect(result.current.loading).toBe(true);

    unmount();

    await act(async () => {
      resolveQuery({ status: 'success', data: { foo: 'late' } });
      await new Promise((r) => setTimeout(r, 10));
    });
  });

  it('sends variables in the subscribe message', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });

    renderHook(
      () => useLiveQuery('query { foo }' as any, { variables: { id: '123' } }),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => {
      expect(client.query).toHaveBeenCalled();
    });

    act(() => { mockWs.triggerOpen(); });
    act(() => { mockWs.triggerMessage({ type: 'connection_ack' }); });

    expect(mockWs.ws.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'subscribe',
      id: 'live1',
      payload: { query: 'query { foo }', variables: { id: '123' } },
    }));
  });

  it('calls client.query with variables', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });

    renderHook(
      () => useLiveQuery('query { foo }' as any, { variables: { first: 10 } }),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => {
      expect(client.query).toHaveBeenCalled();
    });

    expect(client.query).toHaveBeenCalledWith('query { foo }' as any, { first: 10 });
  });

  it('does not send subscribe if already cancelled when connection_ack arrives', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'bar' } });

    const { unmount } = renderHook(
      () => useLiveQuery('query { foo }' as any),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => {
      expect(client.query).toHaveBeenCalled();
    });

    // Open the WebSocket so the handler is set up, then unmount
    act(() => { mockWs.triggerOpen(); });

    // Now unmount to trigger cleanup (sets cancelledRef.current = true)
    unmount();

    // Create a fresh send spy to track only new calls
    const freshSend = vi.fn();
    mockWs.ws.send = freshSend;

    // Trigger connection_ack — handler should bail because cancelledRef.current is true
    act(() => { mockWs.triggerMessage({ type: 'connection_ack' }); });

    expect(freshSend).not.toHaveBeenCalled();
  });

  it('calls onError on WebSocket error event even after initial query success', async () => {
    const client = new QuenetiqClient({ endpoint: 'http://test/graphql' });
    client.query = vi.fn().mockResolvedValue({ status: 'success', data: { foo: 'ok' } });
    const onError = vi.fn();

    const { result } = renderHook(
      () => useLiveQuery('query { foo }' as any, { onError }),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => {
      expect(client.query).toHaveBeenCalled();
    });

    // Flush microtasks so the WS is fully created and handlers assigned
    await act(async () => {});

    // Trigger WebSocket error
    act(() => { mockWs.triggerError(); });

    expect(result.current.error).toBe('WebSocket connection error');
    expect(result.current.errorCode).toBe('NETWORK_ERROR');
    expect(onError).toHaveBeenCalledWith('WebSocket connection error', 'NETWORK_ERROR');
  });
});
