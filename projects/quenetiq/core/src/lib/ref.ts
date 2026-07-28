import { signal, type Signal, type WritableSignal } from '@angular/core';

class Val<T = unknown> {
	private _value: T;
	private readonly _initial: T;

	constructor(value: T) {
		this._value = value;
		this._initial = value;
	}

	get value(): T {
		return this._value;
	}

	set value(v: T) {
		this._value = v;
	}

	nullify(): T {
		const prev = this._value;
		this._value = null as unknown as T;
		return prev;
	}

	isNull(): boolean {
		return this._value === null || this._value === undefined;
	}

	isEmpty(): boolean {
		return (
			this.isNull() || this._value === '' || (Array.isArray(this._value) && (this._value as unknown[]).length === 0)
		);
	}

	reset(): void {
		this._value = this._initial;
	}

	peek(): T {
		return this._value;
	}

	tap(fn: (v: T) => T): this {
		this._value = fn(this._value);
		return this;
	}

	swap(v: T): T {
		const prev = this._value;
		this._value = v;
		return prev;
	}

	orElse(fallback: T): T {
		return this.isNull() ? fallback : this._value;
	}

	match<R>(onSome: (v: T) => R, onNone: () => R): R {
		return this.isNull() ? onNone() : onSome(this._value);
	}

	toJSON(): T {
		return this._value;
	}
}

export interface AngularVal<T> extends WritableSignal<T> {
	nullify(): T;
	isNull(): boolean;
	isEmpty(): boolean;
	reset(): void;
	peek(): T;
	tap(fn: (v: T) => T): this;
	swap(v: T): T;
	orElse(fallback: T): T;
	match<R>(onSome: (v: T) => R, onNone: () => R): R;
}

export function createVal<T>(initialValue: T): AngularVal<T> {
	const sig = signal<T>(initialValue);
	const inner = new Val(initialValue);

	const ref = ((...args: [] | [T]) => {
		if (args.length === 0) {
			return inner.peek();
		}
		inner.value = args[0];
		sig.set(args[0]);
		return sig();
	}) as AngularVal<T>;

	ref.set = (v: T) => {
		inner.value = v;
		sig.set(v);
	};
	ref.update = (fn: (v: T) => T) => {
		inner.tap(fn);
		sig.update(fn);
	};
	ref.asReadonly = (): Signal<T> => sig.asReadonly();

	ref.nullify = (): T => {
		const prev = inner.nullify();
		sig.set(inner.value);
		return prev;
	};
	ref.isNull = (): boolean => inner.isNull();
	ref.isEmpty = (): boolean => inner.isEmpty();
	ref.reset = (): void => {
		inner.reset();
		sig.set(inner.value);
	};
	ref.peek = (): T => inner.peek();
	ref.tap = (fn: (v: T) => T): AngularVal<T> => {
		inner.tap(fn);
		sig.update(fn);
		return ref;
	};
	ref.swap = (v: T): T => {
		const prev = inner.swap(v);
		sig.set(inner.value);
		return prev;
	};
	ref.orElse = (fallback: T): T => inner.orElse(fallback);
	ref.match = <R>(onSome: (v: T) => R, onNone: () => R): R => inner.match(onSome, onNone);

	return ref;
}
