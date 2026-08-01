---
title: 'WsClient'
slug: ws-client
group: 'Features'
order: 1
since: '0.0.1'
tags: [subscriptions, websocket, client]
description: 'Multiplexed WebSocket client'
---

# WsClient

A full-featured WebSocket connection manager that multiplexes multiple GraphQL subscriptions over a single WebSocket connection.

```typescript
import { WsClient, type WsClientOptions } from '@quenetiq/subscriptions';

const client = new WsClient({
  url: 'wss://api.example.com/graphql',
  connectionParams: () => ({ token: getAuthToken() }),
  keepAliveInterval: 30000,
  maxReconnectAttempts: 5,
});

const unsub = client.subscribe(
  { kind: 'Document', definitions: [...] },
  {
    next: (data) => console.log('Update:', data),
    error: (err) => console.error('Error:', err),
    complete: () => console.log('Done'),
  },
);

// Unsubscribe when done
unsub();
```

## Features

- **Multiplexing**: Multiple subscriptions share one WebSocket connection
- **Auto-reconnection**: Exponential backoff with configurable max attempts
- **Keep-alive**: Configurable ping/pong interval
- **Protocol**: `graphql-transport-ws` compliant

## WsClientManager

Factory that creates and reuses `WsClient` instances keyed by URL:

```typescript
import { WsClientManager } from '@quenetiq/subscriptions';

const manager = new WsClientManager({ maxReconnectAttempts: 3 });
manager.subscribe('wss://api1.example.com/graphql', query, callbacks);
manager.subscribe('wss://api2.example.com/graphql', query, callbacks);

manager.closeAll(); // Close all connections
```

## API Reference

### WsClientOptions

| Option                 | Type                            | Default                | Description                       |
| ---------------------- | ------------------------------- | ---------------------- | --------------------------------- |
| `url`                  | `string`                        | —                      | WebSocket endpoint URL            |
| `protocol`             | `string`                        | `graphql-transport-ws` | WebSocket sub-protocol            |
| `connectionParams`     | `() => Record<string, unknown>` | —                      | Auth params for `connection_init` |
| `keepAliveInterval`    | `number`                        | `30000`                | Ping interval (ms)                |
| `connectionTimeout`    | `number`                        | `10000`                | Connection timeout (ms)           |
| `maxReconnectAttempts` | `number`                        | `∞`                    | Max reconnection attempts         |
| `reconnectDelay`       | `number`                        | `1000`                 | Initial reconnect delay (ms)      |
| `maxReconnectDelay`    | `number`                        | `30000`                | Max reconnect delay (ms)          |
| `onConnected`          | `() => void`                    | —                      | Connected callback                |
| `onDisconnected`       | `(event) => void`               | —                      | Disconnected callback             |
| `onReconnecting`       | `() => void`                    | —                      | Reconnecting callback             |
