---
title: 'Multi-Endpoint'
slug: endpoints
group: 'Core'
order: 5
since: '1.0.0'
tags: [endpoints, multi-endpoint, yaml, fallback]
description: 'Multi-endpoint GraphQL configuration with YAML, fallback routing, health checks, and groups'
---

# Multi-Endpoint

Quenetiq supports connecting to multiple GraphQL endpoints simultaneously. Define your endpoints in a YAML file, reference them by name in queries and mutations, and let the library handle routing, fallback, and health checks.

## Configuration

Create an `endpoints.yml` file (or define the YAML string inline):

```yaml
# endpoints.yml
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
    headers:
      Authorization: 'Bearer ${TOKEN}'
    errorPolicy: none
    retryCount: 3
    retryDelay: 1000
    fallbackTo: standby
    healthCheck: /health

  users:
    url: http://localhost:4001/graphql
    errorPolicy: all

  payments:
    url: http://localhost:4002/graphql
    errorPolicy: none
    retryCount: 0
    retryDelay: 0

  standby:
    url: http://localhost:4003/graphql
    errorPolicy: all

groups:
  core:
    - main
    - users
  financial:
    - payments
```

### Per-endpoint options

| Option           | Type                                       | Default | Description                                                               |
| ---------------- | ------------------------------------------ | ------- | ------------------------------------------------------------------------- |
| `url`            | `string`                                   | —       | **Required.** GraphQL endpoint URL.                                       |
| `headers`        | `Record<string, string \| (() => string)>` | —       | Static or dynamic headers. Supports `${ENV_VAR}` substitution.            |
| `errorPolicy`    | `'none' \| 'all' \| 'ignore'`              | —       | Per-endpoint error policy override.                                       |
| `retryCount`     | `number`                                   | —       | Per-endpoint retry count override.                                        |
| `retryDelay`     | `number` (ms)                              | —       | Per-endpoint retry delay override.                                        |
| `fallbackTo`     | `string`                                   | —       | Fallback endpoint name when this endpoint fails (5xx/timeout).            |
| `healthCheck`    | `string`                                   | —       | Health check path (e.g. `/health`). A GET request is sent on startup.     |
| `transformError` | `string`                                   | —       | Named error transform function (registered via `registerTransformError`). |
| `middleware`     | `string[]`                                 | —       | Per-endpoint middleware pipeline (referenced by name).                    |
| `mock`           | `boolean`                                  | —       | Skip network, return schema-typed stubs.                                  |

## Setup

Provide the multi-endpoint configuration in your `app.config.ts`:

```typescript
import { provideQuenetiq } from '@quenetiq/core';
import endpointsYaml from './endpoints.yml?raw';

export const appConfig: ApplicationConfig = {
	providers: [
		provideQuenetiq({
			multiEndpoint: true,
			endpoints: endpointsYaml,
		}),
		// Or use the standalone provider:
		// provideMultiEndpoint(endpointsYaml),
	],
};
```

The `multiEndpoint: true` flag enables endpoint resolution throughout the library — standalone `query()`, `mutate()`, `injectQuery()`, and `GraphqlEndpoint` will all automatically resolve endpoint names.

## Usage

### With standalone functions

Pass the endpoint name to any query or mutation function:

```typescript
import { query, mutate } from '@quenetiq/core';

// Query the 'users' endpoint
const result = query(
	gql`
		query ListUsers {
			users {
				id
				name
			}
		}
	`,
	'users',
);

// Mutate the 'payments' endpoint
const mutation = mutate(
	gql`
		mutation Charge($amount: Float!) {
			charge(amount: $amount) {
				status
			}
		}
	`,
	'payments',
);
```

### With GraphqlEndpoint

Inject a pre-configured endpoint:

```typescript
import { injectEndpoint } from '@quenetiq/core';

const users = injectEndpoint('users');
const result = users.query(gql`
	query ListUsers {
		users {
			id
			name
		}
	}
`);
```

### With injectQuery / injectMutation

```typescript
import { injectQuery, injectMutation } from '@quenetiq/core';

const users = injectQuery(() => ({
	document: gql`
		query ListUsers {
			users {
				id
				name
			}
		}
	`,
	endpoint: 'users',
}));

const charge = injectMutation(() => ({
	document: gql`
		mutation Charge($amount: Float!) {
			charge(amount: $amount) {
				status
			}
		}
	`,
	endpoint: 'payments',
}));
```

## Fallback Routing

When an endpoint is configured with `fallbackTo`, Quenetiq automatically routes requests to the fallback endpoint if the primary fails:

```yaml
endpoints:
  main:
    url: http://localhost:4000/graphql
    fallbackTo: standby

  standby:
    url: http://localhost:4003/graphql
```

Mark an endpoint as failed programmatically:

```typescript
const endpoints = inject(EndpointsService);
endpoints.markFailed('main');

// Subsequent requests to 'main' will route to 'standby'
endpoints.markHealthy('main'); // restore
```

## Health Checks

Endpoints with a `healthCheck` path are automatically verified on startup:

```yaml
endpoints:
  main:
    url: http://localhost:4000/graphql
    healthCheck: /health
```

Run health checks manually:

```typescript
const endpoints = inject(EndpointsService);
const results = await endpoints.runHealthChecks();

for (const result of results) {
	console.log(`${result.name}: ${result.healthy ? 'OK' : 'FAIL'}`);
	// { name: 'main', url: '...', healthy: true, statusCode: 200, durationMs: 42 }
}
```

## Groups

Group related endpoints for bulk operations:

```yaml
groups:
  core:
    - main
    - users
  financial:
    - payments
```

Access groups at runtime:

```typescript
const endpoints = inject(EndpointsService);

endpoints.getGroupRoutes('core'); // ['main', 'users']
endpoints.groupNames; // ['core', 'financial']
endpoints.isInGroup('main', 'core'); // true
```

## Lifecycle Hooks

Register hooks that fire on endpoint events:

```typescript
import { provideMultiEndpointWithLifecycle } from '@quenetiq/core';

provideMultiEndpointWithLifecycle(yaml, {
	beforeEndpoint(name, route) {
		console.log(`Starting request to ${name}`);
	},
	afterEndpoint(name, route, durationMs) {
		console.log(`Request to ${name} took ${durationMs}ms`);
	},
	onFallback(from, to) {
		console.warn(`Falling back from ${from} to ${to}`);
	},
	onHealthCheck(name, route, healthy) {
		console.log(`${name} health: ${healthy}`);
	},
});
```

## Environment Variable Resolution

Header values can reference environment variables using `${VAR_NAME}` syntax. Quenetiq resolves them from `process.env` (Node) or `import.meta.env` (browser/Vite):

```yaml
endpoints:
  main:
    headers:
      Authorization: 'Bearer ${API_TOKEN}'
      X-API-Key: '${API_KEY}'
```

Values that contain `${...}` patterns are wrapped in lazy functions and resolved at request time, not at config parse time.

## Error Transforms

Register named error transform functions for per-endpoint error handling:

```typescript
import { registerTransformError } from '@quenetiq/core';

registerTransformError('log-and-return', (message, statusCode) => {
	console.error(`[${statusCode}] ${message}`);
	return `Service error: ${message}`;
});
```

Reference them in YAML:

```yaml
endpoints:
  main:
    transformError: log-and-return
```

## API Reference

### EndpointsService

| Member                            | Description                                                         |
| --------------------------------- | ------------------------------------------------------------------- |
| `defaultEndpoint`                 | Returns the default endpoint name from YAML, or `null`.             |
| `routeNames`                      | Returns all configured endpoint names.                              |
| `getRoute(name)`                  | Returns the `EndpointRoute` for a given name.                       |
| `hasRoute(name)`                  | Checks if an endpoint name exists.                                  |
| `getGroupRoutes(groupName)`       | Returns all route names in a named group.                           |
| `groupNames`                      | Returns all group names.                                            |
| `isInGroup(routeName, groupName)` | Checks if a route belongs to a group.                               |
| `resolveEndpointUrl(name)`        | Returns the endpoint URL (respects fallback).                       |
| `resolveEndpoint(name)`           | Returns a `GraphqlEndpoint` instance with resolved URL and headers. |
| `markFailed(name)`                | Marks an endpoint as failed (triggers fallback).                    |
| `markHealthy(name)`               | Restores an endpoint to healthy.                                    |
| `isFailed(name)`                  | Checks if an endpoint is currently marked as failed.                |
| `runHealthChecks()`               | Runs health checks for all routes with `healthCheck` configured.    |

### Providers

| Function                                        | Description                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `provideMultiEndpoint(yaml)`                    | Parse YAML, validate, and provide endpoint providers.                                  |
| `provideMultiEndpointWithLifecycle(yaml, hook)` | Same as above with lifecycle hooks.                                                    |
| `provideSingleEndpoint()`                       | Marks the app as single-endpoint mode (disables multi-endpoint resolution).            |
| `buildMultiEndpointConfig(yaml)`                | Parse and validate YAML, return `MultiEndpointProviderResult` without DI registration. |

### Templates

```typescript
import { generateEndpointsYamlTemplate } from '@quenetiq/core';
const template = generateEndpointsYamlTemplate();
// Returns a full YAML template with examples
```
