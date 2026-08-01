---
title: 'createClient'
slug: client-create
group: 'Core'
order: 1
since: '0.0.1'
tags: [client, create, factory]
description: 'Create and configure QuenetiqClient'
---

# createClient

The `createClient()` factory function creates a configured `QuenetiqClient` instance.

```typescript
import { createClient, gql, isSuccess } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const result = await client.query<{ todos: Todo[] }>(gql`
	query Todos {
		todos {
			id
			title
		}
	}
`);
```

## Options

| Option        | Type                     | Default    | Description               |
| ------------- | ------------------------ | ---------- | ------------------------- |
| `endpoint`    | `string`                 | `/graphql` | GraphQL endpoint URL      |
| `headers`     | `Record<string, string>` | `{}`       | Default request headers   |
| `middleware`  | `GraphqlMiddleware[]`    | `[]`       | Middleware pipeline       |
| `retryCount`  | `number`                 | `0`        | Retry attempts on failure |
| `errorPolicy` | `string`                 | `none`     | Error handling policy     |

## With Cache

```typescript
import { createClient } from '@quenetiq/client';
import { createCache } from '@quenetiq/cache';

const cache = createCache();
const client = createClient({ endpoint: '/graphql' }, cache);
```
