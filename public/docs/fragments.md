---
title: Fragments
slug: fragments
group: Features
order: 5
since: 0.0.1
tags:
  - fragments
  - composable
description: Fragment composition and data masking
---

# @quenetiq/fragments

The fragments package provides utility functions for defining reusable GraphQL fragment documents and composing them into full queries. This promotes colocation of data requirements with the components that use them.

## fragment()

Define a reusable fragment using the `fragment()` helper. This creates a typed document reference that can be spread into queries:

```ts
import { fragment } from '@quenetiq/fragments';

const BOOK_FIELDS = fragment('Book', gql`fragment BookFields on Book {
  id
  title
  author { name }
  price
}`);
```

## spread()

Use `spread()` to interpolate a fragment into a query document. The spread is resolved at runtime:

```ts
import { spread } from '@quenetiq/fragments';

const BOOKS_QUERY = gql`query Books {
  books { ...BookFields }
}${spread(BOOK_FIELDS)}`;
```

## compose()

When fragments reference other fragments, use `compose()` to assemble them into a single document:

```ts
import { compose } from '@quenetiq/fragments';

const AUTHOR_FIELDS = fragment('Author', gql`fragment AuthorFields on Author {
  id name books { ...BookFields }
}`);

const fullDocument = compose([BOOK_FIELDS, AUTHOR_FIELDS]);
```

## useFragment()

The `useFragment()` helper extracts a subset of cached data that matches a fragment definition. This ensures a component only re-renders when the fields it cares about change:

```ts
import { useFragment } from '@quenetiq/fragments';

@Component({
  selector: 'app-book-card',
  standalone: true,
  template: `<div>{{ book()?.title }} by {{ book()?.author?.name }}</div>`,
})
export class BookCardComponent {
  book = useFragment(BOOK_FIELDS, this.graphql.query(BOOKS_QUERY));
}
```

## Starters

### Vanilla JS

```ts
import { createClient, createCache, gql } from '@quenetiq/client';
import { fragment, spread, compose } from '@quenetiq/fragments';

// Define a fragment
const TODO_FIELDS = fragment(gql`
  fragment TodoFields on Todo {
    id title done
  }
`);

// Use it in a query
const GET_TODOS = compose(gql`query { todos { ...TodoFields } }`,
  spread(TODO_FIELDS),
);

const client = createClient({ endpoint: '/graphql' });
const cache = createCache();

async function load() {
  const result = await client.query(GET_TODOS);
  if (result.status === 'success') {
    cache.write(result.data.todos[0]);
  }
}
```

### Angular

```ts
import { provideQuenetiq, GraphqlService } from '@quenetiq/core';
import { fragment, spread, compose } from '@quenetiq/fragments';
import { createHttpLink } from '@quenetiq/core/link';

export const appConfig: ApplicationConfig = {
  providers: [provideQuenetiq({ link: createHttpLink({ uri: '/graphql' }) })],
};

const TODO_FIELDS = fragment(gql`
  fragment TodoFields on Todo { id title done }
`);

@Component({ ... })
export class TodosComponent {
  private graphql = inject(GraphqlService);

  todos$ = this.graphql.query(compose(
    gql`query { todos { ...TodoFields } }`,
    spread(TODO_FIELDS),
  ));
}
```

### React

```tsx
import { QuenetiqProvider, useFragment, useQuery, gql } from '@quenetiq/react';
import { createClient } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const TODO_FIELDS = gql`
  fragment TodoFields on Todo { id title done }
`;

function TodoItem({ id }: { id: string }) {
  const { data, complete } = useFragment(TODO_FIELDS, {
    __typename: 'Todo', id,
  });
  if (!complete) return <p>Loading...</p>;
  return <p>{data.title} — {data.done ? 'done' : 'pending'}</p>;
}

function App() {
  return <QuenetiqProvider client={client}><TodoItem id="1" /></QuenetiqProvider>;
}
```

### Vue

```vue
<script setup lang="ts">
import { createQuenetiqPlugin, useFragment, gql } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';
import { createApp } from 'vue';

const client = createClient({ endpoint: '/graphql' });
const app = createApp(App);
app.use(createQuenetiqPlugin(client));

const TODO_FIELDS = gql`
  fragment TodoFields on Todo { id title done }
`;

const { data, complete } = useFragment(TODO_FIELDS, {
  __typename: 'Todo', id: '1',
});
</script>

<template>
  <p v-if="!complete">Loading...</p>
  <p v-else>{{ data.title }} — {{ data.done ? 'done' : 'pending' }}</p>
</template>
```

## API Reference

| Name | Description | Type |
|------|-------------|------|
| `fragment(strings, ...values)` | Tagged template literal that defines a typed fragment reference from a GraphQL fragment string. | function |
| `getFragment(def)` | Extracts the underlying DocumentNode from a FragmentDefinition. | function |
| `spread(def)` | Returns the fragment spread string (...FragmentName) for use in a GraphQL document. | function |
| `compose(...defs)` | Composes multiple FragmentDefinitions into a single DocumentNode by merging their definitions. | function |
| `useFragment(fragment, data)` | Extracts typed fragment data from a parent query result. Returns null when data is nullish. | function |
| `FragmentDefinition` | Interface defining a typed fragment reference with its parsed DocumentNode and fragment name. | interface |
| `FragmentDefinition.document` | The parsed GraphQL DocumentNode for the fragment. | property |
| `FragmentDefinition.name` | The name of the fragment extracted from the definition. | property |

## Try it live

:::stackblitz starter="fragments"
