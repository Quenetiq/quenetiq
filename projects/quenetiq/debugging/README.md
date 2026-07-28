# @quenetiq/debugging

Debugging and inspection utilities for Quenetiq — operation recording, field tree parsing, timing charts, and entity normalization.

## Install

```bash
npm install @quenetiq/debugging
```

## Quick Start

```typescript
import { GraphqlDebugService, parseFieldTree, buildMutationChart } from '@quenetiq/debugging';

class MyComponent {
  private debug = inject(GraphqlDebugService);

  // Wraps GraphqlService — records all operations
  result$ = this.debug.query(gql`query Todos { … }`);

  // Later: inspect the log
  const entries = this.debug.getEntries();
  const chart = buildMutationChart(entries);
}
```

## Utilities

| Export | Description |
|--------|-------------|
| `GraphqlDebugService` | Wraps `GraphqlService`, records 500‑entry ring buffer of operations |
| `GraphqlDebugEntry` | Timing, operation name, fields, result per operation |
| `parseFieldTree(query)` | Parses a GraphQL query into `InspectedField[]` tree |
| `buildMutationChart(entries)` | Builds `MutationChartPoint[]` for timeline viz |
| `normalizeData(data)` | Extracts `NormalizedEntity[]` (typename + id) from any data |
| `groupEntities(entries)` | Groups by `__typename` |

## Dependencies

`@angular/common`, `@angular/core`, `@quenetiq/core`, `rxjs`
