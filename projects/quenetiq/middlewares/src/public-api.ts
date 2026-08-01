// Framework-agnostic — no Angular deps
export { authRefreshMiddleware, type AuthRefreshConfig } from './lib/auth-refresh';
export { retryExchange, type RetryExchangeConfig } from './lib/retry-exchange';
export { focusRefetchMiddleware, type FocusRefetchConfig } from './lib/focus-refetch';
export { offlineQueueMiddleware, type OfflineQueueConfig } from './lib/offline-queue';
export { autoMockMiddleware, type AutoMockConfig } from './lib/auto-mock';
export { errorHandlerMiddleware, type ErrorHandlerConfig } from './lib/error-handler';
export { rateLimitMiddleware, type RateLimitConfig } from './lib/rate-limit';
export { dedupMiddleware } from './lib/dedup';
export {
	costEstimationMiddleware,
	estimateQueryCost,
	type CostEstimationConfig,
	type QueryCost,
} from './lib/cost-estimation';
