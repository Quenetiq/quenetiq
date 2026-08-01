import { describe, it, expect, vi, beforeEach } from 'vitest';

let callCount = 0;
const mockRandomValues = vi.fn((buf: Uint8Array) => {
	for (let i = 0; i < buf.length; i++) {
		buf[i] = (i * 17 + callCount * 13) % 256;
	}
	callCount++;
});
Object.defineProperty(globalThis, 'crypto', {
	value: { getRandomValues: mockRandomValues },
	configurable: true,
	writable: true,
});

import { MinimalTracer, getTracer, setTracer } from './tracer';
import { consoleExporter } from './exporters/console-exporter';

describe('MinimalTracer', () => {
	beforeEach(() => {
		callCount = 0;
	});

	it('creates a span with trace and span ids', () => {
		const tracer = new MinimalTracer({ serviceName: 'test' });
		const span = tracer.startSpan('test-op');
		expect(span.spanContext.traceId).toHaveLength(32);
		expect(span.spanContext.spanId).toHaveLength(16);
		expect(span.spanContext.isRemote).toBe(false);
		expect(span.spanContext.traceFlags).toBe(1);
	});

	it('creates a child span with the same trace id but different span id', () => {
		const tracer = new MinimalTracer({ serviceName: 'test' });
		const parent = tracer.startSpan('parent');
		const child = tracer.startSpan('child', { parent: parent.spanContext });
		expect(child.spanContext.traceId).toBe(parent.spanContext.traceId);
		expect(child.spanContext.spanId).not.toBe(parent.spanContext.spanId);
	});

	it('sets status on span', () => {
		const tracer = new MinimalTracer();
		const span = tracer.startSpan('op');
		span.setStatus({ code: 'OK' });
		span.end();
	});

	it('sets attributes on span', () => {
		const tracer = new MinimalTracer();
		const span = tracer.startSpan('op');
		span.setAttribute('key1', 'value1');
		span.setAttribute('key2', 42);
		span.setAttribute('key3', true);
		span.end();
	});

	it('records events', () => {
		const tracer = new MinimalTracer();
		const span = tracer.startSpan('op');
		span.addEvent('event1', { attr: 'val' });
		span.end();
	});

	it('isRecording returns true', () => {
		const tracer = new MinimalTracer();
		const span = tracer.startSpan('op');
		expect(span.isRecording()).toBe(true);
	});

	it('exports span when exporter is set', () => {
		const exported: unknown[] = [];
		const exporter = { export: (s: unknown) => exported.push(s) };
		const tracer = new MinimalTracer({ exporter });
		const span = tracer.startSpan('op');
		span.setAttribute('a', 1);
		span.end();
		expect(exported).toHaveLength(1);
		const s = exported[0] as Record<string, unknown>;
		expect(s.name).toBe('op');
	});
});

describe('getTracer / setTracer', () => {
	it('getTracer returns a tracer instance (default)', () => {
		expect(getTracer()).toBeDefined();
	});

	it('setTracer sets the global tracer', () => {
		const tracer = new MinimalTracer({ serviceName: 'custom' });
		setTracer(tracer);
		expect(getTracer()).toBe(tracer);
	});
});

describe('consoleExporter', () => {
	it('exports without throwing', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const exporter = consoleExporter();
		const tracer = new MinimalTracer({ exporter, serviceName: 'test' });
		const span = tracer.startSpan('test');
		span.setStatus({ code: 'OK' });
		span.end();
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});
});
