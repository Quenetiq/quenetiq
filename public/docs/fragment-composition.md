---
title: 'Fragment Composition'
slug: fragment-composition
group: 'Features'
order: 1
since: '0.0.1'
tags: [fragments, composition]
description: 'Fragment composition and data masking'
---

# Fragment Composition

Tools for composing GraphQL fragments and managing fragment references.

```typescript
import { fragment, compose, spread, getFragment, useFragment } from '@quenetiq/fragments';
```

## fragment

Define a typed GraphQL fragment:

```typescript
const UserFields = fragment<User>`fragment UserFields on User {
  id name email avatar
}`;
```

## compose

Merge multiple fragments into one document:

```typescript
const FullQuery = compose(UserFields, PostFields, CommentFields);
```

## spread

Get the fragment spread string:

```typescript
const spreadStr = spread(UserFields);
// '...UserFields'
```

## getFragment

Get the underlying `DocumentNode`:

```typescript
const doc = getFragment(UserFields);
```

## useFragment

Fragment masking/unmasking at runtime:

```typescript
const data = useFragment(UserFields, rawData);
// Unmasks fragment reference if present, returns data as-is otherwise
```

## API Reference

| Function                      | Returns              | Description                              |
| ----------------------------- | -------------------- | ---------------------------------------- |
| `fragment<TData, TVars>`      | `FragmentDefinition` | Tagged template for fragment definitions |
| `compose(...fragments)`       | `DocumentNode`       | Merge fragments into one document        |
| `spread(fragment)`            | `string`             | Get fragment spread (`...Name`)          |
| `getFragment(fragment)`       | `DocumentNode`       | Get underlying AST                       |
| `useFragment(fragment, data)` | `TData \| null`      | Fragment masking/unmasking               |

### FragmentDefinition<TData, TVars>

| Field      | Type           | Description         |
| ---------- | -------------- | ------------------- |
| `document` | `DocumentNode` | Parsed fragment AST |
| `name`     | `string`       | Fragment name       |
