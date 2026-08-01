export interface SpanContext {
	traceId: string;
	spanId: string;
	traceFlags: number;
	traceParent: string;
	isRemote: boolean;
}

export type SpanAttributes = Record<string, string | number | boolean | undefined>;

export interface SpanStatus {
	code: 'OK' | 'ERROR' | 'UNSET';
	message?: string;
}

export interface SpanEvent {
	name: string;
	timestamp: number;
	attributes?: SpanAttributes;
}

export interface Span {
	readonly spanContext: SpanContext;
	setAttribute(key: string, value: string | number | boolean): void;
	setAttributes(attrs: SpanAttributes): void;
	setStatus(status: SpanStatus): void;
	addEvent(name: string, attributes?: SpanAttributes): void;
	end(): void;
	isRecording(): boolean;
}

export interface SpanExporter {
	export(span: ReadonlySpan): void;
}

export interface ReadonlySpan {
	readonly name: string;
	readonly spanContext: SpanContext;
	readonly parentSpanId?: string;
	readonly status: SpanStatus;
	readonly attributes: SpanAttributes;
	readonly events: SpanEvent[];
	readonly startTime: number;
	readonly endTime?: number;
	readonly duration: number;
}

export interface TracerConfig {
	exporter?: SpanExporter;
	sampleRate?: number;
	serviceName?: string;
}
