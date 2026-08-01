import type { GraphqlMiddleware } from './middleware';

const EXT_SOURCE = 'dumb-keystore-graphql-debug';

function isNonNullObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface NullValueInfo {
	type: 'null-value';
	path: string;
	operationName?: string;
}

export interface QueryErrorInfo {
	type: 'query-error';
	message: string;
	operationName?: string;
}

export type NullDetectionEvent = NullValueInfo | QueryErrorInfo;

function emit(event: NullDetectionEvent): void {
	if (typeof window === 'undefined') return;
	window.postMessage({ source: EXT_SOURCE, type: 'null-detection', payload: event }, '*');
}

export function walkObject<T>(obj: T, path: string, operationName?: string): NullValueInfo[] {
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
		if (isNonNullObject(value)) {
			for (const [key, v] of Object.entries(value)) {
				walk(v, `${currentPath}.${key}`);
			}
		}
	}

	walk(obj, path);
	return results;
}

export function extractOpName(queryStr: string): string | undefined {
	const m = queryStr.match(/(?:query|mutation|subscription)\s+(\w+)/i);
	return m?.[1] ?? undefined;
}

export function nullDetectionMiddleware(): GraphqlMiddleware {
	return async (request, next) => {
		const result = await next(request);

		const opName = extractOpName(request.query);

		if (result.status === 'error') {
			emit({ type: 'query-error', message: result.error, operationName: opName });
			return result;
		}

		if (result.status === 'success' && result.data !== null && result.data !== undefined) {
			const nulls = walkObject(result.data, 'data', opName);
			if (nulls.length > 0) {
				emit(nulls[0]);
			}
		}

		return result;
	};
}
