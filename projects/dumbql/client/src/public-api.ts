export { DumbqlClient, createClient, type ClientConfig as DumbqlClientConfig, type QueryOptions, type InferData, type InferVars } from './lib/client';
export type { GraphQLResult, GraphQLResponse, GraphQLError, NetworkErrorInfo, ErrorCode } from './lib/result';
export { gql, type DocumentNode, type TypedDocumentNode, print } from './lib/gql';
export {
	isSuccess,
	isError,
	unwrap,
	unwrapOrThrow,
	mapResult,
	hasPartialErrors,
	getGraphQLErrors,
	getNetworkError,
} from './lib/helpers';
export {
	buildTypedPipeline,
	authMiddleware,
	loggingMiddleware,
	type GraphqlRequestContext,
	type GraphqlMiddleware,
	type GraphqlMiddlewareNext,
	type FetchPolicy,
} from './lib/middleware';
export type {
	ClientConfig,
	CacheConfig,
	SubscriptionsConfig,
	PersistedQueriesConfig,
	RetryExchangeConfig,
	MiddlewareConfig,
} from './lib/config';

export { Val } from './lib/ref';
export {
	walkObject,
	extractOpName,
	nullDetectionMiddleware,
	type NullDetectionEvent,
	type NullValueInfo,
	type QueryErrorInfo,
} from './lib/null-detection';
