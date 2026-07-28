import type { SpanExporter, ReadonlySpan } from '../types';

export interface ConsoleExporterOptions {
	pretty?: boolean;
}

export function consoleExporter(options?: ConsoleExporterOptions): SpanExporter {
	return {
		export(span: ReadonlySpan) {
			const { name, spanContext, parentSpanId, status, attributes, events, duration } = span;
			const traceId = spanContext.traceId.slice(0, 8) + '…' + spanContext.traceId.slice(-8);
			const spanId = spanContext.spanId;

			if (options?.pretty) {
				console.groupCollapsed(
					`%c[OTel] %c${name} %c(${duration.toFixed(1)}ms)`,
					'color:#888',
					'font-weight:bold',
					'color:#888;font-size:0.9em',
				);
				console.log('traceId:', traceId);
				console.log('spanId:', spanId);
				if (parentSpanId) console.log('parentSpanId:', parentSpanId);
				console.log('status:', status);
				if (Object.keys(attributes).length) console.log('attributes:', attributes);
				if (events.length) console.log('events:', events);
				console.groupEnd();
				return;
			}

			const spanStr = `[OTel] ${name} ${traceId}:${spanId} ${status.code}${status.message ? ` — ${status.message}` : ''} ${duration.toFixed(1)}ms`;
			if (status.code === 'ERROR') {
				console.warn(spanStr, attributes, events);
			} else {
				console.log(spanStr, attributes);
			}
		},
	};
}
