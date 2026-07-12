// Provider & context
export { DumbqlProvider, useClient, useCache, type DumbqlProviderProps } from './lib/provider';

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
export { RateLimitGate, type RateLimitGateProps } from './lib/rate-limit-gate';

// Components (render props)
export { Query, type QueryProps } from './lib/query';
export { Mutation, type MutationProps } from './lib/mutation';
export { Subscription, type SubscriptionProps } from './lib/subscription';

// Re-exports for convenience
export { gql, isSuccess, isError, unwrap, unwrapOrThrow, type GraphQLResult } from '@dumbql/client';
export { type CacheStore } from '@dumbql/cache';

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
