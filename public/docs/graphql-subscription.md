---
title: 'GraphQL Subscription'
slug: graphql-subscription
group: 'Features'
order: 2
since: '0.0.1'
tags: [subscriptions, graphql]
description: 'Basic GraphQL subscription client'
---

# GraphQL Subscription

A simple GraphQL subscription client using the `graphql-transport-ws` protocol. Takes an HTTP endpoint and auto-converts to WebSocket.

```typescript
import { GraphqlSubscription } from '@quenetiq/subscriptions';

const sub = new GraphqlSubscription('https://api.example.com/graphql');
const unsub = sub.subscribe(query, {
	next: (data) => console.log('Update:', data),
	error: (err) => console.error(err),
	complete: () => console.log('Done'),
});
```

## GraphqlLiveQuery

Combines HTTP + WebSocket for live queries:

```typescript
import { GraphqlLiveQuery } from '@quenetiq/subscriptions';

const liveQuery = new GraphqlLiveQuery('https://api.example.com/graphql');
const unsub = await liveQuery.execute(query, variables, {
	next: (data) => console.log('Live data:', data),
	error: (err) => console.error(err),
	complete: () => console.log('Complete'),
});
```

## Angular Integration

```typescript
import { GraphqlSubscriptionService, subscribe } from '@quenetiq/subscriptions/angular';

class MyComponent {
	private subService = inject(GraphqlSubscriptionService);

	ngOnInit() {
		this.subService.subscribe(query, variables).subscribe((data) => {
			console.log('Subscription data:', data);
		});
	}
}

// Or using the standalone function
const stream$ = subscribe(query, variables);
```
