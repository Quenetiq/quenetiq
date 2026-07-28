import type { SpanContext } from './types';

const HEX = '0123456789abcdef';

function randomHex(bytes: number): string {
	const buf = new Uint8Array(bytes);
	globalThis.crypto?.getRandomValues(buf);
	let out = '';
	for (let i = 0; i < bytes; i++) {
		out += HEX[buf[i] >> 4] + HEX[buf[i] & 0x0f];
	}
	return out;
}

export function generateTraceId(): string {
	return randomHex(16);
}

export function generateSpanId(): string {
	return randomHex(8);
}

const TRACEPARENT_RE = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

export function parseTraceParent(value: string): SpanContext | null {
	const m = TRACEPARENT_RE.exec(value);
	if (!m) return null;
	return {
		traceId: m[2].toLowerCase(),
		spanId: m[3].toLowerCase(),
		traceFlags: parseInt(m[4], 16),
		traceParent: value,
		isRemote: true,
	};
}

export function formatTraceParent(traceId: string, spanId: string, traceFlags: number): string {
	const flags = traceFlags.toString(16).padStart(2, '0');
	return `00-${traceId}-${spanId}-${flags}`;
}
