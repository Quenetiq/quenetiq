import { useState, useEffect, useCallback, useRef } from 'react';
import { useClient } from './provider';
import {
	createPartialQueryEngine,
	type QueryPartition,
	type PartialQueryState,
	type PartitionResult,
} from '@quenetiq/client';

export type { QueryPartition, PartitionResult };

export interface UsePartialQueryOptions {
	variables?: Record<string, unknown>;
	fetchPolicy?: 'cache-first' | 'network-only' | 'cache-and-network' | 'no-cache';
	onPartitionComplete?: (name: string, data: unknown) => void;
	onPartitionError?: (name: string, error: string) => void;
}

export interface UsePartialQueryResult {
	data: Record<string, unknown>;
	loading: boolean;
	error: string | null;
	partitions: Record<string, PartitionResult>;
	isPartial: boolean;
	isComplete: boolean;
	resume: () => Promise<void>;
	refetch: () => Promise<void>;
}

/**
 * Resumable partial query that executes partitions independently,
 * caches each one, and resumes only failed partitions on network recovery.
 *
 * @example
 * ```tsx
 * const { data, loading, partitions, resume, isPartial } = usePartialQuery({
 *   partitions: [
 *     { name: 'user', query: gql`{ user { name email } }` },
 *     { name: 'posts', query: gql`{ posts { title } }` },
 *     { name: 'notifications', query: gql`{ notifications { message } }` },
 *   ],
 *   variables: { userId: '1' },
 * });
 *
 * // data = { user: {...}, posts: {...}, notifications: {...} }
 * // If 'posts' failed, partitions.posts.status === 'error'
 * // resume() re-fetches only 'posts' and 'notifications'
 * ```
 */
export function usePartialQuery(
	partitions: QueryPartition[],
	options?: UsePartialQueryOptions,
): UsePartialQueryResult {
	const client = useClient();

	const [state, setState] = useState<PartialQueryState>({
		data: {},
		loading: false,
		error: null,
		partitions: {},
		isPartial: false,
		isComplete: false,
	});

	const engineRef = useRef<ReturnType<typeof createPartialQueryEngine> | null>(null);

	useEffect(() => {
		const engine = createPartialQueryEngine(client, partitions, {
			fetchPolicy: options?.fetchPolicy,
			onPartitionComplete: options?.onPartitionComplete,
			onPartitionError: options?.onPartitionError,
			onStateChange: (newState) => {
				setState({ ...newState });
			},
		});
		engineRef.current = engine;

		engine.execute(options?.variables);

		return () => {
			engineRef.current = null;
		};
	}, [client, JSON.stringify(partitions.map((p) => p.name).sort()), JSON.stringify(options?.variables ?? {})]);

	const resume = useCallback(async () => {
		if (engineRef.current) {
			await engineRef.current.resume(options?.variables);
		}
	}, [options?.variables]);

	const refetch = useCallback(async () => {
		if (engineRef.current) {
			await engineRef.current.execute(options?.variables);
		}
	}, [options?.variables]);

	return {
		data: state.data,
		loading: state.loading,
		error: state.error,
		partitions: state.partitions,
		isPartial: state.isPartial,
		isComplete: state.isComplete,
		resume,
		refetch,
	};
}
