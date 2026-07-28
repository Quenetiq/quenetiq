// Provider & context
export { QuenetiqProvider, useClient, useCache, type QuenetiqProviderProps } from './lib/provider';

// Mock provider for testing
export { MockedProvider, type MockedProviderProps, type MockRequest } from './lib/mock-provider';

// Hooks
export { useQuery, type UseQueryOptions, type UseQueryResult, type NetworkStatus, type FetchPolicy } from './lib/use-query';
export { useMutation, type UseMutationOptions, type UseMutationResult, type UseMutationFn } from './lib/use-mutation';
export { useSubscription, type UseSubscriptionOptions, type UseSubscriptionResult } from './lib/use-subscription';
export { useLiveQuery, type UseLiveQueryOptions, type UseLiveQueryResult } from './lib/use-live-query';
export { useSuspenseQuery, useBackgroundQuery, useReadQuery, type QueryRef } from './lib/use-suspense-query';
export { useFragment, type UseFragmentResult } from './lib/use-fragment';
export { useLazyQuery, type UseLazyQueryOptions, type UseLazyQueryResult } from './lib/use-lazy-query';
export { useInfiniteQuery, type UseInfiniteQueryOptions, type UseInfiniteQueryResult } from './lib/use-infinite-query';
export { usePrefetch } from './lib/use-prefetch';
export { useStreamQuery, type UseStreamQueryOptions, type UseStreamQueryResult, type StreamStatus } from './lib/use-stream-query';
export { usePartialQuery, type UsePartialQueryOptions, type UsePartialQueryResult } from './lib/use-partial-query';
export { useWriteQuery, useWriteFragment, mutationCachePolicy } from './lib/use-write-cache';
export { useCacheEntity, type UseCacheEntityOptions, type UseCacheEntityResult } from './lib/use-cache-entity';
export { RateLimitGate, type RateLimitGateProps } from './lib/rate-limit-gate';

// Components (render props)
export { Query, type QueryProps } from './lib/query';
export { Mutation, type MutationProps } from './lib/mutation';
export { Subscription, type SubscriptionProps } from './lib/subscription';

// Re-exports for convenience
export {
	gql,
	isSuccess,
	isError,
	unwrap,
	unwrapOrThrow,
	mapResult,
	hasPartialErrors,
	getGraphQLErrors,
	getNetworkError,
	type GraphQLResult,
} from '@quenetiq/client';
export { type CacheStore } from '@quenetiq/cache';

// Epic Fetus & Null Overlay
export { useEpicFetus, type NullDetectionInfo } from './lib/use-epic-fetus';
export { NullOverlay } from './lib/null-overlay';

// Val
export { useVal, type ReactVal } from './lib/use-val';

// Loading Components
export { Spinner, type SpinnerProps, type SpinnerSize, type SpinnerColor } from './lib/spinner';
export { Skeleton, type SkeletonProps, type SkeletonVariant, type SkeletonAnimation } from './lib/skeleton';
export { Progress, type ProgressProps, type ProgressColor, type ProgressSize } from './lib/progress';
export { Dots, type DotsProps, type DotsSize, type DotsColor } from './lib/dots';

// Global config provider
export {
	QuenetiqConfigProvider,
	useGlobalClient,
	useGlobalCache,
	useGlobalConfig,
	mapGlobalConfigToClientConfig,
	mapGlobalConfigToCacheConfig,
	type QuenetiqConfigProviderProps,
	type QuenetiqGlobalConfig,
	type DebugConfig,
	type PaginationConfig,
	type UploadConfig,
	type SsrConfig,
	type TestingConfig,
	type TelemetryConfig,
	type DevtoolsConfig as ReactDevtoolsConfig,
	type FeatureConfig as ReactFeatureConfig,
	type QuenetiqPlugin as ReactQuenetiqPlugin,
} from './lib/quenetiq-config-provider';

// Client directive
export { clientDirectiveMiddleware, setVar, resolveVar } from './lib/client-directive-middleware';

// Endpoint discovery & mock
export { discoverEndpoints, type DiscoveryResult, type EndpointDefinition } from './lib/endpoint-discovery';
export { endpointMockMiddleware, type EndpointMockConfig, type MockFieldResolver } from './lib/endpoint-mock-middleware';

// DevTools
export { DevToolsPanel, type DevToolsPanelProps } from './lib/devtools-panel';

// SSR
export {
	getDataFromTree,
	renderToStringWithData,
	extractSSRData,
	type SSRContext,
} from './lib/ssr/get-data-from-tree';
export { hydrateSSRData, readSSRData, clearSSRData } from './lib/ssr/hydrate';
