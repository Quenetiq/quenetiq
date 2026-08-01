import { describe, it, expect } from 'vitest';
import { Val } from '../ref';

describe('Val', () => {
	it('stores initial value', () => {
		const v = new Val(42);
		expect(v.value).toBe(42);
	});

	it('get/set value', () => {
		const v = new Val('hello');
		v.value = 'world';
		expect(v.value).toBe('world');
	});

	it('nullify sets to null and returns previous', () => {
		const v = new Val(10);
		const prev = v.nullify();
		expect(prev).toBe(10);
		expect(v.value).toBeNull();
	});

	it('isNull returns true for null', () => {
		const v = new Val(null);
		expect(v.isNull()).toBe(true);
	});

	it('isNull returns true for undefined', () => {
		const v = new Val(undefined);
		expect(v.isNull()).toBe(true);
	});

	it('isNull returns false for valid value', () => {
		const v = new Val(0);
		expect(v.isNull()).toBe(false);
	});

	it('isEmpty returns true for null', () => {
		expect(new Val(null).isEmpty()).toBe(true);
	});

	it('isEmpty returns true for empty string', () => {
		expect(new Val('').isEmpty()).toBe(true);
	});

	it('isEmpty returns true for empty array', () => {
		expect(new Val([]).isEmpty()).toBe(true);
	});

	it('isEmpty returns false for non-empty', () => {
		expect(new Val([1]).isEmpty()).toBe(false);
	});

	it('reset goes back to initial value', () => {
		const v = new Val([1, 2, 3]);
		v.value = [4];
		v.reset();
		expect(v.value).toEqual([1, 2, 3]);
	});

	it('peek returns current value', () => {
		const v = new Val('peek');
		expect(v.peek()).toBe('peek');
	});

	it('tap transforms value and returns this', () => {
		const v = new Val(5);
		const result = v.tap((x) => x * 2);
		expect(v.value).toBe(10);
		expect(result).toBe(v);
	});

	it('swap sets new value and returns previous', () => {
		const v = new Val('old');
		const prev = v.swap('new');
		expect(prev).toBe('old');
		expect(v.value).toBe('new');
	});

	it('orElse returns value when not null', () => {
		const v = new Val('real');
		expect(v.orElse('fallback')).toBe('real');
	});

	it('orElse returns fallback when null', () => {
		const v = new Val(null);
		expect(v.orElse('fallback')).toBe('fallback');
	});

	it('match calls onSome when not null', () => {
		const v = new Val(42);
		const r = v.match(
			(x) => `got ${x}`,
			() => 'none',
		);
		expect(r).toBe('got 42');
	});

	it('match calls onNone when null', () => {
		const v = new Val(null);
		const r = v.match(
			(x) => `got ${x}`,
			() => 'none',
		);
		expect(r).toBe('none');
	});

	it('toJSON returns value', () => {
		const v = new Val({ a: 1 });
		expect(v.toJSON()).toEqual({ a: 1 });
	});

	it('handles undefined initial', () => {
		const v = new Val(undefined);
		expect(v.isNull()).toBe(true);
		v.value = 1;
		expect(v.value).toBe(1);
	});
});
