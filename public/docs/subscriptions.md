---
title: "Subscriptions"
slug: subscriptions
group: "Features"
order: 1
since: "0.0.1"
tags: [subscriptions, websocket]
description: "WebSocket subscriptions"
---

# @quenetiq/subscriptions

The subscriptions package enables real-time data streaming over WebSocket using the `graphql-transport-ws` protocol. It integrates fully with the Quenetiq middleware pipeline so authenticated subscriptions work out of the box.

## GraphqlSubscriptionService

`GraphqlSubscriptionService` manages WebSocket connections and subscription lifecycles. Install it by calling `provideQuenetiqSubscriptions` with the WebSocket URL:

```ts
import { provideQuenetiqSubscriptions } from '@quenetiq/subscriptions/angular';

provideQuenetiqSubscriptions({
  wsUrl: 'ws://localhost:4000/graphql',
});
```

## subscribe()

Use `subscribe()` to listen for real-time events. It returns a signal that updates whenever a new event arrives:

```ts
import { GraphqlSubscriptionService } from '@quenetiq/subscriptions/angular';
import { gql } from '@quenetiq/core';

const subscription = inject(GraphqlSubscriptionService);
const newPosts = subscription.subscribe(
  gql`subscription OnNewPost { newPost { id title createdAt } }`,
);

// newPosts is an Observable<Post | null>
// It updates every time the server pushes a new event
```

## graphql-transport-ws Protocol

Quenetiq subscriptions implement the `graphql-transport-ws` protocol (the modern replacement for `subscriptions-transport-ws`). This provides:

- **Single connection multiplexing** — one WebSocket handles many subscriptions
- **Auto-reconnect** — with exponential backoff and jitter
- **Connection params** — send auth tokens during the `connection_init` handshake
- **Complete / Error handling** — per-subscription lifecycle callbacks

```ts
provideQuenetiqSubscriptions({
  wsUrl: 'ws://localhost:4000/graphql',
  connectionParams: () => ({
    authorization: `Bearer ${inject(AuthService).token()}`,
  }),
  reconnect: true,
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
});
```

## API Reference

### Classes

| Name | Description | Type |
|------|-------------|------|
| `GraphqlSubscription` | Framework-agnostic WebSocket subscription class. Manages a single subscription lifecycle over the graphql-transport-ws protocol. | class |
| `GraphqlSubscription.constructor` | Creates a new GraphqlSubscription with the GraphQL endpoint URL. | constructor |
| `GraphqlSubscription.subscribe(query, variables?, callbacks?)` | Opens a WebSocket connection, subscribes to the given query, and returns an unsubscribe function. | method |
| `GraphqlLiveQuery` | Framework-agnostic class combining initial HTTP query fetch with WebSocket subscription for real-time updates. | class |
| `GraphqlSubscriptionService` | Injectable Angular service wrapping GraphqlSubscription. Returns RxJS Observables for subscription data. | class |
| `GraphqlSubscriptionService.subscribe(document, variables?)` | Subscribes to a GraphQL subscription and returns an Observable that emits on each server push. | method |

### Functions

| Name | Description | Type |
|------|-------------|------|
| `subscribe(document, variables?)` | Standalone injectable function that returns an Observable for a GraphQL subscription using GraphqlSubscriptionService. | function |
| `provideQuenetiqSubscriptions(config?)` | Angular provider function that configures WebSocket URL, connection params, and reconnect settings. | function |

### SubscriptionsConfig

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `SubscriptionsConfig` | Configuration interface for the subscriptions provider. | interface | |
| `SubscriptionsConfig.wsUrl` | WebSocket endpoint URL for GraphQL subscriptions. | property | |
| `SubscriptionsConfig.connectionParams` | Function returning connection parameters sent during WebSocket initialization (e.g. auth tokens). | property | |
| `SubscriptionsConfig.reconnect` | Whether to automatically reconnect on WebSocket disconnection. | property | `false` |
| `SubscriptionsConfig.reconnectInterval` | Interval in milliseconds between reconnection attempts. | property | `1000` |
| `SubscriptionsConfig.maxReconnectAttempts` | Maximum number of reconnection attempts before giving up. | property | `10` |
| `SUBSCRIPTIONS_CONFIG` | Angular InjectionToken used to provide SubscriptionsConfig to the subscriptions service. | constant | |

## Starters

### Vanilla JS

```ts
import { createClient, gql } from '@quenetiq/client';

const client = createClient({
  endpoint: '/graphql',
  wsEndpoint: 'ws://localhost:4000/graphql',
});

const ON_MESSAGE = gql`subscription OnMessage {
  messageAdded { id content createdAt }
}`;

(async () => {
  for await (const result of client.subscribe(ON_MESSAGE)) {
    if (result.status === 'success') {
      console.log('New message:', result.data.messageAdded);
    }
  }
})();
```

### Angular

```ts
import { provideQuenetiq, GraphqlSubscriptionService } from '@quenetiq/core';
import { createHttpLink } from '@quenetiq/core/link';

export const appConfig: ApplicationConfig = {
  providers: [
    provideQuenetiq({ link: createHttpLink({ uri: '/graphql' }) }),
  ],
};

@Component({ ... })
export class ChatComponent implements OnInit {
  private subs = inject(GraphqlSubscriptionService);
  messages: string[] = [];

  ngOnInit() {
    this.subs.subscribe(gql`subscription OnMessage {
      messageAdded { id content }
    }`).subscribe(({ data }) => {
      if (data?.messageAdded) {
        this.messages.push(data.messageAdded.content);
      }
    });
  }
}
```

### React

```tsx
import { QuenetiqProvider, useSubscription, gql } from '@quenetiq/react';
import { createClient } from '@quenetiq/client';

const client = createClient({
  endpoint: '/graphql',
  wsEndpoint: 'ws://localhost:4000/graphql',
});

function Chat() {
  const { data } = useSubscription(gql`subscription OnMessage {
    messageAdded { id content }
  }`);

  return <p>Latest: {data?.messageAdded?.content ?? 'waiting...'}</p>;
}

function App() {
  return <QuenetiqProvider client={client}><Chat /></QuenetiqProvider>;
}
```

### Vue

```ts
import { createQuenetiqPlugin, useSubscription, gql } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';
import { createApp } from 'vue';

const client = createClient({
  endpoint: '/graphql',
  wsEndpoint: 'ws://localhost:4000/graphql',
});
const app = createApp(App);
app.use(createQuenetiqPlugin(client));
```

```vue
<script setup lang="ts">
const { data } = useSubscription(gql`subscription OnMessage {
  messageAdded { id content }
}`);
</script>

<template>
  <p>Latest: {{ data?.messageAdded?.content ?? 'waiting...' }}</p>
</template>
```

## Try it live

:::stackblitz starter="subscriptions"
