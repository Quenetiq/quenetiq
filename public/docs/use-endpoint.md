---
title: 'Endpoint Decorator & Resolver'
slug: use-endpoint
group: 'Core'
order: 7
since: '1.0.0'
tags: [core, endpoint, decorator, resolver]
description: 'Named endpoint decorator and resolvers'
---

# Endpoint Decorator & Resolver

Utilities for working with named GraphQL endpoints.

## @UseEndpoint

Class decorator that binds an Angular component/service to a named GraphQL endpoint. The decorated class gets an `endpoint` property injected at construction time.

```typescript
import { UseEndpoint } from '@quenetiq/core';

@UseEndpoint('payments')
@Component({ ... })
export class PaymentsComponent {
  readonly ep = this.endpoint;

  constructor() {
    this.ep.query(PAYMENTS_QUERY).subscribe(result => { ... });
  }
}
```

### How It Works

The decorator wraps the constructor, injects the named `GraphqlEndpoint` via `injectEndpoint(name)`, and defines a non-writable `endpoint` property on the instance.

If the endpoint is not yet registered at injection time, the property remains `undefined`.

## createEndpointResolver

Factory function for resolving endpoint names to URLs at runtime without Angular DI:

```typescript
import { createEndpointResolver } from '@quenetiq/core';

const resolver = createEndpointResolver({
	payments: { url: 'https://api.example.com/payments' },
	auth: { url: 'https://auth.example.com/graphql' },
});

const url = resolver('payments');
// 'https://api.example.com/payments'
```

## validateGroupRoutes

Validates that all endpoint names in a group exist in the endpoints map:

```typescript
import { validateGroupRoutes } from '@quenetiq/core';

const errors = validateGroupRoutes('payments', ['stripe', 'paypal'], ['stripe', 'paypal', 'auth']);
// [] — all valid

const errors = validateGroupRoutes('payments', ['stripe', 'paypal'], ['stripe']);
// ['Group "payments" references unknown route "paypal"']
```

## API Reference

| Member                                                  | Type      | Description                                                                             |
| ------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| `@UseEndpoint(name)`                                    | decorator | Class decorator that injects a named `GraphqlEndpoint` as the `endpoint` property.      |
| `createEndpointResolver(endpoints)`                     | function  | Factory: `(name: string) => string \| undefined` for runtime URL resolution without DI. |
| `validateGroupRoutes(groupName, routeNames, allRoutes)` | function  | Validates endpoint group routes. Returns `string[]` of errors.                          |
