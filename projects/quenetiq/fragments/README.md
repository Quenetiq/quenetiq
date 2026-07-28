# @quenetiq/fragments

Type‑safe GraphQL fragment definitions, composition, and data access.

## Install

```bash
npm install @quenetiq/fragments
```

## Quick Start

```typescript
import { fragment, spread, compose, useFragment } from '@quenetiq/fragments';
import type { DocumentNode } from 'graphql';

// Define a typed fragment
const TodoFragment = fragment<{ id: string; title: string }>`
  fragment TodoFields on Todo {
    id
    title
  }
`;

// Use in a query
const query = gql`
  query Todos {
    todos { ${spread(TodoFragment)} }
  }
  ${compose(TodoFragment)}
`;

// Type-safe data access
function TodoItem({ data }: { data: unknown }) {
  const todo = useFragment(TodoFragment, data);
  // todo is typed as { id: string; title: string } | null
}
```

## API

| Export | Description |
|--------|-------------|
| `fragment(strings, ...values)` | Template tag returning typed `FragmentDefinition` |
| `getFragment(def)` | Returns the raw `DocumentNode` |
| `spread(def)` | Returns `"...FragmentName"` for interpolation |
| `compose(...defs)` | Merges multiple fragment documents into one |
| `useFragment(def, data)` | Type‑safe data accessor (returns `TData \| null`) |
| `FragmentDefinition<TData, TVars>` | Typed fragment interface |

## Dependencies

`@angular/core`, `graphql`
