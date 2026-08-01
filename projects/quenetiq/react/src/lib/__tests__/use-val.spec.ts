import { describe, it, expect } from 'vitest';
import { Val } from '@quenetiq/client';

// useVal wraps Val + useState in React. We test the Val primitives here.
// Full React rendering tests would need @testing-library/react + jsdom.

describe('useVal (React)', () => {
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
		const v = new Val(10);
		v.value = 20;
		v.reset();
		expect(v.value).toBe(10);
	});

	it('tap chain', () => {
		const v = new Val(1);
		v.tap((x) => x + 1).tap((x) => x * 3);
		expect(v.value).toBe(6);
	});

	it('swap', () => {
		const v = new Val('a');
		expect(v.swap('b')).toBe('a');
		expect(v.value).toBe('b');
	});

	it('orElse', () => {
		expect(new Val('x').orElse('y')).toBe('x');
		expect(new Val(null).orElse('y')).toBe('y');
	});

	it('match', () => {
		expect(
			new Val(1).match(
				(x) => x + 1,
				() => 0,
			),
		).toBe(2);
		expect(
			new Val(null).match(
				(x) => x + 1,
				() => 0,
			),
		).toBe(0);
	});

	it('toJSON', () => {
		expect(new Val({ a: 1 }).toJSON()).toEqual({ a: 1 });
	});
});
