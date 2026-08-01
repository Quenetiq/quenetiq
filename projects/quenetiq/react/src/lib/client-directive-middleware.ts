import type { GraphqlMiddleware } from '@quenetiq/client';
import type { GraphQLResult } from '@quenetiq/client';

const CLIENT_DIRECTIVE_RE = /@client\b/g;
const CLIENT_FIELD_RE = /(\w+)\s*@client/g;

/**
 * Detect if every selection field in the query has `@client`.
 * Collects all `@client` field names, then strips them from the cleaned query.
 * If only structural tokens remain, it's client-only.
 */
function isAllClientFields(query: string): boolean {
	const clientFieldNames: string[] = [];
	let m: RegExpExecArray | null;
	CLIENT_FIELD_RE.lastIndex = 0;
	while ((m = CLIENT_FIELD_RE.exec(query)) !== null) {
		clientFieldNames.push(m[1]);
	}
	if (clientFieldNames.length === 0) return false;

	const cleaned = query.replace(CLIENT_DIRECTIVE_RE, '');
	let skeleton = cleaned;
	for (const name of clientFieldNames) {
		skeleton = skeleton.replace(new RegExp(`\\b${name}\\b`, 'g'), '');
	}
	skeleton = skeleton
		.replace(/[{}():]/g, '')
		.replace(/\b(query|mutation|subscription)\b/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return skeleton.length === 0;
}

const globalVars = new Map<string, unknown>();

export function setVar(name: string, value: unknown): void {
	globalVars.set(name, value);
}

export function resolveVar(name: string): unknown {
	return globalVars.get(name);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function resolveLocalFields(query: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	CLIENT_FIELD_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = CLIENT_FIELD_RE.exec(query)) !== null) {
		const fieldName = match[1];
		result[fieldName] = resolveVar(fieldName);
	}
	return result;
}

/**
 * Middleware that intercepts `@client` fields.
 *
 * - If a query ONLY has `@client` fields, skips the network entirely.
 * - If mixed `@client` + server fields, strips `@client` from the network
 *   request and patches them into the result.
 */
export function clientDirectiveMiddleware(): GraphqlMiddleware {
	return async (request, next) => {
		if (!request.query.includes('@client')) {
			return next(request);
		}

		const cleanedQuery = request.query.replace(CLIENT_DIRECTIVE_RE, '').trim();
		const hasOnlyClientFields = isAllClientFields(request.query);

		if (hasOnlyClientFields) {
			const clientOnlyResult: GraphQLResult<Record<string, unknown>> = {
				status: 'success',
				data: resolveLocalFields(request.query),
			};
			return clientOnlyResult;
		}

		const result = await next({ ...request, query: cleanedQuery });

		if (result.status === 'error') return result;

		const mergedResult: GraphQLResult<Record<string, unknown>> = {
			status: 'success',
			data: {
				...(isRecord(result.data) ? result.data : {}),
				...resolveLocalFields(request.query),
			},
		};
		return mergedResult;
	};
}
