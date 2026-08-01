---
title: 'Auto Mock'
slug: auto-mock
group: 'Middleware'
order: 4
since: '0.0.1'
tags: [middleware, mock, testing]
description: 'Schema-aware auto mocking middleware'
---

# Auto Mock

Generates mock GraphQL responses for queries and mutations without a real server. Parses schema SDL for type-aware mock data.

```typescript
import { autoMockMiddleware } from '@quenetiq/middlewares';

const middleware = autoMockMiddleware({
	schema: `
    type Query { users: [User!]! }
    type User { id: ID!, name: String!, email: String! }
  `,
	mocks: {
		User: (fieldName, args) => {
			if (fieldName === 'email') return 'test@example.com';
			return undefined; // fall through to default
		},
	},
	delay: 100,
	passthrough: true,
});
```

## API Reference

| Option        | Type                           | Default | Description                              |
| ------------- | ------------------------------ | ------- | ---------------------------------------- |
| `schema`      | `string`                       | —       | GraphQL schema SDL                       |
| `mocks`       | `Record<string, MockResolver>` | `{}`    | Custom field resolvers                   |
| `delay`       | `number`                       | `0`     | Simulated latency (ms)                   |
| `passthrough` | `boolean`                      | `true`  | Fallback to real network on mock failure |
