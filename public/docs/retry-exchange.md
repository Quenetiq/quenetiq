---
title: 'Retry Exchange'
slug: retry-exchange
group: 'Middleware'
order: 2
since: '0.0.1'
tags: [middleware, retry, backoff]
description: 'Retry with exponential backoff'
---

# Retry Exchange

Retries failed GraphQL requests with exponential backoff and optional jitter.

```typescript
import { retryExchange } from '@quenetiq/middlewares';

const middleware = retryExchange({
	maxRetries: 3,
	initialDelay: 1000,
	maxDelay: 30000,
	jitter: true,
	shouldRetry: (result, attempt) => {
		// Only retry network errors, not GraphQL errors
		return result.status === 'error' && !!result.networkError;
	},
});
```

## Backoff Formula

```
delay = min(initialDelay * exponent^attempt, maxDelay)
jitter = delay * (0.5 + Math.random() * 0.5)   // when jitter: true
```

## API Reference

| Option         | Type                           | Default | Description            |
| -------------- | ------------------------------ | ------- | ---------------------- |
| `maxRetries`   | `number`                       | `3`     | Maximum retry attempts |
| `initialDelay` | `number`                       | `1000`  | Initial delay (ms)     |
| `maxDelay`     | `number`                       | `30000` | Maximum delay (ms)     |
| `exponent`     | `number`                       | `2`     | Backoff exponent       |
| `jitter`       | `boolean`                      | `true`  | Random jitter          |
| `shouldRetry`  | `(result, attempt) => boolean` | —       | Retry predicate        |
