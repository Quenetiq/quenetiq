import { inject, ENVIRONMENT_INITIALIZER, type Provider } from '@angular/core';
import { tap } from 'rxjs/operators';
import type { GraphQLResult } from './graphql.service';
import type { GraphqlMiddleware, GraphqlRequestContext } from './middleware';
import { NullDetectionService } from './null-detection.service';

interface NullValueInfo {
	type: 'null-value';
	path: string;
	operationName?: string;
}

function walkObject<T>(obj: T, path: string, operationName?: string): NullValueInfo[] {
	const results: NullValueInfo[] = [];

	function walk(value: unknown, currentPath: string): void {
		if (value === null) {
			results.push({ type: 'null-value', path: currentPath, operationName });
			return;
		}
		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				walk(value[i], `${currentPath}[${i}]`);
			}
			return;
		}
		if (typeof value === 'object' && value !== null) {
			for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
				walk(v, `${currentPath}.${key}`);
			}
		}
	}

	walk(obj, path);
	return results;
}

function extractOpName(queryStr: string): string | undefined {
	const m = queryStr.match(/(?:query|mutation|subscription)\s+(\w+)/i);
	return m?.[1] ?? undefined;
}

export function nullDetectionMiddleware(): GraphqlMiddleware {
	let detector: NullDetectionService | null = null;

	return (request: GraphqlRequestContext, next) => {
		if (!detector) {
			try {
				detector = inject(NullDetectionService);
			} catch {
				return next(request);
			}
		}

		const operationName = extractOpName(request.query);

		return next(request).pipe(
			tap((result: GraphQLResult<unknown>) => {
				if (result.status === 'error') {
					detector!.reportError(operationName, result.error);
					return;
				}

				if (result.status === 'success' && result.data !== null && result.data !== undefined) {
					const nulls = walkObject(result.data, 'data', operationName);
					for (const n of nulls) {
						detector!.reportNull(n.operationName, n.path);
					}
				}
			}),
		);
	};
}

export function provideNullDetection(): Provider[] {
	return [
		NullDetectionService,
		{
			provide: ENVIRONMENT_INITIALIZER,
			multi: true,
			useFactory: () => {
				const svc = inject(NullDetectionService);
				return () => svc;
			},
		},
	];
}
