import { describe, it, expect } from 'vitest';
import { Val } from '@quenetiq/client';

// createVal depends on Angular core signal() which isn't available in node.
// We test the Val class directly instead — createVal is a thin wrapper.

describe('createVal (Angular)', () => {
	it('Val class works as base', () => {
		const v = new Val(42);
		expect(v.value).toBe(42);
	});

	it('set updates value', () => {
		const v = new Val('a');
		v.value = 'b';
		expect(v.value).toBe('b');
	});

	it('nullify sets null and returns previous', () => {
		const v = new Val(10);
		const prev = v.nullify();
		expect(prev).toBe(10);
		expect(v.isNull()).toBe(true);
	});

	it('isNull checks null/undefined', () => {
		expect(new Val(null).isNull()).toBe(true);
		expect(new Val(0).isNull()).toBe(false);
	});

	it('isEmpty checks empty states', () => {
		expect(new Val('').isEmpty()).toBe(true);
		expect(new Val([]).isEmpty()).toBe(true);
		expect(new Val([1]).isEmpty()).toBe(false);
	});

	it('reset goes to initial', () => {
		const v = new Val([1]);
		v.value = [2];
		v.reset();
		expect(v.value).toEqual([1]);
	});

	it('peek reads without tracking', () => {
		expect(new Val(7).peek()).toBe(7);
	});

	it('tap transforms in place', () => {
		const v = new Val(3);
		v.tap((x) => x * 3);
		expect(v.value).toBe(9);
	});

	it('swap returns previous value', () => {
		const v = new Val('old');
		const prev = v.swap('new');
		expect(prev).toBe('old');
		expect(v.value).toBe('new');
	});

	it('orElse returns value or fallback', () => {
		expect(new Val('yes').orElse('no')).toBe('yes');
		expect(new Val(null).orElse('no')).toBe('no');
	});

	it('match dispatches correctly', () => {
		const r1 = new Val(42).match(
			(x) => x * 2,
			() => 0,
		);
		expect(r1).toBe(84);
		const r2 = new Val(null).match(
			(x) => x * 2,
			() => 0,
		);
		expect(r2).toBe(0);
	});

	it('update via tap chain', () => {
		const v = new Val(1);
		v.tap((x) => x + 10);
		expect(v.value).toBe(11);
	});
});
