import { ref as vueRef, type Ref } from 'vue';
import { Val } from '@quenetiq/client';

export interface VueVal<T> extends Ref<T> {
	nullify: () => T;
	isNull: () => boolean;
	isEmpty: () => boolean;
	reset: () => void;
	tap: (fn: (v: T) => T) => VueVal<T>;
	swap: (v: T) => T;
	orElse: (fallback: T) => T;
	match: <R>(onSome: (v: T) => R, onNone: () => R) => R;
}

export function useVal<T>(initialValue: T): VueVal<T> {
	const inner = new Val(initialValue);
	const r = vueRef<T>(initialValue) as unknown as VueVal<T>;

	r.nullify = () => {
		const prev = inner.nullify();
		r.value = inner.value;
		return prev;
	};
	r.isNull = () => inner.isNull();
	r.isEmpty = () => inner.isEmpty();
	r.reset = () => {
		inner.reset();
		r.value = inner.value;
	};
	r.tap = (fn: (v: T) => T) => {
		inner.tap(fn);
		r.value = inner.value;
		return r;
	};
	r.swap = (v: T) => {
		const prev = inner.swap(v);
		r.value = inner.value;
		return prev;
	};
	r.orElse = (fallback: T) => inner.orElse(fallback);
	r.match = <R>(onSome: (v: T) => R, onNone: () => R) => inner.match(onSome, onNone);

	return r;
}
