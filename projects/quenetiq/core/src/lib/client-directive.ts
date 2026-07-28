import { of, map } from 'rxjs';
import type { GraphqlMiddleware } from './middleware';
import type { GraphQLResult } from './graphql.service';

const CLIENT_DIRECTIVE_RE = /@client\b/g;
const CLIENT_FIELD_RE = /(\w+)\s*@client/g;

/**
 * Middleware that intercepts @client fields.
 * When a query ONLY has @client fields, it skips the network entirely.
 * When it has mixed @client + server fields, it strips @client fields
 * from the request and patches them into the result.
 */
export function clientDirectiveMiddleware(): GraphqlMiddleware {
	return (request, next) => {
		if (!request.query.includes('@client')) {
			return next(request);
		}

		const cleanedQuery = request.query.replace(CLIENT_DIRECTIVE_RE, '').trim();
		const hasOnlyClientFields =
			!cleanedQuery ||
			cleanedQuery === '' ||
			cleanedQuery === 'query' ||
			cleanedQuery === 'mutation' ||
			cleanedQuery === '{' ||
			cleanedQuery === '}' ||
			/^\s*\{\s*\}\s*$/.test(cleanedQuery);

		if (hasOnlyClientFields) {
			return of<GraphQLResult<Record<string, unknown>>>({
				status: 'success',
				data: resolveLocalFields(request.query),
			});
		}

		return next({ ...request, query: cleanedQuery }).pipe(
			map((result): GraphQLResult<Record<string, unknown>> => {
				if (result.status === 'error') return result;
				return {
					status: 'success',
					data: {
						...(isRecord(result.data) ? result.data : {}),
						...resolveLocalFields(request.query),
					},
				};
			}),
		);
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const globalVars = new Map<string, unknown>();

export function setVar(name: string, value: unknown): void {
	globalVars.set(name, value);
}

export function resolveVar(name: string): unknown {
	return globalVars.get(name);
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
