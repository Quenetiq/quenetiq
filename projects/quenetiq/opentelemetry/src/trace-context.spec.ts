import { describe, it, expect } from 'vitest';
import { parseTraceParent, formatTraceParent, generateTraceId, generateSpanId } from './trace-context';

describe('parseTraceParent', () => {
	it('parses a valid W3C traceparent', () => {
		const result = parseTraceParent('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
		expect(result).toEqual({
			traceId: '0af7651916cd43dd8448eb211c80319c',
			spanId: 'b7ad6b7169203331',
			traceFlags: 1,
			traceParent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
			isRemote: true,
		});
	});

	it('returns null for invalid format', () => {
		expect(parseTraceParent('')).toBeNull();
		expect(parseTraceParent('invalid')).toBeNull();
		expect(parseTraceParent('00-too-short')).toBeNull();
		expect(parseTraceParent('xx-00000000000000000000000000000000-0000000000000000-01')).toBeNull();
	});

	it('parses traceFlags as number', () => {
		const result = parseTraceParent('00-00000000000000000000000000000000-0000000000000000-ff');
		expect(result?.traceFlags).toBe(255);
	});
});

describe('formatTraceParent', () => {
	it('formats trace context as W3C traceparent with 00 version', () => {
		const result = formatTraceParent('0af7651916cd43dd8448eb211c80319c', 'b7ad6b7169203331', 1);
		expect(result).toBe('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
	});

	it('pads single-char flags', () => {
		const result = formatTraceParent('a'.repeat(32), 'b'.repeat(16), 0);
		expect(result).toMatch(/-00$/);
	});
});

describe('generateTraceId', () => {
	it('generates a 32-character hex string', () => {
		const id = generateTraceId();
		expect(id).toHaveLength(32);
		expect(/^[0-9a-f]+$/.test(id)).toBe(true);
	});
});

describe('generateSpanId', () => {
	it('generates a 16-character hex string', () => {
		const id = generateSpanId();
		expect(id).toHaveLength(16);
		expect(/^[0-9a-f]+$/.test(id)).toBe(true);
	});
});

describe('generateTraceId / generateSpanId', () => {
	it('generates unique values on successive calls', () => {
		const ids = Array.from({ length: 100 }, () => generateTraceId());
		const unique = new Set(ids);
		expect(unique.size).toBe(100);
	});
});
