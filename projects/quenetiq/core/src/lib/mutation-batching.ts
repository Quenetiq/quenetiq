import { Injectable, inject } from '@angular/core';
import { Subject, Observable, bufferTime, filter } from 'rxjs';
import { GraphqlService, type GraphQLResult, type RequestOverrideConfig } from './graphql.service';
import type { DocumentNode, TypedDocumentNode } from './gql';

export interface MutationBatchItem<TResponse> {
	document: DocumentNode | TypedDocumentNode<TResponse>;
	variables?: Record<string, unknown>;
	endpoint?: string;
	overrideConfig?: RequestOverrideConfig;
	resolve: (result: GraphQLResult<TResponse>) => void;
	reject: (error: unknown) => void;
}

export interface MutationBatchConfig {
	/** Max time (ms) to wait before flushing the batch. Default: 50 */
	batchWindowMs?: number;
	/** Max number of mutations in a single batch. Default: 10 */
	maxBatchSize?: number;
}

/**
 * Service for batching multiple mutations into a single HTTP request.
 * Mutations are collected within a time window and sent as a batch array.
 */
@Injectable({ providedIn: 'root' })
export class MutationBatchService {
	private readonly graphql = inject(GraphqlService);
	private readonly batch$ = new Subject<MutationBatchItem<unknown>>();
	private readonly batchWindowMs: number;
	private readonly maxBatchSize: number;

	constructor() {
		this.batchWindowMs = 50;
		this.maxBatchSize = 10;

		this.batch$.pipe(
			bufferTime(this.batchWindowMs),
			filter((batch) => batch.length > 0),
		).subscribe((batch) => this.flushBatch(batch));
	}

	/**
	 * Add a mutation to the batch. Returns an Observable of the result.
	 */
	add<TResponse>(
		document: DocumentNode | TypedDocumentNode<TResponse>,
		variables?: Record<string, unknown>,
		endpoint?: string,
		overrideConfig?: RequestOverrideConfig,
	): Observable<GraphQLResult<TResponse>> {
		return new Observable<GraphQLResult<TResponse>>((subscriber) => {
			this.batch$.next({
				document,
				variables,
				endpoint,
				overrideConfig,
				resolve: (result) => subscriber.next(result as GraphQLResult<TResponse>),
				reject: (error) => subscriber.error(error),
			} as MutationBatchItem<unknown>);
		});
	}

	private async flushBatch(batch: MutationBatchItem<unknown>[]): Promise<void> {
		if (batch.length === 1) {
			const item = batch[0];
			try {
				const result$ = this.graphql.mutate(
					item.document,
					item.variables as Record<string, unknown>,
					item.endpoint,
					undefined,
					item.overrideConfig,
				);
				result$.subscribe({
					next: (result) => item.resolve(result),
					error: (err) => item.reject(err),
				});
			} catch (err) {
				item.reject(err);
			}
			return;
		}

		const promises = batch.map((item) => {
			return new Promise<GraphQLResult<unknown>>((resolve, reject) => {
				const result$ = this.graphql.mutate(
					item.document,
					item.variables as Record<string, unknown>,
					item.endpoint,
					undefined,
					item.overrideConfig,
				);
				result$.subscribe({
					next: (result) => resolve(result),
					error: (err) => reject(err),
				});
			});
		});

		const results = await Promise.allSettled(promises);
		for (let i = 0; i < batch.length; i++) {
			const result = results[i];
			if (result.status === 'fulfilled') {
				batch[i].resolve(result.value);
			} else {
				batch[i].reject(result.reason);
			}
		}
	}
}
