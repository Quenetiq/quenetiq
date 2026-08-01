<p align="center">
  <img src="https://raw.githubusercontent.com/Quenetiq/quenetiq/main/projects/quenetiq/core/assets/logo.svg" alt="Quenetiq" width="160"/>
</p>

## Install

```bash
npm install @quenetiq/subscriptions
```

## Usage (framework‑agnostic)

```typescript
import { GraphqlSubscription } from '@quenetiq/subscriptions';
import { print, gql } from 'graphql';

const subs = new GraphqlSubscription('/graphql');

const unsubscribe = subs.subscribe(
  print(gql`subscription { messageAdded { content } }`),
  {},
  {
    next: (data) => console.log('new message', data),
    error: (err) => console.error('sub error', err),
    complete: () => console.log('sub complete'),
  },
);

// later: unsubscribe();
```

## Usage (Angular)

```typescript
import { Component, inject } from '@angular/core';
import { GraphqlSubscriptionService } from '@quenetiq/subscriptions/angular';
import { gql } from '@quenetiq/core';

@Component({})
class MessagesComponent {
  private subs = inject(GraphqlSubscriptionService);
  messages$ = this.subs.subscribe<{ content: string }>(
    gql`subscription { messageAdded { content } }`,
  );
}
```

Or standalone:

```typescript
import { subscribe } from '@quenetiq/subscriptions/angular';

@Component({})
class MessagesComponent {
  messages$ = subscribe<{ content: string }>(
    gql`subscription { messageAdded { content } }`,
  );
}
```

## Angular Provider

```typescript
import { provideQuenetiqSubscriptions } from '@quenetiq/subscriptions/angular';

export const appConfig = {
  providers: [
    provideQuenetiqSubscriptions({
      wsUrl: 'ws://localhost:4000/graphql',
      connectionParams: () => ({ authorization: `Bearer ${getToken()}` }),
    }),
  ],
};
```

## API

### `@quenetiq/subscriptions` (agnostic)

| Export | Description |
|--------|-------------|
| `GraphqlSubscription` | Core WebSocket subscription class |

### `@quenetiq/subscriptions/angular` (Angular)

| Export | Description |
|--------|-------------|
| `GraphqlSubscriptionService` | Injectable WebSocket subscription manager |
| `subscribe(document, variables?)` | Standalone function (injection‑free) |
| `provideQuenetiqSubscriptions(config?)` | Provider for subscription config |
| `SubscriptionsConfig` | Configuration interface |
| `SUBSCRIPTIONS_CONFIG` | Injection token |

## Dependencies

- Core (`@quenetiq/subscriptions`): `@quenetiq/core`  
- Angular (`@quenetiq/subscriptions/angular`): additionally `@angular/core`, `rxjs`
