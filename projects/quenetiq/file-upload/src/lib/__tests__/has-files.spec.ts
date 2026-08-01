import { describe, it, expect } from 'vitest';
import { hasFiles } from '../has-files';

describe('hasFiles', () => {
	it('returns false for primitives', () => {
		expect(hasFiles(null)).toBe(false);
		expect(hasFiles(undefined)).toBe(false);
		expect(hasFiles(42)).toBe(false);
		expect(hasFiles('string')).toBe(false);
		expect(hasFiles(true)).toBe(false);
	});

	it('returns true for File instances', () => {
		const file = new File(['content'], 'test.txt', { type: 'text/plain' });
		expect(hasFiles(file)).toBe(true);
	});

	it('returns true for Blob instances', () => {
		const blob = new Blob(['content'], { type: 'text/plain' });
		expect(hasFiles(blob)).toBe(true);
	});

	it('returns true for arrays containing files', () => {
		const file = new File(['content'], 'test.txt');
		expect(hasFiles([1, 2, file])).toBe(true);
	});

	it('returns true for nested objects with files', () => {
		const file = new File(['content'], 'test.txt');
		expect(hasFiles({ a: { b: file } })).toBe(true);
	});

	it('returns false for objects without files', () => {
		expect(hasFiles({ a: 1, b: 'hello' })).toBe(false);
	});

	it('returns false for arrays without files', () => {
		expect(hasFiles([1, 2, 3])).toBe(false);
	});

	it('returns true for deeply nested files', () => {
		const blob = new Blob(['data']);
		expect(hasFiles({ level1: { level2: { level3: [blob] } } })).toBe(true);
	});
});
