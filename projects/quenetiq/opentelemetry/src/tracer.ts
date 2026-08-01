import type {
	Span,
	SpanContext,
	SpanAttributes,
	SpanStatus,
	SpanEvent,
	SpanExporter,
	ReadonlySpan,
	TracerConfig,
} from './types';
import { generateTraceId, generateSpanId, formatTraceParent } from './trace-context';
import { consoleExporter } from './exporters/console-exporter';

let activeTracer: MinimalTracer | null = null;

export function getTracer(): MinimalTracer {
	activeTracer ??= new MinimalTracer();
	return activeTracer;
}

export function setTracer(tracer: MinimalTracer): void {
	activeTracer = tracer;
}

export { type Span, type SpanContext, type SpanAttributes, type SpanStatus, type SpanExporter, type TracerConfig };

function now(): number {
	return performance.now();
}

interface InternalSpan {
	name: string;
	spanContext: SpanContext;
	parentSpanId?: string;
	status: SpanStatus;
	attributes: SpanAttributes;
	events: SpanEvent[];
	startTime: number;
	endTime?: number;
	ended: boolean;
}

export class MinimalTracer {
	private readonly exporter: SpanExporter;
	private readonly sampleRate: number;
	readonly serviceName: string;

	constructor(config: TracerConfig = {}) {
		this.exporter = config.exporter ?? consoleExporter({ pretty: true });
		this.sampleRate = config.sampleRate ?? 1;
		this.serviceName = config.serviceName ?? 'quenetiq';
	}

	startSpan(
		name: string,
		options?: {
			parent?: SpanContext;
			attributes?: SpanAttributes;
			startTime?: number;
		},
	): Span {
		const shouldSample = Math.random() < this.sampleRate;
		const traceId = options?.parent?.traceId ?? generateTraceId();
		const spanId = generateSpanId();
		const traceFlags = options?.parent?.traceFlags ?? (shouldSample ? 1 : 0);

		const spanCtx: SpanContext = {
			traceId,
			spanId,
			traceFlags,
			traceParent: formatTraceParent(traceId, spanId, traceFlags),
			isRemote: false,
		};

		const tracerRef = this;

		const span: InternalSpan = {
			name,
			spanContext: spanCtx,
			parentSpanId: options?.parent?.spanId,
			status: { code: 'UNSET' },
			attributes: { ...options?.attributes },
			events: [],
			startTime: options?.startTime ?? now(),
			ended: false,
		};

		return {
			get spanContext(): SpanContext {
				return span.spanContext;
			},
			setAttribute(key: string, value: string | number | boolean): void {
				span.attributes[key] = value;
			},
			setAttributes(attrs: SpanAttributes): void {
				Object.assign(span.attributes, attrs);
			},
			setStatus(status: SpanStatus): void {
				span.status = status;
			},
			addEvent(name: string, attributes?: SpanAttributes): void {
				span.events.push({ name, timestamp: now(), attributes });
			},
			end(): void {
				if (span.ended) return;
				span.ended = true;
				span.endTime = now();
				tracerRef.exportSpan(span);
			},
			isRecording(): boolean {
				return !span.ended;
			},
		};
	}

	startSpanSync<T>(
		name: string,
		fn: (span: Span) => T,
		options?: { parent?: SpanContext; attributes?: SpanAttributes },
	): T {
		const span = this.startSpan(name, options);
		try {
			const result = fn(span);
			span.setStatus({ code: 'OK' });
			span.end();
			return result;
		} catch (err) {
			span.setStatus({ code: 'ERROR', message: String(err) });
			span.end();
			throw err;
		}
	}

	async startSpanAsync<T>(
		name: string,
		fn: (span: Span) => Promise<T>,
		options?: { parent?: SpanContext; attributes?: SpanAttributes },
	): Promise<T> {
		const span = this.startSpan(name, options);
		try {
			const result = await fn(span);
			span.setStatus({ code: 'OK' });
			span.end();
			return result;
		} catch (err) {
			span.setStatus({ code: 'ERROR', message: String(err) });
			span.end();
			throw err;
		}
	}

	private exportSpan(span: InternalSpan): void {
		const duration = (span.endTime ?? now()) - span.startTime;
		const readonly: ReadonlySpan = {
			name: span.name,
			spanContext: span.spanContext,
			parentSpanId: span.parentSpanId,
			status: span.status,
			attributes: span.attributes,
			events: span.events,
			startTime: span.startTime,
			endTime: span.endTime,
			duration,
		};
		this.exporter.export(readonly);
	}
}
