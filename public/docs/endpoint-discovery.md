---
title: 'Endpoint Discovery'
slug: endpoint-discovery
group: 'Core'
order: 8
since: '1.0.0'
tags: [core, endpoint, discovery, schema, health]
description: 'Auto-discover and validate endpoint schemas'
---

# Endpoint Discovery

`EndpointDiscoveryService` probes all endpoints in the YAML config to verify accessibility and schema availability.

```typescript
import { EndpointDiscoveryService } from '@quenetiq/core';
import { loadEndpoints } from '@quenetiq/core';
```

## Usage

```typescript
class AdminComponent {
	private discovery = inject(EndpointDiscoveryService);

	async checkEndpoints() {
		const yaml = loadEndpoints();
		const results = await this.discovery.discover(yaml);

		for (const r of results) {
			console.log(`${r.routeName}: ${r.accessible ? 'OK' : 'DOWN'} ` + `(${r.hasSchema ? 'schema' : 'no schema'})`);
		}
	}
}
```

## How It Works

For each endpoint in the YAML config:

1. Sends an introspection query (`__schema { queryType mutationType types }`)
2. Checks if the endpoint responds (accessibility)
3. Checks if the response contains valid schema data
4. Returns a `DiscoveryResult` for each endpoint

## API Reference

| Member                                    | Type   | Description                          |
| ----------------------------------------- | ------ | ------------------------------------ |
| `EndpointDiscoveryService`                | class  | Injectable service                   |
| `EndpointDiscoveryService.discover(yaml)` | method | Returns `Promise<DiscoveryResult[]>` |

### DiscoveryResult

| Field        | Type                  | Description                              |
| ------------ | --------------------- | ---------------------------------------- |
| `routeName`  | `string`              | Endpoint name from YAML                  |
| `url`        | `string`              | URL of the endpoint                      |
| `accessible` | `boolean`             | Whether the endpoint is reachable        |
| `hasSchema`  | `boolean`             | Whether an introspection query succeeded |
| `sdlPreview` | `string \| undefined` | Schema summary (type count)              |
| `error`      | `string \| undefined` | Error message if probe failed            |
