import type { GraphqlMiddleware, GraphqlRequestContext } from '@quenetiq/client';
import type { GraphQLResult } from '@quenetiq/client';

export type MockFieldResolver = (typeName: string, fieldName: string) => unknown;

export interface EndpointMockConfig {
	/** Custom mock resolvers per type. */
	mocks?: Record<string, MockFieldResolver>;
	/** Default delay (ms) to simulate network latency. */
	delay?: number;
	/** Passthrough URLs that should not be mocked. */
	passthrough?: string[];
}

const DEFAULT_FIELDS: Record<string, () => unknown> = {
	id: () => 'mock-query-1',
	__typename: () => 'Query',
	name: () => 'Mock Name',
	title: () => 'Mock Title',
	description: () => 'Mock description',
	email: () => 'mock@example.com',
	createdAt: () => new Date().toISOString(),
	updatedAt: () => new Date().toISOString(),
};

function generateMockData(
	typeName: string,
	resolvers?: Record<string, MockFieldResolver>,
): Record<string, unknown> {
	const data: Record<string, unknown> = {};
	const resolver = resolvers?.[typeName];

	for (const [field, generator] of Object.entries(DEFAULT_FIELDS)) {
		data[field] = resolver ? resolver(typeName, field) : generator();
	}

	return data;
}

function extractQueryType(query: string): string {
	const match = query.match(/(?:query|mutation)\s+\w*\s*[^{]*\{\s*(\w+)/);
	return match?.[1] ?? 'Query';
}

/**
 * Schema-aware automatic mock middleware.
 *
 * Intercepts requests and returns typed stub data without hitting the network.
 */
export function endpointMockMiddleware(config?: EndpointMockConfig): GraphqlMiddleware {
	const delay = config?.delay ?? 0;
	const passthrough = new Set(config?.passthrough ?? []);

	return async (request: GraphqlRequestContext, next) => {
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
			await new Promise((resolve) => setTimeout(resolve, delay));
		}

		return result;
	};
}
