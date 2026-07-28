export class Val<T = unknown> {
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
