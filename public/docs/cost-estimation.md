---
title: 'Cost Estimation'
slug: cost-estimation
group: 'Middleware'
order: 7
since: '0.0.1'
tags: [middleware, cost, query-complexity]
description: 'Query cost estimation and blocking'
---

# Cost Estimation

Analyzes query complexity by counting fields, measuring nesting depth, and computing weighted cost. Can block or warn on expensive queries.

```typescript
import { costEstimationMiddleware, estimateQueryCost } from '@quenetiq/middlewares';

const middleware = costEstimationMiddleware({
	maxCost: 1000,
	warnAt: 500,
	mode: 'warn',
	depthFactor: 0.5,
});

// Standalone cost estimation
const cost = estimateQueryCost(`
  query { users { posts { comments { author { name } } } } }
`);
console.log(cost);
// { fields: 4, depth: 4, cost: 5, details: [...] }
```

## Modes

| Mode      | Behavior                                                       |
| --------- | -------------------------------------------------------------- |
| `'block'` | Reject requests exceeding `maxCost` with `COST_EXCEEDED` error |
| `'warn'`  | Log warning to console                                         |
| `'pass'`  | Allow all requests (passive observation)                       |

## API Reference

| Option        | Type                          | Default  | Description              |
| ------------- | ----------------------------- | -------- | ------------------------ |
| `maxCost`     | `number`                      | `1000`   | Blocking threshold       |
| `warnAt`      | `number`                      | `500`    | Warning threshold        |
| `depthFactor` | `number`                      | `0.5`    | Nesting depth multiplier |
| `mode`        | `'block' \| 'warn' \| 'pass'` | `'warn'` | Action on exceed         |

### QueryCost

| Field       | Type       | Description           |
| ----------- | ---------- | --------------------- |
| `fields`    | `number`   | Raw field count       |
| `depth`     | `number`   | Maximum nesting depth |
| `cost`      | `number`   | Weighted cost         |
| `fragments` | `number`   | Fragment spread count |
| `aliases`   | `number`   | Aliased field count   |
| `details`   | `string[]` | Per-field breakdown   |
