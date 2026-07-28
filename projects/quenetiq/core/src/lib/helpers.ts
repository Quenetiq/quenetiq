import type { GraphQLResult, GraphQLError, NetworkErrorInfo } from './graphql.service';

export function isSuccess<T>(result: GraphQLResult<T>): result is { status: 'success'; data: T } {
	return result.status === 'success';
}

export function isError<T>(result: GraphQLResult<T>): result is Extract<GraphQLResult<T>, { status: 'error' }> {
	return result.status === 'error';
}

export function unwrap<T>(result: GraphQLResult<T>): T | null {
	if (result.status === 'success') return result.data;
	return null;
}

export function unwrapOrThrow<T>(result: GraphQLResult<T>): T {
	if (result.status === 'error') throw new Error(result.error);
	return result.data;
}

export function mapResult<T, U>(result: GraphQLResult<T>, fn: (data: T) => U): GraphQLResult<U> {
	if (result.status === 'error') return result as unknown as GraphQLResult<U>;
	return { status: 'success', data: fn(result.data) };
}

export function hasPartialErrors<T>(result: GraphQLResult<T>): boolean {
	return result.status === 'success' && !!result.graphQLErrors?.length;
}

export function getGraphQLErrors<T>(result: GraphQLResult<T>): GraphQLError[] {
	if (result.status === 'success') return result.graphQLErrors ?? [];
	return result.graphQLErrors ?? [];
}

export function getNetworkError<T>(result: GraphQLResult<T>): NetworkErrorInfo | undefined {
	if (result.status === 'error') return result.networkError;
	return undefined;
}
