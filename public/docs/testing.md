---
title: Testing
slug: testing
group: Tools
order: 4
since: '0.0.1'
tags:
  - testing
  - mock
description: Mock GraphQL backend for tests
---

# @quenetiq/testing

The testing package provides utilities for writing unit and integration tests for Angular applications that use Quenetiq. It includes mock providers, a mock GraphQL link, and helpers for simulating query/mutation responses.

## provideQuenetiqMock

Replace the real GraphQL link with a mock link during testing using `provideQuenetiqMock`. This allows you to simulate server responses without making actual HTTP requests:

```typescript
import { provideQuenetiqMock } from '@quenetiq/testing';

TestBed.configureTestingModule({
	providers: [
		provideQuenetiqMock({
			Books: { data: { books: [{ id: '1', title: 'Dune' }] } },
		}),
	],
});
```

## MockGraphqlLink

For more control, use `MockGraphqlLink` directly. This is useful when you need to assert that specific queries were made or control the order of responses:

```typescript
import { MockGraphqlLink } from '@quenetiq/testing';

const mockLink = new MockGraphqlLink();
mockLink.setResponse('Books', {
	data: { books: [{ id: '1', title: 'Dune' }] },
});

TestBed.configureTestingModule({
	providers: [provideQuenetiqCore({ link: mockLink })],
});
```

## Behavior Verification

The mock link tracks all executed operations, enabling assertions about what was sent:

```typescript
const mockLink = new MockGraphqlLink();

// After test runs:
expect(mockLink.operations.length).toBe(1);
expect(mockLink.operations[0].operationName).toBe('Books');
expect(mockLink.operations[0].variables).toEqual({ limit: 10 });
```

## API Reference

### MockGraphqlService

Injectable mock GraphQL service for testing. Intercepts queries and mutations, returning configured responses.

| Name                                                        | Type   | Description                                                                                                     |
| ----------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `MockGraphqlService.when(request, result)`                  | method | Registers a mock response for a specific query and variables combination. Responses are consumed in FIFO order. |
| `MockGraphqlService.query(document, variables?)`            | method | Mocks a GraphQL query execution, returning the configured response or a default error.                          |
| `MockGraphqlService.mutate(document, variables?)`           | method | Mocks a GraphQL mutation execution.                                                                             |
| `MockGraphqlService.refetch(document, variables?)`          | method | Mocks a query refetch.                                                                                          |
| `MockGraphqlService.poll(document, intervalMs, variables?)` | method | Mocks a polling query execution.                                                                                |

### MockedResponse

Interface for a configured mock response with optional simulated delay.

| Name                     | Type     | Description                                                    |
| ------------------------ | -------- | -------------------------------------------------------------- |
| `MockedResponse.request` | property | The MockedRequest that this response matches against.          |
| `MockedResponse.result`  | property | The GraphQLResult data to return for this response.            |
| `MockedResponse.delay`   | property | Optional delay in milliseconds before the response is emitted. |

### MockedRequest

Interface describing a GraphQL operation request with query string and optional variables.

| Name                      | Type     | Description                         |
| ------------------------- | -------- | ----------------------------------- |
| `MockedRequest.query`     | property | The GraphQL query string.           |
| `MockedRequest.variables` | property | Optional variables for the request. |

### Functions

| Name                       | Type     | Description                                                                         |
| -------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `provideQuenetiqTesting()` | function | Angular provider function that registers MockGraphqlService for injection in tests. |

## Starters

:::stackblitz starter="testing"
