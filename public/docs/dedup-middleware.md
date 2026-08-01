---
title: 'Dedup Middleware'
slug: dedup-middleware
group: 'Middleware'
order: 6
since: '0.0.1'
tags: [middleware, dedup]
description: 'Request deduplication middleware'
---

# Dedup Middleware

Deduplicates in-flight GraphQL requests. When the same operation (type + query + variables) is already being fetched, subsequent calls share the same observable instead of creating new requests.

```typescript
import { dedupMiddleware } from '@quenetiq/middlewares';

const middleware = dedupMiddleware();
```

No configuration needed. The middleware uses `type`, `query`, and `variables` from the request context to identify duplicate operations. The shared observable is cleaned up when all subscribers complete.
