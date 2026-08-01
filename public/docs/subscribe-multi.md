---
title: 'Multi-Endpoint Subscriptions'
slug: subscribe-multi
group: 'Core'
order: 10
since: '1.0.0'
tags: [core, subscription, websocket, multi-endpoint]
description: 'Multi-endpoint aware WebSocket subscriptions'
---

# Multi-Endpoint Subscriptions

Multi-endpoint aware WebSocket subscriptions that resolve the WS URL from the named endpoint.

```typescript
import { resolveSubscriptionUrl, subscribeTo } from '@quenetiq/core';
```

## resolveSubscriptionUrl

Resolves the WebSocket URL for a subscription based on the endpoint name. Converts HTTP/S URLs to WS/WSS.

```typescript
const wsUrl = resolveSubscriptionUrl('main');
// 'http://localhost:4000/graphql' → 'ws://localhost:4000/graphql'
// 'https://api.example.com/graphql' → 'wss://api.example.com/graphql'
```

Returns `undefined` if the endpoint is not found.

## subscribeTo

Creates a subscription Observable bound to a named endpoint. Resolves the WebSocket URL at subscription time via DI.

```typescript
import { subscribeTo } from '@quenetiq/core';

@Component({ ... })
class PaymentsComponent {
  payments$ = subscribeTo('payments', PAYMENTS_SUBSCRIPTION, { userId: '123' });

  constructor() {
    this.payments$.subscribe(data => console.log('Payment update:', data));
  }
}
```

The function uses `defer()` so the injection context is resolved at subscription time (not at creation time), allowing it to be used as a class field initializer.

## API Reference

| Signature                                         | Returns               | Description                                                                          |
| ------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `resolveSubscriptionUrl(endpointName)`            | `string \| undefined` | Resolves WebSocket URL from a named endpoint. Converts HTTP → WS, HTTPS → WSS.       |
| `subscribeTo(endpointName, document, variables?)` | `Observable<T>`       | Creates a subscription Observable bound to a named endpoint. Resolves WS URL via DI. |
