import { describe, it, expect } from 'vitest';
import { Val } from '@quenetiq/client';

// useVal wraps Vue's ref() + Val in a composable. We test the Val primitives here.
// Full Vue component tests would need @vue/test-utils + jsdom.

describe('useVal (Vue)', () => {
	it('creates with initial value', () => {
		const v = new Val(42);
		expect(v.value).toBe(42);
	});

	it('value getter/setter', () => {
		const v = new Val('x');
		v.value = 'y';
		expect(v.value).toBe('y');
	});

	it('nullify', () => {
		const v = new Val(1);
		expect(v.nullify()).toBe(1);
		expect(v.isNull()).toBe(true);
	});

	it('isNull', () => {
		expect(new Val(null).isNull()).toBe(true);
		expect(new Val(0).isNull()).toBe(false);
	});

	it('isEmpty', () => {
		expect(new Val('').isEmpty()).toBe(true);
		expect(new Val([]).isEmpty()).toBe(true);
		expect(new Val([1]).isEmpty()).toBe(false);
	});

	it('reset', () => {
		const v = new Val([1, 2]);
		v.value = [3];
		v.reset();
		expect(v.value).toEqual([1, 2]);
	});

	it('tap chain', () => {
		const v = new Val(2);
		v.tap((x) => x * 3).tap((x) => x + 1);
		expect(v.value).toBe(7);
	});

	it('swap', () => {
		const v = new Val('old');
		const prev = v.swap('new');
		expect(prev).toBe('old');
		expect(v.value).toBe('new');
	});

	it('orElse', () => {
		expect(new Val<string | null>('x').orElse('y')).toBe('x');
		expect(new Val<string | null>(null).orElse('y')).toBe('y');
	});

	it('match', () => {
		expect(
			new Val<number | null>(5).match(
				(x) => x! * 2,
				() => 0,
			),
		).toBe(10);
		expect(
			new Val<number | null>(null).match(
				(x) => x! * 2,
				() => 0,
			),
		).toBe(0);
	});
});
