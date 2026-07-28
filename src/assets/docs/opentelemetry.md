---
title: OpenTelemetry
slug: opentelemetry
group: Middleware
order: 3
since: "1.0.5"
tags:
  - otel
  - tracing
description: W3C Trace Context propagation
---

# @quenetiq/opentelemetry

The OpenTelemetry package provides W3C Trace Context propagation and OpenTelemetry-compatible tracing for Quenetiq GraphQL clients. It includes a minimal tracer, middleware for request/response tracing, and Angular integration — all with zero external dependencies.

## Setup

Install the package and configure the tracer:

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

## OTel Middleware

Use `otelMiddleware` on the server side to capture incoming trace context from `traceparent` headers, and `otelClientMiddleware` on the client to propagate context to outgoing requests:

```typescript
import { otelMiddleware, otelClientMiddleware } from '@quenetiq/opentelemetry';

// Server-side: capture incoming trace context
const serverMiddleware = otelMiddleware({
  serviceName: 'api',
});

// Client-side: propagate trace context to outgoing requests
const clientMiddleware = otelClientMiddleware({
  propagateHeaders: true,
});
```

## Trace Context (W3C)

Full W3C Trace Context support for distributed tracing across services:

```typescript
import {
  parseTraceParent,
  formatTraceParent,
  generateTraceId,
  generateSpanId,
} from '@quenetiq/opentelemetry';

// Generate a new trace
const traceId = generateTraceId();
const spanId = generateSpanId();
const traceParent = formatTraceParent({ traceId, spanId, traceFlags: 1 });
// → "00-<traceId>-<spanId>-01"

// Parse an incoming traceparent header
const context = parseTraceParent(traceParent);
// → { traceId, spanId, traceFlags, version }
```

## Exporters

Export spans to various backends. Built-in console exporter with pretty-printing:

```typescript
import { consoleExporter } from '@quenetiq/opentelemetry';

const exporter = consoleExporter({
  prettyPrint: true,
  includeAttributes: true,
  includeTiming: true,
});

// Register with tracer
const tracer = new MinimalTracer({
  serviceName: 'my-app',
  exporter,
});
```

## Angular Integration

For Angular applications, use the dedicated provider to wire up telemetry automatically:

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

## API Reference

### MinimalTracer

Minimal OpenTelemetry-compatible tracer with configurable service name and exporter. Zero external dependencies.

| Name | Type | Description |
|------|------|-------------|
| `MinimalTracer.constructor(config?)` | constructor | Creates a tracer with optional exporter, sampleRate, serviceName. Default: `TracerConfig = {}` |
| `MinimalTracer.startSpan(name, options?)` | method | Creates and returns a new Span with optional parent context and attributes. |
| `MinimalTracer.startSpanSync(name, fn, options?)` | method | Creates a span, runs a synchronous function, ends span on success or error. |
| `MinimalTracer.startSpanAsync(name, fn, options?)` | method | Creates a span, runs an async function, ends span on success or error. |

### TracerConfig

Configuration for MinimalTracer.

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `TracerConfig.exporter` | property | `consoleExporter({ pretty: true })` | Custom SpanExporter instance. |
| `TracerConfig.sampleRate` | property | `1` | Probability (0-1) of sampling a trace. |
| `TracerConfig.serviceName` | property | `quenetiq` | Service name for identifying spans. |

### Global Functions

| Name | Type | Description |
|------|------|-------------|
| `getTracer()` | function | Returns the global MinimalTracer instance, creating a default one if none set. |
| `setTracer(tracer)` | function | Sets the global tracer instance used by all OTel middleware. |

### SpanContext

W3C trace context with traceId, spanId, flags, and remote flag.

| Name | Type | Description |
|------|------|-------------|
| `SpanContext.traceId` | property | 32-hex-character trace ID. |
| `SpanContext.spanId` | property | 16-hex-character span ID. |
| `SpanContext.traceFlags` | property | W3C trace flags (sampled bit = 1). |
| `SpanContext.traceParent` | property | Full traceparent header string. |
| `SpanContext.isRemote` | property | Whether this context was propagated from a remote service. |

### Span

OpenTelemetry-compatible span interface.

| Name | Type | Description |
|------|------|-------------|
| `Span.setAttribute(key, value)` | method | Sets a single attribute on the span. |
| `Span.setAttributes(attrs)` | method | Sets multiple attributes at once. |
| `Span.setStatus(status)` | method | Sets the span status (OK / ERROR / UNSET). |
| `Span.addEvent(name, attributes?)` | method | Records a named event with optional attributes. |
| `Span.end()` | method | Ends the span and exports it via the registered exporter. |
| `Span.isRecording()` | method | Returns whether the span is still recording. |

### Types

| Name | Type | Description |
|------|------|-------------|
| `SpanAttributes` | type | String-keyed map of attribute values (string, number, boolean, or undefined). |
| `SpanStatus` | interface | Span status with code and optional message. |
| `SpanStatus.code` | property | Status code: OK, ERROR, or UNSET. |
| `SpanStatus.message` | property | Optional error description. |

### SpanExporter

Interface for exporting completed spans.

| Name | Type | Description |
|------|------|-------------|
| `SpanExporter.export(span)` | method | Exports a single ReadonlySpan. |

### ReadonlySpan

Immutable snapshot of an ended span.

| Name | Type | Description |
|------|------|-------------|
| `ReadonlySpan.name` | property | Span operation name. |
| `ReadonlySpan.spanContext` | property | Span context with trace/span IDs. |
| `ReadonlySpan.parentSpanId` | property | Parent span ID if any. |
| `ReadonlySpan.status` | property | Final span status. |
| `ReadonlySpan.attributes` | property | Span attributes at end time. |
| `ReadonlySpan.events` | property | Recorded span events. |
| `ReadonlySpan.startTime` | property | Span start timestamp in ms. |
| `ReadonlySpan.endTime` | property | Span end timestamp in ms. |
| `ReadonlySpan.duration` | property | Computed duration in ms. |

### Middleware

| Name | Type | Description |
|------|------|-------------|
| `otelMiddleware(config?)` | function | Server-side middleware that captures incoming trace context from traceparent headers. |
| `otelClientMiddleware(config?)` | function | Client-side middleware that propagates trace context to outgoing requests. |

### OtelMiddlewareConfig

Configuration for OTel middleware functions.

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `OtelMiddlewareConfig.tracer` | property | `getTracer()` | Custom tracer instance (defaults to global). |
| `OtelMiddlewareConfig.attributes` | property | `—` | Static attributes added to every span. |
| `OtelMiddlewareConfig.parentContext` | property | `—` | Parent SpanContext for trace propagation. |
| `OtelMiddlewareConfig.maxQueryLength` | property | `500` | Max query length in span attributes (0 to skip). |

### Exporter Functions

| Name | Type | Description |
|------|------|-------------|
| `consoleExporter(options?)` | function | Built-in exporter that prints spans to console with optional pretty-print. |

### ConsoleExporterOptions

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `ConsoleExporterOptions.pretty` | property | `false` | Use console.groupCollapsed for grouped output. |

### W3C Trace Context Utilities

| Name | Type | Description |
|------|------|-------------|
| `parseTraceParent(header)` | function | Parses a W3C traceparent header string into its component fields. |
| `formatTraceParent(traceId, spanId, traceFlags)` | function | Formats trace context into a W3C traceparent header string. |
| `generateTraceId()` | function | Generates a random 32-hex-character trace ID. |
| `generateSpanId()` | function | Generates a random 16-hex-character span ID. |

## Starters

:::stackblitz starter="opentelemetry"
