export { type QuenetiqConfig, type GraphqlConfig } from './lib/graphql-config';
export type {
	GraphqlCoreConfig,
	SubscriptionsConfig,
	CacheConfig,
	PersistedQueriesConfig,
	UploadConfig,
	DebugConfig,
	PaginationConfig,
	SsrConfig,
	TestingConfig,
	CodegenConfig,
	TelemetryConfig,
	ReactiveQuenetiqConfig,
	FeatureConfig,
} from './lib/quenetiq-config';
export { QuenetiqConfigService, validateQuenetiqConfig, type ConfigValidationError } from './lib/config.service';
export { quenetiqConfig, provideQuenetiq, provideQuenetiqFeature } from './lib/provider';
export {
	QUENETIQ_CONFIG,
	GRAPHQL_CONFIG,
	GRAPHQL_CACHE,
	REACTIVE_QUENETIQ_CONFIG,
	FEATURE_CONFIGS,
	defineConfig,
	defineEndpointsConfig,
	type GraphqlCacheLike,
} from './lib/quenetiq-config';
export type { OnErrorServiceConfig, SchemaConfig, QuenetiqPlugin } from './lib/quenetiq-config';
export {
	GraphqlService,
	type GraphQLResult,
	type GraphQLResponse,
	type ErrorCode,
	type ErrorPolicy,
	type RequestOverrideConfig,
	type RefetchQueryDef,
} from './lib/graphql.service';
export { gql, print, createTypedQuery } from './lib/gql';
export type { DocumentNode, TypedDocumentNode, TypedQueryString, FragmentRef } from './lib/gql';
export { query, type QueryHandle, type EndpointParam } from './lib/query';
export {
	GraphqlEndpoint,
	provideEndpoint,
	injectEndpoint,
	type MutateEndpointOptions,
} from './lib/endpoint';
export { mutate, type MutateOptions, type MutateEndpointParam } from './lib/mutate';
export {
	provideMultiEndpoint,
	provideMultiEndpointWithLifecycle,
	provideSingleEndpoint,
	EndpointsService,
	IS_MULTI_ENDPOINT,
	ENDPOINTS_YAML,
	ENDPOINT_LIFECYCLE,
	type EndpointLifecycleHook,
	type HealthCheckResult,
} from './lib/endpoints.service';
export {
	type EndpointRoute,
	type EndpointGroup,
	type EndpointsYaml,
	parseEndpointsYaml,
	validateEndpointsYaml,
	generateEndpointsYamlTemplate,
	resolveHeaderEnvVars,
	registerTransformError,
	resolveTransformError,
} from './lib/endpoints-config';
export {
	buildMultiEndpointConfig,
	buildSingleEndpointConfig,
	type EndpointProviderDescriptor,
	type MultiEndpointProviderResult,
} from './lib/endpoints-providers';
export { refetch } from './lib/refetch';
export { poll } from './lib/poll';
export { injectPrefetch } from './lib/prefetch';
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
	GqlPipe,
	GraphqlDataPipe,
	GraphqlErrorPipe,
	GraphqlStatusPipe,
	GraphqlIsSuccessPipe,
	GraphqlIsErrorPipe,
	GraphqlUnwrapPipe,
} from './lib/pipes';

export { QuenetiqQueryDirective, QuenetiqAutoFetchDirective } from './lib/directives';
export type { QuenetiqQueryContext } from './lib/directives';
export {
	applyMiddleware,
	authMiddleware,
	devAuthMiddleware,
	loggingMiddleware,
	hasFiles,
} from './lib/middleware';

export type { GraphqlRequestContext, GraphqlMiddlewareNext, GraphqlMiddleware } from './lib/middleware';

export {
	DevtoolsService,
	provideDevtools,
	devtoolsMiddleware,
	type DevtoolsConfig,
	type SchemaDownloadConfig,
} from './lib/devtools';

export { SchemaService, provideSchemaFetch, type SchemaServiceConfig } from './lib/schema.service';
export {
	SchemaWatchService,
	provideSchemaWatch,
	type SchemaChangedEvent,
	type SchemaErrorEvent,
} from './lib/schema-watch';
export { SchemaStreamService, type SchemaProgressEvent, type SchemaStreamConfig } from './lib/schema-stream';

export { provideQuenetiqRouter, guardedRoute, canActivateWithGuards, type QuenetiqRouteGuard } from './lib/quenetiq-router';

export { mutationCachePolicy, provideAutoRefetch, AutoRefetchService } from './lib/auto-refetch';
export { cacheMiddleware, cacheSnapshot, clearCacheByEndpoint } from './lib/cache-middleware';

export { SCHEMA_SERVICE_CONFIG } from './lib/schema.service';

export { DEVTOLS_CONFIG } from './lib/devtools';
export { NullDetectionService, type NullDetectionEvent } from './lib/null-detection.service';
export { nullDetectionMiddleware, provideNullDetection } from './lib/null-detection';
export { NullCheckerService, provideNullChecker } from './lib/null-checker';
export { NullOverlay } from './lib/null-overlay';

export { makeVar, ReactiveVar } from './lib/reactive-vars';
export { clientDirectiveMiddleware } from './lib/client-directive';
export { graphqlResource, type GraphqlResourceOptions } from './lib/resource';
export {
	streamingMiddleware,
	applyPatch,
	applyStreamItems,
	parseMultipartResponse,
	type IncrementalPayload,
	type IncrementalResponse,
} from './lib/streaming';

export { createVal, type AngularVal } from './lib/ref';

// ─── Loading Components ─────────────────────────────────────────────────────
export { QuenetiqSpinnerComponent, type SpinnerSize, type SpinnerColor } from './lib/spinner.component';
export { QuenetiqSkeletonComponent, type SkeletonVariant, type SkeletonAnimation } from './lib/skeleton.component';
export { QuenetiqProgressComponent, type ProgressColor, type ProgressSize } from './lib/progress.component';
export { QuenetiqDotsComponent, type DotsSize, type DotsColor } from './lib/dots.component';

// ─── Abort Controller ───────────────────────────────────────────────────────
export { abortQuery, type AbortQueryHandle, type AbortQueryOptions } from './lib/abort-query';

// ─── Refetch Interval ───────────────────────────────────────────────────────
export { refetchInterval, type RefetchIntervalHandle, type RefetchIntervalOptions } from './lib/refetch-interval';

// ─── Inject Composables ─────────────────────────────────────────────────────
export { type QuenetiqInjectOptions } from './lib/inject-options';
export { injectQuery, type InjectQueryHandle, type InjectQueryOptions } from './lib/inject-query';
export { injectMutation, type InjectMutationHandle, type InjectMutationOptions } from './lib/inject-mutation';

// ─── Skip / Conditional Queries ─────────────────────────────────────────────
export { skipQuery, type SkipQueryHandle, type SkipQueryOptions } from './lib/skip-conditional';

// ─── Cache Write Operations ─────────────────────────────────────────────────
export { injectWriteQuery, injectWriteFragment } from './lib/write-cache';

// ─── Glob Invalidation ──────────────────────────────────────────────────────
export { injectGlobInvalidation } from './lib/glob-invalidation';

// ─── Response Diff Logging ──────────────────────────────────────────────────
export { responseDiffLogging, type DiffEntry } from './lib/response-diff';

// ─── Mutation Batching ──────────────────────────────────────────────────────
export { MutationBatchService, type MutationBatchConfig } from './lib/mutation-batching';

// ─── Partial / Resumable Queries ──────────────────────────────────────────
export {
	injectPartialQuery,
	clearPartitionCache,
	type QueryPartition,
	type PartitionResult,
	type PartitionStatus,
	type PartialQueryHandle,
	type PartialQueryOptions,
} from './lib/partial-query';

// ─── Multi-endpoint features ────────────────────────────────────────────────
export { UseEndpoint, createEndpointResolver, validateGroupRoutes } from './lib/use-endpoint';
export { EndpointDiscoveryService, type DiscoveryResult } from './lib/endpoint-discovery';
export { endpointMockMiddleware, type EndpointMockConfig, type MockFieldResolver } from './lib/endpoint-mock';
export { resolveSubscriptionUrl, subscribeTo } from './lib/subscribe-multi';

export type {
	InferResultData,
	InferResultError,
	IsSuccess,
	InferSuccessData,
	InferResponse,
	InferVariables,
	InferDocument,
	InferQueryData,
	InferQuerySignals,
	InferEndpointNames,
	InferEndpointRoute,
	InferEndpointUrl,
	InferEndpointHeaders,
	InferMiddleware,
	InferMiddlewareRequest,
	InferObservableData,
	DeepPartial,
	RequiredKeys,
	PartialExcept,
} from './lib/types';
