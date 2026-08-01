import { useState, useRef as useReactRef } from 'react';
import { Val } from '@quenetiq/client';

export interface ReactVal<T> {
	value: T;
	set: (v: T) => void;
	update: (fn: (v: T) => T) => void;
	nullify: () => T;
	isNull: () => boolean;
	isEmpty: () => boolean;
	reset: () => void;
	peek: () => T;
	tap: (fn: (v: T) => T) => ReactVal<T>;
	swap: (v: T) => T;
	orElse: (fallback: T) => T;
	match: <R>(onSome: (v: T) => R, onNone: () => R) => R;
}

export function useVal<T>(initialValue: T): ReactVal<T> {
	const innerRef = useReactRef(new Val(initialValue));
	const [, trigger] = useState(0);

	const rerender = (): void => trigger((n) => n + 1);

	return {
		get value(): T {
			return innerRef.current.peek();
		},
		set(v: T) {
			innerRef.current.value = v;
			rerender();
		},
		update(fn: (v: T) => T) {
			innerRef.current.tap(fn);
			rerender();
		},
		nullify() {
			const p = innerRef.current.nullify();
			rerender();
			return p;
		},
		isNull() {
			return innerRef.current.isNull();
		},
		isEmpty() {
			return innerRef.current.isEmpty();
		},
		reset() {
			innerRef.current.reset();
			rerender();
		},
		peek() {
			return innerRef.current.peek();
		},
		tap(fn: (v: T) => T) {
			innerRef.current.tap(fn);
			rerender();
			return this;
		},
		swap(v: T) {
			const p = innerRef.current.swap(v);
			rerender();
			return p;
		},
		orElse(fallback: T) {
			return innerRef.current.orElse(fallback);
		},
		match<R>(onSome: (v: T) => R, onNone: () => R) {
			return innerRef.current.match(onSome, onNone);
		},
	};
}
