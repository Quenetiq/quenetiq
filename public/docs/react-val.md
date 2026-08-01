---
title: 'useVal'
slug: react-val
group: 'Frameworks'
order: 8
since: '0.0.1'
tags: [react, hooks, val, reactive]
description: 'Mutable reactive value container with null-handling utilities.'
---

# useVal

Creates a mutable reactive value container (`ReactVal<T>`) with null-handling utilities. Re-renders on every mutation.

```tsx
import { useVal } from '@quenetiq/react';

function Counter() {
	const count = useVal(0);
	return <button onClick={() => count.set(count.value + 1)}>{count.value}</button>;
}
```

## Null-handling

```tsx
const name = useVal<string | null>(null);

name.orElse('Guest'); // 'Guest'
name.match(
	(v) => `Hello, ${v}`,
	() => 'Hello, Guest',
);
name.nullify(); // sets value to null
name.isNull(); // true
```

## API

| Method              | Signature                              | Description                          |
| ------------------- | -------------------------------------- | ------------------------------------ |
| `value`             | `T`                                    | Current value (reactive read)        |
| `set(v)`            | `(v: T) => void`                       | Sets value, triggers re-render       |
| `update(fn)`        | `(fn: (prev: T) => T) => void`         | Updates via fn(prev) => next         |
| `reset()`           | `() => void`                           | Resets to initial value              |
| `nullify()`         | `() => void`                           | Sets value to `null`                 |
| `isNull()`          | `() => boolean`                        | Checks if value is `null`            |
| `isEmpty()`         | `() => boolean`                        | Checks if value is `null` or `''`    |
| `orElse(def)`       | `(def: T) => T`                        | Returns value or default if null     |
| `match(some, none)` | `(some: (v) => R, none: () => R) => R` | Pattern match on null                |
| `peek()`            | `() => T`                              | Read value without reactive tracking |
| `tap(fn)`           | `(fn: (v: T) => void) => ReactVal<T>`  | Side-effect, returns self            |
| `swap(v)`           | `(v: T) => T`                          | Sets value and returns previous      |
