import { describe, it, expect, vi, beforeEach } from 'vitest';

let callCount = 0;
const mockRandomValues = vi.fn((buf: Uint8Array) => {
	for (let i = 0; i < buf.length; i++) {
		buf[i] = (i * 13 + callCount * 7) % 256;
	}
	callCount++;
});
Object.defineProperty(globalThis, 'crypto', {
	value: { getRandomValues: mockRandomValues },
	configurable: true,
	writable: true,
});

import { parseTraceParent, formatTraceParent } from './trace-context';
import { MinimalTracer } from './tracer';

describe('opentelemetry package integration', () => {
	beforeEach(() => {
		callCount = 0;
	});

	it('generates trace id, creates span, exports it, and formats traceparent', () => {
		const exported: unknown[] = [];
		const exporter = { export: (s: unknown) => exported.push(s) };
		const tracer = new MinimalTracer({ exporter, serviceName: 'integration-test' });

		const span = tracer.startSpan('test-op', { attributes: { key: 'value' } });
		span.setAttribute('extra', 'val');
		span.setStatus({ code: 'OK' });
		span.end();

		expect(exported).toHaveLength(1);
		const exportedSpan = exported[0] as Record<string, unknown>;
		expect(exportedSpan.name).toBe('test-op');

		const ctx = span.spanContext;
		const traceparent = formatTraceParent(ctx.traceId, ctx.spanId, ctx.traceFlags);
		expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);

		const parsed = parseTraceParent(traceparent);
		expect(parsed).not.toBeNull();
		expect(parsed!.traceId).toBe(ctx.traceId);
		expect(parsed!.spanId).toBe(ctx.spanId);
	});

	it('child span inherits trace id', () => {
		const tracer = new MinimalTracer({ exporter: { export: () => {} } });

		const parent = tracer.startSpan('parent');
		const child = tracer.startSpan('child', { parent: parent.spanContext });

		expect(child.spanContext.traceId).toBe(parent.spanContext.traceId);
		expect(child.spanContext.spanId).not.toBe(parent.spanContext.spanId);
	});
});
