---
title: Persisted Queries
slug: persisted-queries
group: Features
order: 6
since: 0.0.1
tags:
  - apq
  - persisted
description: Automatic Persisted Queries
---

# @quenetiq/persisted-queries

The persisted-queries package implements Automatic Persisted Queries (APQ), allowing the client to send a hash of the query string instead of the full query body. This reduces bandwidth for large queries and improves performance on slow networks.

## APQ Middleware

Add the `apqMiddleware` to your middleware chain to enable automatic persisted queries. The middleware will first attempt to send the query hash; if the server responds with a `PersistedQueryNotFound` error, it automatically retries with the full query string:

```ts
import { apqMiddleware } from '@quenetiq/persisted-queries';
import { composeMiddlewares, createHttpLink } from '@quenetiq/core';

const link = composeMiddlewares(
  apqMiddleware(),
  createHttpLink({ uri: '/graphql' }),
);
```

## Wire Format

On the wire, the first request looks like this. The server returns `PersistedQueryNotFound` if it doesn't have the query cached:

```json
// What gets sent on the wire:
{
  "operationName": "Books",
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "9b6c6b8f0e9a1c3d7f5e2b4a8d0c6e1f3a5b7c9d0e2f4a6b8c0d2e4f6a8b0c"
    }
  }
}
```

## Starters

### Vanilla JS

```ts
import { createClient, gql } from '@quenetiq/client';
import { apqMiddleware } from '@quenetiq/persisted-queries';

const client = createClient({
  endpoint: '/graphql',
  middlewares: [apqMiddleware()],
});

async function run() {
  const result = await client.query(gql`{ todos { id title } }`);
  console.log(result);
}
```

### Angular

```ts
import { provideQuenetiq } from '@quenetiq/core';
import { apqMiddleware } from '@quenetiq/persisted-queries';
import { createHttpLink } from '@quenetiq/core/link';

export const appConfig: ApplicationConfig = {
  providers: [
    provideQuenetiq({
      link: createHttpLink({ uri: '/graphql' }),
      middlewares: [apqMiddleware()],
    }),
  ],
};
```

### React

```tsx
import { QuenetiqProvider, useQuery, gql } from '@quenetiq/react';
import { createClient } from '@quenetiq/client';
import { apqMiddleware } from '@quenetiq/persisted-queries';

const client = createClient({
  endpoint: '/graphql',
  middlewares: [apqMiddleware()],
});

function Todos() {
  const { data } = useQuery(gql`{ todos { id title } }`);
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

function App() {
  return <QuenetiqProvider client={client}><Todos /></QuenetiqProvider>;
}
```

### Vue

```vue
<script setup lang="ts">
import { createQuenetiqPlugin, useQuery, gql } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';
import { apqMiddleware } from '@quenetiq/persisted-queries';

const client = createClient({
  endpoint: '/graphql',
  middlewares: [apqMiddleware()],
});
const app = createApp(App);
app.use(createQuenetiqPlugin(client));

const { data } = useQuery(gql`{ todos { id title } }`);
</script>

<template>
  <pre>{{ data }}</pre>
</template>
```

## API Reference

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `apqMiddleware(config?)` | Automatic Persisted Query middleware. First sends only the SHA-256 hash, retries with full query on PersistedQueryNotFound. Optionally uses GET for hashed queries. | function | |
| `PersistedQueryService` | Injectable Angular service for executing queries through the persisted query middleware chain. | class | |
| `PersistedQueryService.execute(document, variables?)` | Executes a GraphQL query through the persisted query pipeline. | method | `document: DocumentNode, variables?: TVars` |

## Try it live

:::stackblitz starter="persisted-queries"
