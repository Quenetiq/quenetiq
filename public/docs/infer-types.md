---
title: 'Infer Types'
slug: infer-types
group: 'Core'
order: 11
since: '1.0.0'
tags: [core, types, inference, typescript]
description: 'Type inference utilities for GraphQL documents'
---

# Infer Types

TypeScript type inference utilities for extracting types from GraphQL documents and endpoint configs.

```typescript
import type { InferResponse, InferVariables, InferEndpointNames } from '@quenetiq/core';
```

## Usage

```typescript
import type { endpoints } from './endpoints.yaml';

// Extract endpoint names as a union type
type Endpoints = InferEndpointNames<typeof endpoints>;
// 'api' | 'payments' | 'auth'

// Extract response and variable types from documents
type UsersResponse = InferResponse<typeof GET_USERS>;
type UsersVars = InferVariables<typeof GET_USERS>;

// Extract specific endpoint info
type PaymentsUrl = InferEndpointUrl<typeof endpoints, 'payments'>;
type PaymentsHeaders = InferEndpointHeaders<typeof endpoints, 'payments'>;
```

## Type Reference

| Type                               | Description                                                               |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `InferResultData<T>`               | Extracts the data shape from a `GraphQLResult<T>`                         |
| `InferResultError<T>`              | Extracts the error type from a `GraphQLResult<T>`                         |
| `InferSuccessData<T>`              | Extracts data from the success variant                                    |
| `InferResponse<T>`                 | Infers the response type from a `TypedDocumentNode` or `TypedQueryString` |
| `InferVariables<T>`                | Infers variables type from a document                                     |
| `InferDocument<T>`                 | Extracts the document type itself                                         |
| `InferQueryData<T, TVars>`         | Infers query result data for a document                                   |
| `InferQuerySignals<T, TVars>`      | Infers the signal-based query return type                                 |
| `InferEndpointNames<Yaml>`         | Extracts endpoint name keys from an `EndpointsYaml` type                  |
| `InferEndpointRoute<Yaml, Name>`   | Infers the route config for a specific endpoint name                      |
| `InferEndpointUrl<Yaml, Name>`     | Infers the URL string type for an endpoint                                |
| `InferEndpointHeaders<Yaml, Name>` | Infers the headers type for an endpoint                                   |
| `InferMiddleware<Mw>`              | Infers the middleware type from a middleware array                        |
| `InferMiddlewareRequest<Mw>`       | Infers the request type accepted by middleware                            |
| `InferObservableData<T>`           | Extracts the data type from an Observable                                 |
