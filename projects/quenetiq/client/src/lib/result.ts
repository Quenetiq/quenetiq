export interface GraphQLError {
	message: string;
	locations?: { line: number; column: number }[];
	path?: (string | number)[];
	extensions?: Record<string, unknown>;
}

export interface NetworkErrorInfo {
	message: string;
	status?: number;
	statusText?: string;
}

export type ErrorCode = 'NO_DATA' | 'GRAPHQL_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN';

export type GraphQLResult<T> =
	| { status: 'success'; data: T; graphQLErrors?: GraphQLError[] }
	| {
			status: 'error';
			error: string;
			errorCode?: ErrorCode;
			graphQLErrors?: GraphQLError[];
			networkError?: NetworkErrorInfo;
	  };

export interface GraphQLResponse<T> {
	data?: T;
	errors?: { message: string; extensions?: Record<string, unknown> }[];
}

export interface CacheMeta {
	fromCache: boolean;
	cachedAt: number;
	entityKeys: string[];
}

export type GraphQLResultWithCache<T> = GraphQLResult<T> & CacheMeta;

export function resultError<T>(
	error: string,
	errorCode?: ErrorCode,
): GraphQLResult<T> {
	return { status: 'error', error, errorCode };
}

export function resultSuccess<T>(data: T): GraphQLResult<T> {
	return { status: 'success', data };
}

export function hasNextPage(response: unknown): boolean {
	if (typeof response !== 'object' || response === null || !('hasNext' in response)) return false;
	return response['hasNext'] === true;
}
