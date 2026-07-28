import { Injectable, inject, type Provider, ENVIRONMENT_INITIALIZER } from '@angular/core';
import { NullDetectionService } from './null-detection.service';

@Injectable()
export class NullCheckerService {
	private readonly detector = inject(NullDetectionService, { optional: true });

	checkResponse(data: unknown, operationName?: string): void {
		if (!this.detector) return;
		walkObject(data, 'data', operationName, this.detector);
	}

	reportError(operationName: string | undefined, message: string): void {
		this.detector?.reportError(operationName, message);
	}
}

function walkObject(
	obj: unknown,
	path: string,
	operationName: string | undefined,
	detector: NullDetectionService,
): void {
	if (obj === null) {
		detector.reportNull(operationName, path);
		return;
	}
	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			walkObject(obj[i], `${path}[${i}]`, operationName, detector);
		}
		return;
	}
	if (typeof obj === 'object' && obj !== null) {
		for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
			walkObject(value, `${path}.${key}`, operationName, detector);
		}
	}
}

/**
 * Registers NullDetectionService + NullCheckerService as Angular providers.
 *
 * For visual feedback, add `<app-null-overlay />` to your root component template.
 * The overlay auto-wires via `inject(NullDetectionService, { optional: true })`
 * and works with or without this provider.
 */
export function provideNullChecker(): Provider[] {
	return [
		NullDetectionService,
		NullCheckerService,
		{
			provide: ENVIRONMENT_INITIALIZER,
			multi: true,
			useFactory: () => {
				const svc = inject(NullCheckerService);
				return () => svc;
			},
		},
	];
}
