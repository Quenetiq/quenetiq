export { createDumbqlPlugin, useClient, DUMBQL_CLIENT_KEY } from './lib/plugin';
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
export { gql, isSuccess, isError, unwrap, unwrapOrThrow } from '@dumbql/client';
export { useEpicFetus, type NullDetectionInfo } from './lib/use-epic-fetus';
export { NullOverlay } from './lib/null-overlay';

export { useFragment, type UseFragmentResult } from './lib/use-fragment';
export { usePrefetch } from './lib/use-prefetch';
export { useInfiniteQuery, type UseInfiniteQueryOptions, type UseInfiniteQueryResult } from './lib/use-infinite-query';
export { RateLimitGate, type RateLimitGateProps } from './lib/rate-limit-gate';
export { useVal, type VueVal } from './lib/use-val';
export { registerDirectives } from './lib/directives';

export { default as DumbqlSpinner } from './lib/spinner.vue';
export { default as DumbqlSkeleton } from './lib/skeleton.vue';
export { default as DumbqlProgress } from './lib/progress.vue';
export { default as DumbqlDots } from './lib/dots.vue';

export { useReactiveQuery, type UseReactiveQueryOptions, type UseReactiveQueryResult, type UseReactiveQueryState } from './lib/use-reactive-query';
export { useReactiveMutation, type UseReactiveMutationOptions, type UseReactiveMutationResult, type UseReactiveMutationState, type UseReactiveMutationFn } from './lib/use-reactive-mutation';
export { useReactiveSubscription, type UseReactiveSubscriptionOptions, type UseReactiveSubscriptionResult, type UseReactiveSubscriptionState } from './lib/use-reactive-subscription';
export { useReactiveLiveQuery, type UseReactiveLiveQueryOptions, type UseReactiveLiveQueryResult, type UseReactiveLiveQueryState } from './lib/use-reactive-live-query';
export { useReactiveFragment, type UseReactiveFragmentResult } from './lib/use-reactive-fragment';
