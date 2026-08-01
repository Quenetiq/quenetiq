---
title: Debugging
slug: debugging
group: Tools
order: 5
since: '0.0.1'
tags:
  - debugging
  - devtools
description: Debugging and inspection utilities
---

# @quenetiq/debugging

The debugging package provides developer tooling for inspecting GraphQL queries, mutations, cache operations, and middleware flow. It includes a browser extension, middleware-based DevTools service, and utilities for parsing query field trees, building mutation charts, and normalizing data for inspection.

## Browser Extension

The **Quenetiq Debugger** browser extension provides a dedicated DevTools panel for capturing, inspecting, and debugging all GraphQL traffic from your application. It works with any framework — Angular, React, Vue, or vanilla JS.

- [Firefox Add-on](https://addons.mozilla.org/en-CA/firefox/addon/quenetiq-debugger/)
- [Chrome Web Store](https://chromewebstore.google.com/detail/quenetiq-debugger/)

### Architecture

The extension patches `window.fetch`, `XMLHttpRequest`, and `WebSocket` to intercept all GraphQL traffic. When used alongside the Quenetiq DevTools middleware, it also receives enriched metadata including timing, schema data, and entity cache snapshots.

### Permissions

- **Required:** Developer tools access, data access for all websites
- **Data collection:** None — all data stays local, never sent to external servers
- **Auto-pruning:** Maximum 500 entries, oldest automatically evicted

## DevTools Service

The `DevtoolsService` connects your Angular application to the browser extension. It captures every GraphQL request with timing information, sends schema data on introspection queries, and maintains a backlog in `localStorage`.

```typescript
import { provideQuenetiq, devtoolsMiddleware } from '@quenetiq/core';

provideQuenetiq({
	endpoint: '/graphql',
	devtools: {
		autoConnect: true,
		maxRequests: 500,
		captureSchema: true,
		endpoint: '/graphql',
	},
});
```

Enable the DevTools middleware directly for custom setups:

```typescript
import { devtoolsMiddleware } from '@quenetiq/core';

// Manual middleware setup
const middleware = devtoolsMiddleware({
	autoConnect: true,
	maxRequests: 500,
	captureSchema: true,
});
```

## Request Timeline

The DevTools panel displays a real-time, filterable list of all captured GraphQL operations:

- **Real-time capture:** Every query, mutation, and subscription is captured as it arrives
- **Search & filter:** Filter by operation name or query text
- **Timing bars:** Relative duration bars color-coded by success (green/blue) vs error (red)
- **Badges:** Operation type badge (`query`, `mutate`) on each entry
- **Auto-eviction:** Maximum 500 entries, oldest automatically removed

## Detail Tabs

Click any request in the timeline to open its detail view with the following tabs:

| Tab            | Content                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------- |
| **Overview**   | Operation type, name, endpoint URL, HTTP status, duration, timestamp, entity summary, timing chart |
| **Query**      | Indented query tree with nesting + raw query text with copy button                                 |
| **Variables**  | JSON-formatted variables with syntax coloring                                                      |
| **Response**   | Full response JSON with syntax coloring                                                            |
| **Projection** | Field projection analysis — compares requested vs returned fields                                  |
| **Cache**      | Normalized entity view grouped by type                                                             |
| **Schema**     | Interactive schema browser with type graph                                                         |

## Schema Browser

The built-in schema browser lets you explore your GraphQL schema interactively:

- **Download:** Fetch full introspection schema from any endpoint
- **Type list:** All non-introspection types with kind badges (`object`, `enum`, `input`, `interface`, `union`)
- **Type detail:** Fields table with types, nullability, arguments; enum values; interface implementations
- **Schema Graph SVG:** Interactive type connection graph — selected type centered with incoming/outgoing references
- **Save/Load:** Export schema as JSON file; reload from live endpoint

## Field Projection Analysis

The **Projection** tab in the request detail compares requested fields (from the query) against returned fields (from the response):

- **Matched:** Field was requested and returned
- **Missing:** Field was requested but absent from response (potential issue)
- **Extra:** Field was returned but not explicitly requested (over-fetching)

This helps identify over-fetching, under-fetching, and schema drift during development.

## Subscription Monitor

The extension tracks GraphQL subscriptions over WebSocket:

- **Lifecycle tracking:** `open`, `next` (DATA), `error`, `close`, `complete` events
- **Message capture:** Both sent and received messages on WebSocket connections
- **Status indicators:** Green (open), red (error), dimmed (closed/completed)
- **Event log:** Full scrollable log with DATA badges and JSON payloads
- **Connection info:** URL, event count, duration

## Data Export/Import

Export and import captured data for sharing or offline analysis:

- **Export:** Download all captured requests and subscriptions as JSON
- **Import:** Load a previously exported JSON file into the current session
- **File format:** `graphql-data-{timestamp}.json` with full request metadata

## Debug Service

Enable detailed logging of all Quenetiq operations using `provideQuenetiqDebugging`:

```typescript
import { provideQuenetiqDebugging } from '@quenetiq/debugging';

provideQuenetiqDebugging({
	logQueries: true,
	logMutations: true,
	logCacheOps: true,
	logMiddleware: true,
});
```

The `GraphqlDebugService` wraps `GraphqlService` calls, recording operation type, document, variables, timestamp, duration, result, operation name, and fields — up to 500 entries.

### In-app DevTools Panel

In addition to the browser extension, Quenetiq includes an in-app DevTools overlay (toggle with `Ctrl+Shift+D`) that provides:

- **Queries tab:** Recent operations with type badge, status, duration, fields, errors
- **Cache tab:** Entity cache snapshot with typename, ID, and field inspector
- **Errors tab:** Filtered error list with operation name and timestamps

## parseFieldTree()

Parse a GraphQL query into a structured field tree for visualization or analysis:

```typescript
import { parseFieldTree } from '@quenetiq/debugging';

const tree = parseFieldTree(gql`
	query {
		books(limit: 10) {
			id
			title
			author {
				name
			}
		}
	}
`);

console.log(tree);
// {
//   books: {
//     args: { limit: 10 },
//     fields: { id: {}, title: {}, author: { name: {} } }
//   }
// }
```

## buildMutationChart()

Generate a structured graph of cache interactions for a given mutation:

```typescript
import { buildMutationChart } from '@quenetiq/debugging';

const chart = buildMutationChart(gql`
	mutation LikePost($id: ID!) {
		likePost(id: $id) {
			id
			likes
		}
	}
`);
// Returns a structured graph of cache interactions
```

## normalizeData()

Normalize raw server data into the cache's internal format, useful for debugging cache state:

```typescript
import { normalizeData } from '@quenetiq/debugging';

const normalized = normalizeData(
	{
		__typename: 'Query',
		books: [{ __typename: 'Book', id: '1', title: 'Dune' }],
	},
	{ keyFields: ['id'] },
);

console.log(normalized);
// {
//   'Book:1': { __typename: 'Book', id: '1', title: 'Dune' },
//   'Query': { books: ['Book:1'] },
// }
```

## API Reference

### GraphqlDebugService

Debug logging service that records operation type, document, variables, timestamp, duration, result for up to 500 entries.

| Name                                               | Type     | Description                                    |
| -------------------------------------------------- | -------- | ---------------------------------------------- |
| `GraphqlDebugService.entries`                      | property | Read-only array of recorded debug entries.     |
| `GraphqlDebugService.enabled`                      | property | Toggle debug recording on/off. Default: `true` |
| `GraphqlDebugService.query(document, variables?)`  | method   | Executes a query and logs the operation.       |
| `GraphqlDebugService.mutate(document, variables?)` | method   | Executes a mutation and logs the operation.    |
| `GraphqlDebugService.clear()`                      | method   | Clears all recorded debug entries.             |

### GraphqlDebugEntry

Recorded debug entry with timing, doc, variables, and result.

| Name                              | Type     | Description                                |
| --------------------------------- | -------- | ------------------------------------------ |
| `GraphqlDebugEntry.type`          | property | Operation type: query or mutate.           |
| `GraphqlDebugEntry.document`      | property | Raw GraphQL document string.               |
| `GraphqlDebugEntry.variables`     | property | Variables sent with the operation.         |
| `GraphqlDebugEntry.timestamp`     | property | Start timestamp from performance.now().    |
| `GraphqlDebugEntry.duration`      | property | Duration in ms.                            |
| `GraphqlDebugEntry.result`        | property | GraphQLResult with status, data, or error. |
| `GraphqlDebugEntry.operationName` | property | Extracted operation name, if any.          |
| `GraphqlDebugEntry.fields`        | property | Extracted field names from the document.   |

### parseFieldTree(query)

Parses a GraphQL query into a structured field tree object for visualization or analysis.

### InspectedField

A node in the parsed field tree.

| Name                      | Type     | Description                  |
| ------------------------- | -------- | ---------------------------- |
| `InspectedField.name`     | property | Field name.                  |
| `InspectedField.depth`    | property | Nesting depth of this field. |
| `InspectedField.children` | property | Child fields, if any.        |

### buildMutationChart(entries)

Generates a timeline chart from debug entries for visualization.

### MutationChartPoint

A single point on the mutation timeline chart.

| Name                          | Type     | Description                              |
| ----------------------------- | -------- | ---------------------------------------- |
| `MutationChartPoint.label`    | property | Operation label or anonymous.            |
| `MutationChartPoint.start`    | property | Start offset relative to earliest entry. |
| `MutationChartPoint.end`      | property | End offset relative to earliest entry.   |
| `MutationChartPoint.duration` | property | Duration in ms.                          |
| `MutationChartPoint.ok`       | property | Whether the operation succeeded.         |

### normalizeData(data, parentPath?)

Normalizes raw server data into normalized entities keyed by \_\_typename + id.

### NormalizedEntity

A single normalized cache entity.

| Name                    | Type     | Description                                      |
| ----------------------- | -------- | ------------------------------------------------ |
| `NormalizedEntity.type` | property | \_\_typename value.                              |
| `NormalizedEntity.id`   | property | Entity ID (id or \_id field).                    |
| `NormalizedEntity.path` | property | Dot-notation path to the entity in the response. |

### Other Exports

| Name                               | Type     | Description                                                                    |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `groupEntities(entries)`           | function | Groups normalized entities by their \_\_typename.                              |
| `provideDevToolsPanel()`           | function | Angular provider that registers the DevTools keyboard shortcut (Ctrl+Shift+D). |
| `provideQuenetiqDebugging(config)` | function | Angular provider that enables detailed logging of all Quenetiq operations.     |

### DevToolsService

Service managing DevTools panel visibility, tabs, and cache snapshots.

| Name                                 | Type     | Description                                  |
| ------------------------------------ | -------- | -------------------------------------------- |
| `DevToolsService.visible$`           | property | Observable of panel visibility.              |
| `DevToolsService.activeTab$`         | property | Observable of active tab.                    |
| `DevToolsService.cacheSnapshot$`     | property | Observable of cache snapshot.                |
| `DevToolsService.entries`            | property | Live debug entries from GraphqlDebugService. |
| `DevToolsService.cacheSnapshotValue` | property | Synchronous cache snapshot value.            |
| `DevToolsService.init()`             | method   | Initializes keyboard shortcut listener.      |
| `DevToolsService.destroy()`          | method   | Removes keyboard shortcut listener.          |
| `DevToolsService.toggle()`           | method   | Toggles DevTools panel visibility.           |
| `DevToolsService.open()`             | method   | Opens DevTools panel.                        |
| `DevToolsService.close()`            | method   | Closes DevTools panel.                       |
| `DevToolsService.setTab(tab)`        | method   | Switches to a specific tab.                  |
| `DevToolsService.getQueryCount()`    | method   | Returns total recorded query count.          |
| `DevToolsService.getErrorCount()`    | method   | Returns total recorded error count.          |

### Types

| Name                     | Type      | Description                                      |
| ------------------------ | --------- | ------------------------------------------------ |
| `DevToolsTab`            | type      | Available DevTools tabs: queries, cache, errors. |
| `CacheSnapshot`          | interface | Snapshot of a single cache entity.               |
| `CacheSnapshot.typename` | property  | Entity \_\_typename.                             |
| `CacheSnapshot.id`       | property  | Entity ID.                                       |
| `CacheSnapshot.fields`   | property  | All fields of the entity.                        |

### DevToolsPanelComponent

Standalone Angular component rendering the DevTools panel UI.

## Starters

:::stackblitz starter="debugging"
