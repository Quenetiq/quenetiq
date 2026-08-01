export { createQuenetiqPlugin, useClient, QUENETIQ_CLIENT_KEY } from './lib/plugin';

// Mock provider for testing
export { MockedProvider, type MockRequest } from './lib/mock-provider';
export {
	createQuenetiqConfigPlugin,
	useGlobalClient,
	useGlobalCache,
	useGlobalConfig,
	mapGlobalConfigToClientConfig,
	mapGlobalConfigToCacheConfig,
	QUENETIQ_GLOBAL_CONFIG_KEY,
	type QuenetiqGlobalConfig,
	type DebugConfig,
	type PaginationConfig,
	type UploadConfig,
	type SsrConfig,
	type TestingConfig,
	type TelemetryConfig,
	type DevtoolsConfig as VueDevtoolsConfig,
	type FeatureConfig as VueFeatureConfig,
	type QuenetiqPlugin as VueQuenetiqPlugin,
} from './lib/quenetiq-config-plugin';
export { useQuery, type UseQueryOptions, type UseQueryResult, type NetworkStatus } from './lib/use-query';
export { useMutation, type UseMutationOptions, type UseMutationResult, type UseMutationFn } from './lib/use-mutation';
export { useSubscription, type UseSubscriptionOptions, type UseSubscriptionResult } from './lib/use-subscription';
export { useLiveQuery, type UseLiveQueryOptions, type UseLiveQueryResult } from './lib/use-live-query';
export {
	useSuspenseQuery,
	useBackgroundQuery,
	useReadQuery,
	type UseSuspenseQueryResult,
	type QueryRef,
} from './lib/use-suspense-query';
export { gql, isSuccess, isError, unwrap, unwrapOrThrow, mapResult, hasPartialErrors, getGraphQLErrors, getNetworkError } from '@quenetiq/client';
export { useEpicFetus, type NullDetectionInfo } from './lib/use-epic-fetus';
export { NullOverlay } from './lib/null-overlay';

export { useFragment, type UseFragmentResult } from './lib/use-fragment';
export { usePrefetch } from './lib/use-prefetch';
export { useInfiniteQuery, type UseInfiniteQueryOptions, type UseInfiniteQueryResult } from './lib/use-infinite-query';
export { useLazyQuery, type UseLazyQueryOptions, type UseLazyQueryResult } from './lib/use-lazy-query';
export { useStreamQuery, type UseStreamQueryOptions, type UseStreamQueryResult, type StreamStatus } from './lib/use-stream-query';
export { usePartialQuery, type UsePartialQueryOptions, type UsePartialQueryResult } from './lib/use-partial-query';
export { useWriteQuery, useWriteFragment, mutationCachePolicy } from './lib/use-write-cache';
export { useCacheEntity, type UseCacheEntityOptions, type UseCacheEntityResult } from './lib/use-cache-entity';
export { RateLimitGate, type RateLimitGateProps } from './lib/rate-limit-gate';
export { DevToolsPanel } from './lib/devtools-panel';
export { useVal, type VueVal } from './lib/use-val';
export { clientDirectiveMiddleware, setVar, resolveVar } from './lib/client-directive-middleware';
export { discoverEndpoints, type DiscoveryResult, type EndpointDefinition } from './lib/endpoint-discovery';
export { endpointMockMiddleware, type EndpointMockConfig, type MockFieldResolver } from './lib/endpoint-mock-middleware';
export { registerDirectives } from './lib/directives';

export { default as QuenetiqSpinner } from './lib/spinner.vue';
export { default as QuenetiqSkeleton } from './lib/skeleton.vue';
export { default as QuenetiqProgress } from './lib/progress.vue';
export { default as QuenetiqDots } from './lib/dots.vue';

export { useReactiveQuery, type UseReactiveQueryOptions, type UseReactiveQueryResult, type UseReactiveQueryState } from './lib/use-reactive-query';
export { useReactiveMutation, type UseReactiveMutationOptions, type UseReactiveMutationResult, type UseReactiveMutationState, type UseReactiveMutationFn } from './lib/use-reactive-mutation';
export { useReactiveSubscription, type UseReactiveSubscriptionOptions, type UseReactiveSubscriptionResult, type UseReactiveSubscriptionState } from './lib/use-reactive-subscription';
export { useReactiveLiveQuery, type UseReactiveLiveQueryOptions, type UseReactiveLiveQueryResult, type UseReactiveLiveQueryState } from './lib/use-reactive-live-query';
export { useReactiveFragment, type UseReactiveFragmentResult } from './lib/use-reactive-fragment';
