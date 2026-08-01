import { QuenetiqError } from './base';
import { GraphQLError } from './graphql';
import { NetworkError } from './network';
import { CacheError } from './cache';
import { ValidationError } from './validation';

/**
 * Type guard that checks if an error is a GraphQL error.
 *
 * @example
 * ```typescript
 * if (isGraphQLError(err)) {
 *   console.error(err.extensions?.code);
 * }
 * ```
 */
export function isGraphQLError(error: unknown): error is GraphQLError {
	return error instanceof GraphQLError;
}

/**
 * Type guard that checks if an error is a network error.
 *
 * @example
 * ```typescript
 * if (isNetworkError(err)) {
 *   console.error('Network failure:', err.message);
 * }
 * ```
 */
export function isNetworkError(error: unknown): error is NetworkError {
	return error instanceof NetworkError;
}

/**
 * Type guard that checks if an error is a cache error.
 *
 * @example
 * ```typescript
 * if (isCacheError(err)) {
 *   console.error('Cache operation failed:', err.message);
 * }
 * ```
 */
export function isCacheError(error: unknown): error is CacheError {
	return error instanceof CacheError;
}

/**
 * Type guard that checks if an error is a validation error.
 *
 * @example
 * ```typescript
 * if (isValidationError(err)) {
 *   console.error('Validation failed:', err.message);
 * }
 * ```
 */
export function isValidationError(error: unknown): error is ValidationError {
	return error instanceof ValidationError;
}

/**
 * Type guard that checks if an error is a QuenetiqError (base class).
 *
 * @example
 * ```typescript
 * if (isQuenetiqError(err)) {
 *   console.error(err.code, err.timestamp);
 * }
 * ```
 */
export function isQuenetiqError(error: unknown): error is QuenetiqError {
	return error instanceof QuenetiqError;
}

/**
 * Returns a user-facing error message without leaking internal details.
 *
 * @example
 * ```typescript
 * try {
 *   await client.query(MY_QUERY);
 * } catch (err) {
 *   const message = getUserFacingMessage(err);
 *   showErrorToast(message);
 * }
 * ```
 */
export function getUserFacingMessage(error: unknown): string {
	if (isGraphQLError(error)) {
		return error.message;
	}
	if (isNetworkError(error)) {
		if (error.statusCode === 0) {
			return 'Network connection failed. Please check your internet connection.';
		}
		if (error.statusCode && error.statusCode >= 500) {
			return 'Server error. Please try again later.';
		}
		return error.message;
	}
	if (isValidationError(error)) {
		return 'Invalid request. Please check your input.';
	}
	if (isCacheError(error)) {
		return 'Data caching error. Please refresh the page.';
	}
	if (isQuenetiqError(error)) {
		return error.message;
	}
	if (error instanceof Error) {
		return 'An unexpected error occurred.';
	}
	return 'An unexpected error occurred.';
}
