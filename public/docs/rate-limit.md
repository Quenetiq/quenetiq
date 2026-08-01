---
title: 'Rate Limit'
slug: rate-limit
group: 'Middleware'
order: 5
since: '0.0.1'
tags: [middleware, rate-limit]
description: 'Client-side rate limiting'
---

# Rate Limit

Client-side rate limiting for GraphQL requests. Restricts requests within a sliding time window per key. Returns `RATE_LIMITED` error when exceeded.

```typescript
import { rateLimitMiddleware } from '@quenetiq/middlewares';

const middleware = rateLimitMiddleware({
	maxRequests: 10,
	windowMs: 1000,
	key: (request) => request.query, // per-query rate limit
});
```

## API Reference

| Option        | Type                  | Default     | Description              |
| ------------- | --------------------- | ----------- | ------------------------ |
| `maxRequests` | `number`              | `10`        | Max requests per window  |
| `windowMs`    | `number`              | `1000`      | Time window (ms)         |
| `key`         | `(request) => string` | `'default'` | Rate limit key extractor |
