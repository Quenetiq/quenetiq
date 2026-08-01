import { inject, signal, type Signal } from '@angular/core';
import { GraphqlService } from './graphql.service';
import { EndpointsService } from './endpoints.service';
import type { DocumentNode, TypedDocumentNode, TypedQueryString } from './gql';
import type { InferEndpointNames } from './types';
import type { EndpointsYaml } from './endpoints-config';
import type { QuenetiqInjectOptions } from './inject-options';

// ─── Types ────────────────────────────────────────────────────────────────

export interface QueryPartition<
	TDocument extends TypedQueryString<unknown, Record<string, unknown>>
		| DocumentNode
		| TypedDocumentNode<unknown, Record<string, unknown>> = DocumentNode,
> {
	/** Unique name for this partition. */
	readonly name: string;
	/** The GraphQL sub-query document. */
	readonly document: TDocument;
	/** Variables specific to this partition (merged with top-level variables). */
	readonly variables?: Record<string, unknown>;
	/** Dependencies — partition names that must complete before this one executes. */
	readonly dependsOn?: string[];
}

export type PartitionStatus = 'pending' | 'loading' | 'success' | 'error' | 'cached';

export interface PartitionResult {
	readonly status: PartitionStatus;
	readonly data: unknown;
	readonly error?: string;
}

export interface PartialQueryHandle<TResponse extends Record<string, unknown>> {
	/** Merged data from all completed/cached partitions. */
	readonly data: Signal<TResponse | undefined>;
	/** Whether any partition is currently loading. */
	readonly loading: Signal<boolean>;
	/** First error encountered (if any). */
	readonly error: Signal<string | undefined>;
	/** Per-partition status map. */
	readonly partitions: Signal<Record<string, PartitionResult>>;
	/** Whether any partition had to be re-fetched (partial recovery). */
	readonly isPartial: Signal<boolean>;
	/** Whether all partitions completed successfully. */
	readonly isComplete: Signal<boolean>;
	/** Force re-execute all partitions. */
	readonly refetch: () => void;
	/** Resume only failed partitions (skip cached/success). */
	readonly resume: () => void;
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

// ─── injectPartialQuery ───────────────────────────────────────────────────

export type PartialQueryEndpointParam<Yaml extends EndpointsYaml | undefined = undefined> =
	[Yaml] extends [EndpointsYaml]
		? InferEndpointNames<Yaml>
		: string;

export interface PartialQueryOptions
	extends QuenetiqInjectOptions {
	/** Top-level variables merged into every partition. */
	readonly variables?: Record<string, unknown>;
	/** Endpoint name or URL override. */
	readonly endpoint?: string;
	/** Callback when a partition completes successfully. */
	readonly onPartitionComplete?: (name: string, data: unknown) => void;
	/** Callback when a partition fails. */
	readonly onPartitionError?: (name: string, error: string) => void;
}

/**
 * Resumable partial query for Angular.
 *
 * Splits a query into independent partitions, caches each separately,
 * and resumes only failed partitions on network recovery.
 *
 * @example
 * ```typescript
 * const handle = injectPartialQuery<UserData>([
 *   { name: 'user', document: gql`{ user { name email } }` },
 *   { name: 'posts', document: gql`{ posts { title } }` },
 *   { name: 'notifications', document: gql`{ notifications { message } }` },
 * ]);
 *
 * // handle.data() = { user: {...}, posts: {...}, notifications: {...} }
 * // handle.partitions().posts.status === 'error' (if it failed)
 * // handle.resume() re-fetches only failed partitions
 * ```
 */
export function injectPartialQuery<
	TResponse extends Record<string, unknown>,
>(
	partitions: QueryPartition[],
	options?: PartialQueryOptions,
): PartialQueryHandle<TResponse> {
	const graphql = inject(GraphqlService);
	const endpoints = inject(EndpointsService, { optional: true, ...options });

	const dataSignal = signal<TResponse | undefined>(undefined);
	const loadingSignal = signal(false);
	const errorSignal = signal<string | undefined>(undefined);
	const partitionsSignal = signal<Record<string, PartitionResult>>({});
	const isPartialSignal = signal(false);
	const isCompleteSignal = signal(false);

	function updateSignals(
		updates: Partial<{
			data: TResponse | undefined;
			loading: boolean;
			error: string | undefined;
			partitions: Record<string, PartitionResult>;
			isPartial: boolean;
			isComplete: boolean;
		}>,
	): void {
		if (updates.data !== undefined) dataSignal.set(updates.data);
		if (updates.loading !== undefined) loadingSignal.set(updates.loading);
		if (updates.error !== undefined) errorSignal.set(updates.error);
		if (updates.partitions !== undefined) partitionsSignal.set({ ...updates.partitions });
		if (updates.isPartial !== undefined) isPartialSignal.set(updates.isPartial);
		if (updates.isComplete !== undefined) isCompleteSignal.set(updates.isComplete);
	}

	function mergeData(parts: Record<string, PartitionResult>): TResponse {
		const merged: Record<string, unknown> = {};
		for (const [name, result] of Object.entries(parts)) {
			if ((result.status === 'success' || result.status === 'cached') && result.data !== undefined) {
				merged[name] = result.data;
			}
		}
		return merged as TResponse;
	}

	function resolveUrl(endpoint?: string): string | undefined {
		if (!endpoint || !endpoints) return undefined;
		return endpoints.getRoute(endpoint)?.url;
	}

	async function executePartition(
		partition: QueryPartition,
		variables?: Record<string, unknown>,
	): Promise<void> {
		const mergedVars = { ...variables, ...partition.variables };

		// Check cache first
		const cached = getCachedPartition(partition.name, mergedVars);
		if (cached !== undefined) {
			const parts = { ...partitionsSignal() };
			parts[partition.name] = { status: 'cached', data: cached };
			updateSignals({ partitions: parts });
			options?.onPartitionComplete?.(partition.name, cached);
			return;
		}

		// Set loading
		const parts = { ...partitionsSignal() };
		parts[partition.name] = { status: 'loading', data: parts[partition.name]?.data };
		updateSignals({ partitions: parts });

		try {
			const url = resolveUrl(options?.endpoint);
			const result = await graphql.query(
				partition.document,
				mergedVars,
				url,
			).toPromise();

			if (!result) return;

			const currentParts = { ...partitionsSignal() };
			if (result.status === 'success') {
				currentParts[partition.name] = { status: 'success', data: result.data };
				setCachedPartition(partition.name, result.data, mergedVars);
				options?.onPartitionComplete?.(partition.name, result.data);
			} else {
				currentParts[partition.name] = { status: 'error', data: currentParts[partition.name]?.data, error: result.error };
				options?.onPartitionError?.(partition.name, result.error);
			}
			updateSignals({ partitions: currentParts });
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Unknown error';
			const currentParts = { ...partitionsSignal() };
			currentParts[partition.name] = { status: 'error', data: currentParts[partition.name]?.data, error: errorMsg };
			updateSignals({ partitions: currentParts, error: errorMsg });
			options?.onPartitionError?.(partition.name, errorMsg);
		}
	}

	function areDependenciesMet(partition: QueryPartition): boolean {
		if (!partition.dependsOn?.length) return true;
		const parts = partitionsSignal();
		return partition.dependsOn.every((dep) => {
			const s = parts[dep]?.status;
			return s === 'success' || s === 'cached';
		});
	}

	async function executeGraph(onlyFailed = false): Promise<void> {
		loadingSignal.set(true);
		errorSignal.set(undefined);

		const remaining = [...partitions];
		const executed = new Set<string>();

		while (remaining.length > 0) {
			const ready = remaining.filter((p) => {
				if (executed.has(p.name)) return false;
				if (!areDependenciesMet(p)) return false;
				if (!onlyFailed) return true;
				const status = partitionsSignal()[p.name]?.status;
				return status === 'error' || status === undefined;
			});

			if (ready.length === 0) {
				const next = remaining.find((p) => !executed.has(p.name));
				if (next) {
					await executePartition(next, options?.variables);
					executed.add(next.name);
					remaining.splice(remaining.indexOf(next), 1);
				} else {
					break;
				}
				continue;
			}

			await Promise.all(ready.map((p) => executePartition(p, options?.variables)));
			for (const p of ready) {
				executed.add(p.name);
				remaining.splice(remaining.indexOf(p), 1);
			}
		}

		const finalParts = { ...partitionsSignal() };
		const merged = mergeData(finalParts);
		const isPartial = partitions.some((p) => finalParts[p.name]?.status === 'cached');
		const isComplete = partitions.every(
			(p) => finalParts[p.name]?.status === 'success' || finalParts[p.name]?.status === 'cached',
		);

		updateSignals({
			data: merged,
			loading: false,
			partitions: finalParts,
			isPartial,
			isComplete,
		});
	}

	// Execute on creation
	executeGraph(false);

	return {
		data: dataSignal.asReadonly(),
		loading: loadingSignal.asReadonly(),
		error: errorSignal.asReadonly(),
		partitions: partitionsSignal.asReadonly(),
		isPartial: isPartialSignal.asReadonly(),
		isComplete: isCompleteSignal.asReadonly(),
		refetch: () => executeGraph(false),
		resume: () => executeGraph(true),
	};
}
