---
title: 'Null Detection'
slug: null-detection
group: 'Core'
order: 5
since: '1.0.5'
tags: [core, null, detection, overlay]
description: 'Null detection service and overlay'
---

# Null Detection

`NullCheckerService` recursively walks GraphQL response data and reports null values to `NullDetectionService` for visual overlay feedback.

```typescript
import { NullCheckerService, provideNullChecker } from '@quenetiq/core';
```

## Setup

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
	providers: [provideNullChecker()],
};
```

For visual feedback, add `<app-null-overlay />` to your root component template.

## Usage

```typescript
class MyService {
	private nullChecker = inject(NullCheckerService);

	onData(data: unknown) {
		this.nullChecker.checkResponse(data, 'MyQuery');
		// Walks the entire response tree and reports null fields
	}

	onError(opName: string) {
		this.nullChecker.reportError(opName, 'Operation failed');
	}
}
```

## How It Works

The `checkResponse` method recursively walks the response object:

- **`null` values** — reported via `detector.reportNull(operationName, path)`
- **Arrays** — each element is walked with path `field[index]`
- **Nested objects** — each key is walked with path `parent.child`

## API Reference

| Member                                                   | Type     | Description                                                           |
| -------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `NullCheckerService`                                     | class    | Injectable service for walking response data and reporting nulls      |
| `NullCheckerService.checkResponse(data, operationName?)` | method   | Walk response data and report null fields                             |
| `NullCheckerService.reportError(operationName, message)` | method   | Manually report a null-check error                                    |
| `provideNullChecker()`                                   | function | Provider that registers `NullDetectionService` + `NullCheckerService` |
