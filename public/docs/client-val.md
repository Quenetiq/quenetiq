---
title: 'Val'
slug: client-val
group: 'Core'
order: 6
since: '0.0.1'
tags: [client, val, container, null-handling]
description: 'Generic value container with null handling'
---

# Val

`Val<T>` is a generic value container with built-in null handling methods.

```typescript
import { Val } from '@quenetiq/client';

const val = new Val('hello');

console.log(val.orElse('fallback')); // 'hello'

val.nullify();
console.log(val.orElse('fallback')); // 'fallback'

const result = val.match(
	(value) => `Has: ${value}`,
	() => 'Is null',
);
console.log(result); // 'Is null'

val.reset();
console.log(val.isNull()); // false
```

## API Reference

| Member                      | Type     | Description                                                          |
| --------------------------- | -------- | -------------------------------------------------------------------- |
| `Val<T>`                    | class    | Holds a value of type `T` with null-handling methods                 |
| `Val.value`                 | property | Get/set the contained value                                          |
| `Val.nullify()`             | method   | Sets value to `null`, returns the previous value                     |
| `Val.isNull()`              | method   | Returns `true` if value is `null` or `undefined`                     |
| `Val.isEmpty()`             | method   | Returns `true` for `null`, `undefined`, empty string, or empty array |
| `Val.reset()`               | method   | Resets to the initial value passed to the constructor                |
| `Val.peek()`                | method   | Returns value without triggering reactive tracking                   |
| `Val.tap(fn)`               | method   | Transforms value in-place via `fn`, returns `this` for chaining      |
| `Val.swap(v)`               | method   | Sets value to `v`, returns the previous value                        |
| `Val.orElse(fallback)`      | method   | Returns value if not null, otherwise returns `fallback`              |
| `Val.match(onSome, onNone)` | method   | Calls `onSome(value)` if non-null, `onNone()` if null. Returns `R`   |
| `Val.toJSON()`              | method   | Returns contained value for JSON serialization                       |
