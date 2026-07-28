import type { GraphqlMiddleware, GraphqlRequestContext } from './middleware';
import type { GraphQLResult } from './graphql.service';
import { Observable, of } from 'rxjs';

export type MockFieldResolver = (typeName: string, fieldName: string) => unknown;

export interface EndpointMockConfig {
	/** Schema SDL string or parsed types map. */
	schema?: string;
	/** Custom mock resolvers per type. */
	mocks?: Record<string, MockFieldResolver>;
	/** Default delay (ms) to simulate network latency. */
	delay?: number;
	/** Passthrough URLs that should not be mocked. */
	passthrough?: string[];
}

function generateMockData(
	typeName: string,
	resolvers?: Record<string, MockFieldResolver>,
): Record<string, unknown> {
	const data: Record<string, unknown> = {};
	const resolver = resolvers?.[typeName];

	const defaultFields: Record<string, () => unknown> = {
		id: () => `mock-${typeName.toLowerCase()}-1`,
		__typename: () => typeName,
		name: () => `Mock ${typeName}`,
		title: () => 'Mock Title',
		description: () => 'Mock description',
		email: () => 'mock@example.com',
		createdAt: () => new Date().toISOString(),
		updatedAt: () => new Date().toISOString(),
	};

	for (const [field, generator] of Object.entries(defaultFields)) {
		data[field] = resolver ? resolver(typeName, field) : generator();
	}

	return data;
}

function extractQueryType(query: string): string {
	const match = query.match(/(?:query|mutation)\s+\w*\s*[^{]*\{\s*(\w+)/);
	return match?.[1] ?? 'Query';
}

/**
 * Schema-aware automatic mock middleware for endpoints with `mock: true`.
 *
 * Intercepts requests and returns typed stub data without hitting the network.
 */
export function endpointMockMiddleware(config?: EndpointMockConfig): GraphqlMiddleware {
	const delay = config?.delay ?? 0;
	const passthrough = new Set(config?.passthrough ?? []);

	return (
		request: GraphqlRequestContext,
		next: (req: GraphqlRequestContext) => Observable<GraphQLResult<unknown>>,
	) => {
		if (request.endpoint && passthrough.has(request.endpoint)) {
			return next(request);
		}

		const typeName = extractQueryType(request.query);
		const mockData = generateMockData(typeName, config?.mocks);

		const result: GraphQLResult<unknown> = {
			status: 'success',
			data: mockData,
		};

		if (delay > 0) {
			return new Observable<GraphQLResult<unknown>>((subscriber) => {
				const timer = setTimeout(() => {
					subscriber.next(result);
					subscriber.complete();
				}, delay);
				return () => clearTimeout(timer);
			});
		}

		return of(result);
	};
}
