---
title: 'Focus Refetch'
slug: focus-refetch
group: 'Middleware'
order: 8
since: '0.0.1'
tags: [middleware, refetch, focus]
description: 'Refetch on window focus'
---

# Focus Refetch

Refetches query results when the user returns to the page (via `window focus` or `visibilitychange`). Only operates on successful queries and respects a minimum staleness threshold.

```typescript
import { focusRefetchMiddleware } from '@quenetiq/middlewares';

const middleware = focusRefetchMiddleware({
	visibilityOnly: false, // if true, only refetch on visibilitychange
	minStaleSeconds: 30, // minimum age before refetching
});
```

## API Reference

| Option            | Type      | Default | Description                        |
| ----------------- | --------- | ------- | ---------------------------------- |
| `visibilityOnly`  | `boolean` | `false` | Only refetch on `visibilitychange` |
| `minStaleSeconds` | `number`  | `30`    | Minimum age before refetch (s)     |
