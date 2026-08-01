---
title: 'Auth Refresh'
slug: auth-refresh
group: 'Middleware'
order: 1
since: '0.0.1'
tags: [middleware, auth, refresh]
description: 'Automatic auth token refresh middleware'
---

# Auth Refresh

Automatically refreshes authentication tokens when a GraphQL request receives an auth error (default HTTP 401). Queues concurrent requests during refresh and replays them with the new token.

```typescript
import { authRefreshMiddleware } from '@quenetiq/middlewares';

const middleware = authRefreshMiddleware({
	refreshToken: () => fetch('/auth/refresh').then((r) => r.text()),
	headerName: 'Authorization',
	triggerStatuses: [401],
	maxAttempts: 1,
});
```

## API Reference

| Option            | Type                                                    | Default         | Description                      |
| ----------------- | ------------------------------------------------------- | --------------- | -------------------------------- |
| `refreshToken`    | `() => string \| Promise<string> \| Observable<string>` | —               | Token refresh function           |
| `headerName`      | `string`                                                | `Authorization` | Auth header name                 |
| `triggerStatuses` | `number[]`                                              | `[401]`         | Status codes triggering refresh  |
| `maxAttempts`     | `number`                                                | `1`             | Max refresh attempts per request |
