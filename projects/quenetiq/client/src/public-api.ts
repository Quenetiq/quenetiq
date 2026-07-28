export { QuenetiqClient, createClient, type ClientConfig as QuenetiqClientConfig, type QueryOptions, type MutateOptions, type InferData, type InferVars } from './lib/client';
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

// Schema-aware mock engine for testing
export {
	createSchemaMock,
	createSchemaFromIntrospection,
	type SchemaMockOptions,
	type SchemaMockResult,
} from './lib/schema-mock';
export type {
	ClientConfig,
	CacheConfig,
	SubscriptionsConfig,
	PersistedQueriesConfig,
	RetryExchangeConfig,
	MiddlewareConfig,
	ClientDirectivesConfig,
	EndpointDiscoveryConfig,
	EndpointMockConfig,
	StreamingConfig,
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

export { devToolsMiddleware, type DevToolsConfig, type QueryLogEntry, type DevToolsState } from './lib/devtools';

export {
	createPartialQueryEngine,
	getCachedPartition,
	setCachedPartition,
	clearPartitionCache,
	type QueryPartition,
	type PartitionStatus,
	type PartitionResult,
	type PartialQueryState,
	type PartialQueryEngine,
} from './lib/partial-query';
