import type { DocumentNode, TypedDocumentNode, GraphQLResult } from '@quenetiq/client';

// ─── Types ────────────────────────────────────────────────────────────────

export interface QueryPartition<
	TDocument extends DocumentNode | TypedDocumentNode = DocumentNode,
> {
	/** Unique name for this partition. */
	name: string;
	/** The GraphQL sub-query document. */
	document: TDocument;
	/** Variables specific to this partition (merged with top-level variables). */
	variables?: Record<string, unknown>;
	/** Dependencies — partition names that must complete before this one executes. */
	dependsOn?: string[];
}

export type PartitionStatus = 'pending' | 'loading' | 'success' | 'error' | 'cached';

export interface PartitionResult {
	status: PartitionStatus;
	data: unknown;
	error?: string;
}

export interface PartialQueryState {
	/** Merged data from all completed/cached partitions. */
	data: Record<string, unknown>;
	/** Whether any partition is currently loading. */
	loading: boolean;
	/** First error encountered (if any). */
	error: string | null;
	/** Per-partition status map. */
	partitions: Record<string, PartitionResult>;
	/** Whether any partition had to be re-fetched (partial recovery). */
	isPartial: boolean;
	/** Whether all partitions completed successfully. */
	isComplete: boolean;
}

// ─── In-memory partition cache ────────────────────────────────────────────

const partitionCache = new Map<string, unknown>();

function partitionKey(name: string, variables?: Record<string, unknown>): string {
	const vars = variables ? JSON.stringify(variables, Object.keys(variables).sort()) : '{}';
	return `${name}::${vars}`;
}

export function getCachedPartition(name: string, variables?: Record<string, unknown>): unknown | undefined {
	return partitionCache.get(partitionKey(name, variables));
}

export function setCachedPartition(name: string, data: unknown, variables?: Record<string, unknown>): void {
	partitionCache.set(partitionKey(name, variables), data);
}

export function clearPartitionCache(): void {
	partitionCache.clear();
}

// ─── Core engine (framework-agnostic) ────────────────────────────────────

export interface PartialQueryEngine {
	execute(variables?: Record<string, unknown>): Promise<PartialQueryState>;
	resume(variables?: Record<string, unknown>): Promise<PartialQueryState>;
	getState(): PartialQueryState;
	onStateChange(callback: (state: PartialQueryState) => void): () => void;
}

export function createPartialQueryEngine<TClient>(
	client: TClient,
	partitions: QueryPartition[],
	options?: {
		fetchPolicy?: 'cache-first' | 'network-only' | 'cache-and-network' | 'no-cache';
		onPartitionComplete?: (name: string, data: unknown) => void;
		onPartitionError?: (name: string, error: string) => void;
		onStateChange?: (state: PartialQueryState) => void;
	},
): PartialQueryEngine {
	type ClientQuery = (
		doc: DocumentNode | TypedDocumentNode,
		vars?: Record<string, unknown>,
		endpoint?: string,
		opts?: { fetchPolicy?: string; signal?: AbortSignal },
	) => Promise<GraphQLResult<unknown>>;

	const query = (client as unknown as { query: ClientQuery }).query;

	const state: PartialQueryState = {
		data: {},
		loading: false,
		error: null,
		partitions: {},
		isPartial: false,
		isComplete: false,
	};

	const listeners = new Set<(state: PartialQueryState) => void>();
	let aborted = false;

	function notify(): void {
		options?.onStateChange?.(state);
		for (const listener of listeners) {
			listener({ ...state, data: { ...state.data }, partitions: { ...state.partitions } });
		}
	}

	function setPartitionStatus(name: string, status: PartitionStatus, data?: unknown, error?: string): void {
		state.partitions[name] = {
			status,
			data: data ?? state.partitions[name]?.data,
			error,
		};
		if (status === 'success' && data !== undefined) {
			state.data[name] = data;
		}
	}

	function areDependenciesMet(partition: QueryPartition): boolean {
		if (!partition.dependsOn?.length) return true;
		return partition.dependsOn.every((dep) => {
			const depStatus = state.partitions[dep]?.status;
			return depStatus === 'success' || depStatus === 'cached';
		});
	}

	function mergeData(): void {
		for (const name of Object.keys(state.partitions)) {
			const p = state.partitions[name];
			if ((p.status === 'success' || p.status === 'cached') && p.data !== undefined) {
				state.data[name] = p.data;
			}
		}
	}

	async function executePartition(
		partition: QueryPartition,
		vars?: Record<string, unknown>,
	): Promise<void> {
		const mergedVars = { ...vars, ...partition.variables };

		// Check in-memory cache first
		const cached = getCachedPartition(partition.name, mergedVars);
		if (cached !== undefined && options?.fetchPolicy !== 'network-only') {
			setPartitionStatus(partition.name, 'cached', cached);
			options?.onPartitionComplete?.(partition.name, cached);
			return;
		}

		setPartitionStatus(partition.name, 'loading');

		try {
			const result = await query(partition.document, mergedVars, undefined, {
				fetchPolicy: options?.fetchPolicy,
			});

			if (aborted) return;

			if (result.status === 'success') {
				setPartitionStatus(partition.name, 'success', result.data);
				setCachedPartition(partition.name, result.data, mergedVars);
				options?.onPartitionComplete?.(partition.name, result.data);
			} else {
				setPartitionStatus(partition.name, 'error', undefined, result.error);
				state.error = result.error;
				options?.onPartitionError?.(partition.name, result.error);
			}
		} catch (err) {
			if (aborted) return;
			const errorMsg = err instanceof Error ? err.message : 'Unknown error';
			setPartitionStatus(partition.name, 'error', undefined, errorMsg);
			state.error = errorMsg;
			options?.onPartitionError?.(partition.name, errorMsg);
		}
	}

	async function executePartitionGraph(
		vars?: Record<string, unknown>,
		onlyFailed = false,
	): Promise<PartialQueryState> {
		aborted = false;
		state.loading = true;
		state.error = null;
		notify();

		// Topological execution respecting dependencies
		const executed = new Set<string>();
		const remaining = [...partitions];

		while (remaining.length > 0) {
			const ready = remaining.filter(
				(p) =>
					!executed.has(p.name) &&
					areDependenciesMet(p) &&
					(!onlyFailed || state.partitions[p.name]?.status === 'error' || state.partitions[p.name]?.status === undefined),
			);

			if (ready.length === 0) {
				// Circular dependency or all remaining have unmet deps — execute what we can
				const next = remaining.find((p) => !executed.has(p.name));
				if (next) {
					await executePartition(next, vars);
					executed.add(next.name);
					remaining.splice(remaining.indexOf(next), 1);
				} else {
					break;
				}
				continue;
			}

			// Execute ready partitions in parallel
			await Promise.all(ready.map((p) => executePartition(p, vars)));
			for (const p of ready) {
				executed.add(p.name);
				remaining.splice(remaining.indexOf(p), 1);
			}
		}

		mergeData();
		state.loading = false;
		state.isPartial = partitions.some((p) => state.partitions[p.name]?.status === 'cached');
		state.isComplete = partitions.every(
			(p) => state.partitions[p.name]?.status === 'success' || state.partitions[p.name]?.status === 'cached',
		);
		notify();
		return { ...state, data: { ...state.data }, partitions: { ...state.partitions } };
	}

	return {
		execute: (vars?: Record<string, unknown>) => executePartitionGraph(vars, false),
		resume: (vars?: Record<string, unknown>) => executePartitionGraph(vars, true),
		getState: () => ({ ...state, data: { ...state.data }, partitions: { ...state.partitions } }),
		onStateChange: (callback: (state: PartialQueryState) => void) => {
			listeners.add(callback);
			return () => listeners.delete(callback);
		},
	};
}
