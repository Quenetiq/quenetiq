import { Injectable, type OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface NullDetectionEvent {
	type: 'null-value' | 'query-error';
	operationName?: string;
	path?: string;
	message: string;
	timestamp: number;
}

const EXTENSION_SOURCE = 'dumb-keystore-graphql-debug';

function sendToExtension(event: NullDetectionEvent): void {
	if (typeof window === 'undefined') return;
	window.postMessage(
		{
			source: EXTENSION_SOURCE,
			type: 'null-detection',
			payload: event,
		},
		'*',
	);
}

@Injectable({ providedIn: 'root' })
export class NullDetectionService implements OnDestroy {
	private events$ = new Subject<NullDetectionEvent>();

	readonly onEvent: Observable<NullDetectionEvent> = this.events$.asObservable();

	reportNull(operationName: string | undefined, path: string): void {
		const event: NullDetectionEvent = {
			type: 'null-value',
			operationName,
			path,
			message: `Null value at ${path}`,
			timestamp: Date.now(),
		};
		this.events$.next(event);
		sendToExtension(event);
	}

	reportError(operationName: string | undefined, message: string): void {
		const event: NullDetectionEvent = {
			type: 'query-error',
			operationName,
			message,
			timestamp: Date.now(),
		};
		this.events$.next(event);
		sendToExtension(event);
	}

	ngOnDestroy(): void {
		this.events$.complete();
	}
}
