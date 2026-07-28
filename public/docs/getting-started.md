---
title: "Getting Started"
slug: getting-started
group: Getting Started
order: 2
since: "0.0.1"
tags: [install, setup, quickstart]
description: "Quick start guide for Quenetiq"
---

# Getting Started

## Install

Install the framework-agnostic client, plus bindings for your framework:

```sh
npm install @quenetiq/client
```

For framework-specific bindings, install the corresponding package:

- React: `npm install @quenetiq/react @quenetiq/cache`
- Vue: `npm install @quenetiq/vue`
- Angular: `npm install @quenetiq/core @quenetiq/cache @quenetiq/subscriptions`

## Configure

Create a client with `createClient` and pass it to your framework's provider:

```ts
import { createClient } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

// Use with any framework:
// - React: <QuenetiqProvider client={client}>…
// - Vue:   app.use(createQuenetiqPlugin(client))
// - Angular: import { provideGraphql } from '@quenetiq/core'
```

See [@quenetiq/react](/docs/react), [@quenetiq/vue](/docs/vue), or [@quenetiq/core](/docs/core) (Angular) for framework-specific setup.

## Your First Query

> **TIP:** Use `createClient` + `gql` tag for type-safe queries:

```ts
import { createClient, gql, isSuccess } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const BOOKS_QUERY = gql`query Books { books { id title } }`;

const result = await client.query<{ books: Book[] }>(BOOKS_QUERY);
if (isSuccess(result)) {
  console.log(result.data.books);
}
```

The `query()` method returns a Promise. Use `isSuccess` / `isError` type guards to handle results.

## Starters

Kickstart a new project with one of our starters:

- **Angular 22+** — [Open in StackBlitz](https://stackblitz.com/github/Quenetiq/starter-angular) · [Open in Codespaces](https://codespaces.new/Quenetiq/quenetiq?devcontainer_path=.devcontainer%2Fangular%2Fdevcontainer.json) · `git clone` + `cd starters/angular && npm start` — standalone app with `@quenetiq/client`, mock backend, and `provideQuenetiq` + `QuenetiqQuery` directive.
- **React 18+** — [Open in StackBlitz](https://stackblitz.com/github/Quenetiq/starter-react) · `git clone` + `cd starters/react && npm start` — standalone app with `@quenetiq/client`, `@quenetiq/react`, mock backend, and `useQuery` hook.
- **Vue 3+** — [Open in StackBlitz](https://stackblitz.com/github/Quenetiq/starter-vue) · `git clone` + `cd starters/vue && npm start` — standalone app with `@quenetiq/client`, `@quenetiq/vue`, mock backend, and `useQuery` composable.

## Next Steps

- Add [@quenetiq/client](/docs/client) for the core API
- Add [caching](/docs/cache) for normalized data
- Enable [subscriptions](/docs/subscriptions) for real-time updates
- Learn [React hooks](/docs/react) or [Vue composables](/docs/vue)
