import { ref, watch, type Ref } from 'vue';
import { useClient } from './plugin';
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
	data: Ref<Record<string, unknown>>;
	loading: Ref<boolean>;
	error: Ref<string | null>;
	partitions: Ref<Record<string, PartitionResult>>;
	isPartial: Ref<boolean>;
	isComplete: Ref<boolean>;
	resume: () => Promise<void>;
	refetch: () => Promise<void>;
}

/**
 * Resumable partial query that executes partitions independently,
 * caches each one, and resumes only failed partitions on network recovery.
 *
 * @example
 * ```ts
 * const { data, loading, partitions, resume, isPartial } = usePartialQuery([
 *   { name: 'user', query: gql`{ user { name email } }` },
 *   { name: 'posts', query: gql`{ posts { title } }` },
 *   { name: 'notifications', query: gql`{ notifications { message } }` },
 * ], { variables: { userId: '1' } });
 *
 * // If 'posts' failed: partitions.value.posts.status === 'error'
 * // resume() re-fetches only 'posts' and 'notifications'
 * ```
 */
export function usePartialQuery(
	partitions: QueryPartition[],
	options?: UsePartialQueryOptions,
): UsePartialQueryResult {
	const client = useClient();

	const data = ref<Record<string, unknown>>({});
	const loading = ref(false);
	const error = ref<string | null>(null);
	const partitionsResult = ref<Record<string, PartitionResult>>({});
	const isPartial = ref(false);
	const isComplete = ref(false);

	let engine: ReturnType<typeof createPartialQueryEngine> | null = null;

	function createEngine() {
		engine = createPartialQueryEngine(client, partitions, {
			fetchPolicy: options?.fetchPolicy,
			onPartitionComplete: options?.onPartitionComplete,
			onPartitionError: options?.onPartitionError,
			onStateChange: (newState: PartialQueryState) => {
				data.value = { ...newState.data };
				loading.value = newState.loading;
				error.value = newState.error;
				partitionsResult.value = { ...newState.partitions };
				isPartial.value = newState.isPartial;
				isComplete.value = newState.isComplete;
			},
		});
	}

	createEngine();
	engine.execute(options?.variables);

	watch(
		() => JSON.stringify(options?.variables ?? {}),
		() => {
			createEngine();
			engine!.execute(options?.variables);
		},
	);

	const resume = async () => {
		if (engine) {
			await engine.resume(options?.variables);
		}
	};

	const refetch = async () => {
		if (engine) {
			await engine.execute(options?.variables);
		}
	};

	return { data, loading, error, partitions: partitionsResult, isPartial, isComplete, resume, refetch };
}
