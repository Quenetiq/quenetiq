import { BehaviorSubject, type Observable } from 'rxjs';

export class ReactiveVar<T> {
	private subject: BehaviorSubject<T>;

	constructor(initialValue: T) {
		this.subject = new BehaviorSubject<T>(initialValue);
	}

	get(): T {
		return this.subject.value;
	}

	set(value: T): void {
		this.subject.next(value);
	}

	/** Update via callback (like React setState) */
	update(fn: (prev: T) => T): void {
		this.subject.next(fn(this.subject.value));
	}

	watch(): Observable<T> {
		return this.subject.asObservable();
	}
}

export function makeVar<T>(initialValue: T): ReactiveVar<T> {
	return new ReactiveVar(initialValue);
}
