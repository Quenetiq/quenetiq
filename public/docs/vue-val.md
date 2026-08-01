---
title: 'useVal'
slug: vue-val
group: 'Frameworks'
order: 8
since: '0.0.1'
tags: [vue, composables, val, reactive]
description: 'Reactive value container with null-handling utilities.'
---

# useVal

Creates a reactive value container (`VueVal<T>`) — a Vue `Ref<T>` augmented with null-handling methods. Fully reactive.

```ts
import { useVal } from '@quenetiq/vue';

const count = useVal(0);
count.value; // reactive read
count.set(5); // triggers reactivity
```

## Null-handling

```ts
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

| Method              | Signature                              | Description                                           |
| ------------------- | -------------------------------------- | ----------------------------------------------------- |
| `value`             | `T`                                    | Current value (reactive read)                         |
| `set(v)`            | `(v: T) => void`                       | Sets value, triggers reactivity                       |
| `nullify()`         | `() => T`                              | Sets value to `null`, returns previous                |
| `isNull()`          | `() => boolean`                        | Returns `true` if value is `null` or `undefined`      |
| `isEmpty()`         | `() => boolean`                        | Returns `true` for `null`, `undefined`, `''`, or `[]` |
| `reset()`           | `() => void`                           | Resets to initial value                               |
| `tap(fn)`           | `(fn: (v: T) => void) => VueVal<T>`    | Transform in-place, returns `this`                    |
| `swap(v)`           | `(v: T) => T`                          | Sets value and returns previous                       |
| `orElse(fallback)`  | `(def: T) => T`                        | Returns value or fallback if null/undefined           |
| `match(some, none)` | `(some: (v) => R, none: () => R) => R` | Pattern match on null                                 |
