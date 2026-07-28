# @quenetiq/opentelemetry

W3C Trace Context propagation and OpenTelemetry-compatible tracing for Quenetiq GraphQL clients — with zero external dependencies.

## Installation

```bash
npm install @quenetiq/opentelemetry
```

## Quick Start

```typescript
import { createClient } from '@quenetiq/client';
import { MinimalTracer, setTracer, otelMiddleware } from '@quenetiq/opentelemetry';

const tracer = new MinimalTracer({ serviceName: 'my-app' });
setTracer(tracer);

const client = createClient({
  endpoint: '/graphql',
  middleware: [otelMiddleware()],
});
```

## Features

- **MinimalTracer** — Lightweight OpenTelemetry-compatible tracer with span lifecycle
- **otelMiddleware** — Capture incoming trace context from `traceparent` headers
- **otelClientMiddleware** — Propagate trace context to outgoing requests
- **W3C Trace Context** — Full `traceparent` header parsing and formatting
- **Console exporter** — Pretty-printed span output for development
- **Angular integration** — Provider-based setup with `provideQuenetiqTelemetry()`

## API

### `MinimalTracer`

```typescript
const tracer = new MinimalTracer({
  serviceName: 'my-app',
  exporter: consoleExporter({ prettyPrint: true }),
});

const span = tracer.startSpan('graphql-request');
span.setAttribute('operation', 'getUser');
span.end();
```

### `otelMiddleware(config?)`

Server-side middleware that captures incoming trace context:

```typescript
const middleware = otelMiddleware({
  serviceName: 'api',
  propagateHeaders: true,
});
```

### `otelClientMiddleware(config?)`

Client-side middleware that propagates trace context to outgoing requests:

```typescript
const middleware = otelClientMiddleware({
  propagateHeaders: true,
});
```

### Trace Context Utilities

```typescript
import { parseTraceParent, formatTraceParent, generateTraceId, generateSpanId } from '@quenetiq/opentelemetry';

const traceId = generateTraceId();
const spanId = generateSpanId();
const header = formatTraceParent({ traceId, spanId, traceFlags: 1 });

const context = parseTraceParent(header);
```

### Angular Integration

```typescript
import { provideQuenetiq } from '@quenetiq/core';
import { provideQuenetiqTelemetry } from '@quenetiq/opentelemetry/angular';

export const appConfig = {
  providers: [
    provideHttpClient(),
    provideQuenetiq({ endpoint: '/graphql' }),
    provideQuenetiqTelemetry({
      serviceName: 'my-angular-app',
      exporter: 'console',
    }),
  ],
};
```

## License

MIT
