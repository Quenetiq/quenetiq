---
title: 'Endpoint Mocking'
slug: endpoint-mock
group: 'Core'
order: 9
since: '1.0.0'
tags: [core, endpoint, mock, testing, middleware]
description: 'Schema-aware endpoint mocking middleware'
---

# Endpoint Mocking

`endpointMockMiddleware` is a schema-aware automatic mock middleware for endpoints. It intercepts requests and returns typed stub data without hitting the network.

```typescript
import { endpointMockMiddleware } from '@quenetiq/core';
```

## Usage

```typescript
const mockMw = endpointMockMiddleware({
	// Simulate network latency (ms)
	delay: 200,
	// Real requests to these endpoints
	passthrough: ['auth'],
	// Custom mock resolvers
	mocks: {
		User: (typeName, fieldName) => {
			if (fieldName === 'avatar') return 'https://example.com/avatar.png';
			return undefined; // fall through to default
		},
	},
});

const link = composeMiddlewares(mockMw, createHttpLink({ uri: '/graphql' }));
```

## Default Mock Values

| Field         | Mock Value                 |
| ------------- | -------------------------- |
| `id`          | `mock-{typeName}-1`        |
| `__typename`  | `typeName`                 |
| `name`        | `Mock {typeName}`          |
| `title`       | `Mock Title`               |
| `description` | `Mock description`         |
| `email`       | `mock@example.com`         |
| `createdAt`   | `new Date().toISOString()` |
| `updatedAt`   | `new Date().toISOString()` |

Custom resolvers can override any field. Return `undefined` to fall through to the default.

## API Reference

| Signature                         | Returns             | Description                                                              |
| --------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| `endpointMockMiddleware(config?)` | `GraphqlMiddleware` | Schema-aware mock middleware. Intercepts requests and returns stub data. |

### EndpointMockConfig

| Option        | Type                                | Default | Description                             |
| ------------- | ----------------------------------- | ------- | --------------------------------------- |
| `schema`      | `string`                            | —       | Schema SDL string or parsed types map   |
| `mocks`       | `Record<string, MockFieldResolver>` | —       | Custom mock resolvers per type          |
| `delay`       | `number`                            | `0`     | Simulated network latency (ms)          |
| `passthrough` | `string[]`                          | `[]`    | Endpoint URLs that should NOT be mocked |

### MockFieldResolver

`(typeName: string, fieldName: string) => unknown`
