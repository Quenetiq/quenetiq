import { print, type DocumentNode, type TypedDocumentNode } from './gql';
import {
	devAuthMiddleware,
	hasFiles,
	type GraphqlRequestContext,
	type GraphqlMiddleware,
	type TypedPipeline,
	buildTypedPipeline,
} from './middleware';
import { cacheMiddleware } from './cache-middleware';
import {
	PersistedQueryRegistry,
	buildApqPayload,
	isPersistedQueryNotFound,
} from './persisted-queries';
import type { GraphQLResult, GraphQLResponse } from './result';
import { resultError } from './result';
import type { ClientConfig } from './config';
import type { CacheStore, CacheEntity, OptimisticUpdate } from '@dumbql/cache';
import type { FetchPolicy } from './middleware';

export type { ClientConfig };

/** Infer result type from TypedDocumentNode, fallback to unknown */
export type InferData<T> = T extends TypedDocumentNode<infer D> ? D : unknown;

/** Infer variables type from TypedDocumentNode, fallback to Record<string, unknown> */
export type InferVars<T> = T extends TypedDocumentNode<unknown, infer V> ? V : Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dedupCache = new Map<string, Promise<GraphQLResult<any>>>();

export interface QueryOptions {
	fetchPolicy?: FetchPolicy;
	signal?: AbortSignal;
}

export interface MutateOptions<TData> {
	/** Apply optimistic response to the cache before the mutation fires. */
	readonly optimisticResponse?: TData;
}

interface BatchEntry {
	request: GraphqlRequestContext;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	resolve: (result: GraphQLResult<any>) => void;
}

interface FileEntry {
	path: string;
	file: Blob;
}

export class DumbqlClient {
	private _endpoint: string;
	private errorPolicy: 'none' | 'all' | 'ignore';
	private showErrorsOnSuccess: boolean;
	private retryCount: number;
	private retryDelay: number;
	private batchWindow: number;
	private dedupEnabled: boolean;
	private pipeline: TypedPipeline;
	private _cacheService: CacheStore | null = null;
	private _apqRegistry: PersistedQueryRegistry | null = null;

	private batchQueue: BatchEntry[] | null = null;
	private batchTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(
		private config: ClientConfig,
		cache?: CacheStore,
	) {
		this._endpoint = config.endpoint ?? config.url ?? '/graphql';
		this.errorPolicy = config.errorPolicy ?? 'none';
		this.showErrorsOnSuccess = config.showErrorsOnSuccess ?? false;
		this.retryCount = config.retryCount ?? 0;
		this.retryDelay = config.retryDelay ?? 1000;
		this.batchWindow = config.batchWindow ?? 0;
		this.dedupEnabled = config.dedup ?? false;
		this._cacheService = cache ?? null;
		if (config.persistedQueries?.enabled) {
			this._apqRegistry = new PersistedQueryRegistry(config.persistedQueries);
		}
		this.pipeline = this.buildPipeline(config);
	}

	setEndpoint(url: string): void {
		this._endpoint = url;
	}

	get endpoint(): string {
		return this._endpoint;
	}

	getCacheService(): CacheStore | null {
		return this._cacheService;
	}

	resetStore(): void {
		dedupCache.clear();
		if (this.batchQueue) {
			this.batchQueue = null;
		}
		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = null;
		}
		if (this._cacheService) {
			this._cacheService.clearLocalState();
		}
	}

	clearStore(): void {
		if (this._cacheService) {
			this._cacheService.clearLocalState();
		}
	}

	query<TDocument extends DocumentNode | TypedDocumentNode>(
		document: TDocument,
		variables?: InferVars<TDocument>,
		endpoint?: string,
		options?: QueryOptions,
	): Promise<GraphQLResult<InferData<TDocument>>> {
		const queryStr = print(document);
		if (this.dedupEnabled) {
			return this.withDedup(queryStr, variables,
				() => this.executeQuery<InferData<TDocument>>(
					queryStr, variables, endpoint, options?.fetchPolicy, options?.signal,
				));
		}
		return this.executeQuery<InferData<TDocument>>(
			queryStr, variables, endpoint, options?.fetchPolicy, options?.signal,
		);
	}

	queryStream<TDocument extends DocumentNode | TypedDocumentNode>(
		document: TDocument,
		variables?: InferVars<TDocument>,
		endpoint?: string,
	): AsyncIterable<GraphQLResult<InferData<TDocument>>> {
		const queryStr = print(document);
		return this.executeStreaming(
			queryStr, variables, endpoint,
		) as AsyncIterable<GraphQLResult<InferData<TDocument>>>;
	}

	async mutate<TDocument extends DocumentNode | TypedDocumentNode>(
		document: TDocument,
		variables?: InferVars<TDocument>,
		endpoint?: string,
		options?: MutateOptions<InferData<TDocument>>,
	): Promise<GraphQLResult<InferData<TDocument>>> {
		const query = print(document);
		let result$: Promise<GraphQLResult<InferData<TDocument>>>;

		if (variables !== undefined && hasFiles(variables)) {
			result$ = this.upload<InferData<TDocument>>(query, variables, endpoint);
		} else {
			result$ = this.withRetry(
				() => this.request<InferData<TDocument>>(query, variables, 'mutation', endpoint),
			);
		}

		let optimisticId: string | undefined;
		if (options?.optimisticResponse && this._cacheService) {
			try {
				const id = `optimistic:${Date.now()}:${Math.random().toString(36).slice(2)}`;
				const entities = extractEntitiesFromData(options.optimisticResponse);
				const update: OptimisticUpdate = {
					id,
					apply: (cache: Map<string, CacheEntity>) => {
						for (const e of entities) {
							const key = `${e.__typename}:${e.id}`;
							const existing = cache.get(key);
							if (existing) {
								cache.set(key, { ...existing, ...e });
							} else {
								cache.set(key, e);
							}
						}
					},
					rollback: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
				};
				this._cacheService.applyOptimistic(update);
				optimisticId = id;
			} catch { /* best-effort */ }
		}

		const result = await result$;

		if (result.status === 'success' && result.data && this._cacheService) {
			try {
				const typeNames = new Set<string>();
				extractTypeNames(result.data, typeNames);
				if (typeNames.size > 0) {
					this._cacheService.clearLocalStateByTypes(Array.from(typeNames));
				}
			} catch {
				// cache invalidation is best-effort
			}
			if (optimisticId) {
				try { this._cacheService.commitOptimistic(optimisticId); } catch { /* best-effort */ }
			}
		} else if (optimisticId && this._cacheService) {
			try { this._cacheService.rollbackOptimistic(optimisticId); } catch { /* best-effort */ }
		}

		return result;
	}

	refetch<TDocument extends DocumentNode | TypedDocumentNode>(
		document: TDocument,
		variables?: InferVars<TDocument>,
		endpoint?: string,
	): Promise<GraphQLResult<InferData<TDocument>>> {
		const query = print(document);
		const key = this.dedupKey(query, variables);
		dedupCache.delete(key);
		return this.query<TDocument>(document, variables, endpoint);
	}

	/**
	 * Execute a query with `@defer`/`@stream` support.
	 * Auto-merges incremental patches into a single result as they arrive.
	 * Each emission is the full merged result up to that point.
	 */
	queryDefer<TDocument extends DocumentNode | TypedDocumentNode>(
		document: TDocument,
		variables?: InferVars<TDocument>,
		endpoint?: string,
	): AsyncIterable<GraphQLResult<InferData<TDocument>>> {
		const queryStr = print(document);
		return this.executeDefer<InferData<TDocument>>(queryStr, variables, endpoint);
	}

	private async *executeDefer<T>(
		query: string,
		variables?: Record<string, unknown>,
		endpoint?: string,
	): AsyncIterable<GraphQLResult<T>> {
		let mergedData: unknown = undefined;

		const rawChunks = this.executeStreamingRaw(query, variables, endpoint);

		for await (const raw of rawChunks) {
			if ('data' in raw && !('incremental' in raw)) {
				// First chunk: initial data
				mergedData = raw['data'];
				yield { status: 'success', data: mergedData as T };
				continue;
			}

			if ('incremental' in raw) {
				// Incremental patch: merge into existing data
				const incrementals = raw['incremental'];
				if (Array.isArray(incrementals)) {
					for (const patch of incrementals) {
						if (patch && typeof patch === 'object' && 'path' in patch && 'data' in patch) {
							const path = (patch as Record<string, unknown>)['path'] as (string | number)[];
							const patchData = (patch as Record<string, unknown>)['data'];
							mergedData = applyPatch(mergedData, path, patchData);
						}
					}
				}
				yield { status: 'success', data: mergedData as T };

				if (raw['hasNext'] === false) return;
				continue;
			}

			// Fallback: yield as-is
			yield { status: 'success', data: raw as T };
		}
	}

	private async *executeStreamingRaw(
		query: string,
		variables?: Record<string, unknown>,
		endpoint?: string,
	): AsyncIterable<Record<string, unknown>> {
		const url = endpoint || this._endpoint;
		const headers = this.getHeaderMap();
		const controller = new AbortController();

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					...headers,
					'Content-Type': 'application/json',
					Accept: 'multipart/mixed;boundary=graphql;defer=stream',
				},
				body: JSON.stringify({ query, variables }),
				signal: controller.signal,
			});

			if (!response.ok) return;

			const contentType = response.headers.get('content-type') ?? '';
			const reader = response.body?.getReader();
			if (!reader) return;

			if (contentType.includes('multipart/mixed')) {
				const boundary = this.parseBoundary(contentType);
				if (!boundary) return;
				yield* this.readMultipartRaw(reader, boundary);
			} else {
				const chunks: Uint8Array[] = [];
				let done = false;
				while (!done) {
					const { done: d, value } = await reader.read();
					done = d;
					if (value) chunks.push(value);
				}
				const text = new TextDecoder().decode(this.concatBuffers(chunks));
				yield JSON.parse(text) as Record<string, unknown>;
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
		}
	}

	private async *readMultipartRaw(
		reader: ReadableStreamDefaultReader<Uint8Array>,
		boundary: string,
	): AsyncIterable<Record<string, unknown>> {
		const decoder = new TextDecoder();
		let buffer = '';
		let done = false;

		while (!done) {
			const { done: d, value } = await reader.read();
			done = d;
			if (value) buffer += decoder.decode(value, { stream: !done });

			const parts = buffer.split(`--${boundary}`);
			if (parts.length > 1) {
				buffer = parts.pop() ?? '';
				for (const part of parts) {
					const trimmed = part.trim();
					if (!trimmed || trimmed === '--') continue;
					const jsonStart = trimmed.indexOf('\n\n');
					if (jsonStart === -1) continue;
					const jsonStr = trimmed.slice(jsonStart + 2).trim();
					if (!jsonStr) continue;
					try {
						const raw = JSON.parse(jsonStr) as Record<string, unknown>;
						yield raw;
						if (raw['hasNext'] === false) return;
					} catch {
						// skip malformed chunks
					}
				}
			}
		}
	}

	private async executeQuery<T>(
		query: string,
		variables?: Record<string, unknown>,
		endpoint?: string,
		fetchPolicy?: FetchPolicy,
		signal?: AbortSignal,
	): Promise<GraphQLResult<T>> {
		if (this.batchWindow > 0) {
			return this.batchedRequest<T>(query, variables, endpoint);
		}
		return this.withRetry(() => this.request<T>(query, variables, 'query', endpoint, fetchPolicy, signal));
	}

	private async request<T>(
		query: string,
		variables?: Record<string, unknown>,
		type: 'query' | 'mutation' = 'query',
		endpoint?: string,
		fetchPolicy?: FetchPolicy,
		signal?: AbortSignal,
	): Promise<GraphQLResult<T>> {
		const context: GraphqlRequestContext = {
			query,
			variables: variables ?? {},
			headers: this.getHeaderMap(),
			type,
			endpoint,
			fetchPolicy,
			signal,
		};
		return this.pipeline(context);
	}

	private getHeaderMap(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (this.config.headers) {
			for (const [key, value] of Object.entries(this.config.headers)) {
				headers[key] = typeof value === 'function' ? value() : value;
			}
		}

		return headers;
	}

	private buildPipeline(
		config: ClientConfig,
	): TypedPipeline {
		const mw: GraphqlMiddleware[] = [...(config.middleware ?? [])];

		if (config.cache?.enabled !== false && this._cacheService) {
			try {
				mw.push(cacheMiddleware(this._cacheService, config.cache));
			} catch {
				// cache middleware not available
			}
		}

		if (config.devAuth?.enabled !== false) {
			mw.unshift(devAuthMiddleware(config.devAuth?.token));
		}

		return buildTypedPipeline(mw, (req) => this.executeHttp(req));
	}

	private async executeHttp(request: GraphqlRequestContext): Promise<GraphQLResult<unknown>> {
		try {
			const url = request.endpoint || this._endpoint;

			if (request.method === 'GET') {
				const params = new URLSearchParams();
				params.set('query', request.query);
				if (request.variables && Object.keys(request.variables).length > 0) {
					params.set('variables', JSON.stringify(request.variables));
				}
				if (request.extensions) {
					params.set('extensions', JSON.stringify(request.extensions));
				}
				const response = await fetch(`${url}?${params.toString()}`, {
					method: 'GET',
					headers: request.headers,
					signal: request.signal,
				});
				if (!response.ok) {
					return this.toHttpError({
						message: `HTTP ${response.status}`,
						status: response.status,
						statusText: response.statusText,
					});
				}
				const json: GraphQLResponse<unknown> = await response.json();
				return this.toResult(json);
			}

			// APQ: try hash-only first if registry says query is registered
			if (this._apqRegistry && request.type === 'query') {
				const hash = await this._apqRegistry.registerAsync(request.query);
				if (this._apqRegistry.isRegistered(hash)) {
					const apqResult = await this.executeApqHashOnly(url, hash, request.variables, request.signal);
					if (apqResult) {
						return apqResult;
					}
					// PersistedQueryNotFound: re-send full query below
					this._apqRegistry.markRegistered(hash); // reset for re-registration
				}
			}

			const body: Record<string, unknown> = { query: request.query, variables: request.variables };
			if (request.extensions) {
				body['extensions'] = request.extensions;
			}
			const response = await fetch(url, {
				method: 'POST',
				headers: request.headers,
				body: JSON.stringify(body),
				signal: request.signal,
			});

			if (!response.ok) {
				return this.toHttpError({
					message: `HTTP ${response.status}`,
					status: response.status,
					statusText: response.statusText,
				});
			}

			const json2: GraphQLResponse<unknown> = await response.json();

			// APQ: if autoPersist is enabled, mark hash as registered on success
			if (this._apqRegistry && request.type === 'query' && this.config.persistedQueries?.autoPersist) {
				const hash = this._apqRegistry.getHash(request.query);
				if (hash && !isPersistedQueryNotFound(json2)) {
					this._apqRegistry.markRegistered(hash);
				}
			}

			return this.toResult(json2);
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				return resultError<unknown>('Request aborted', 'NETWORK_ERROR');
			}
			return this.toHttpError(err instanceof Error ? err : new Error('Unknown error'));
		}
	}

	private async executeApqHashOnly(
		url: string,
		hash: string,
		variables?: Record<string, unknown>,
		signal?: AbortSignal,
	): Promise<GraphQLResult<unknown> | null> {
		const config = this.config.persistedQueries;
		const extensions = buildApqPayload(hash);

		if (config?.useGetForHashedQueries) {
			const params = new URLSearchParams();
			params.set('extensions', JSON.stringify(extensions));
			if (variables && Object.keys(variables).length > 0) {
				params.set('variables', JSON.stringify(variables));
			}
			const response = await fetch(`${url}?${params.toString()}`, {
				method: 'GET',
				headers: this.getHeaderMap(),
				signal,
			});
			if (!response.ok) return null;
			const json: GraphQLResponse<unknown> = await response.json();
			if (isPersistedQueryNotFound(json)) return null;
			return this.toResult(json);
		}

		const response = await fetch(url, {
			method: 'POST',
			headers: this.getHeaderMap(),
			body: JSON.stringify({ variables, extensions }),
			signal,
		});
		if (!response.ok) return null;
		const json2: GraphQLResponse<unknown> = await response.json();
		if (isPersistedQueryNotFound(json2)) return null;
		return this.toResult(json2);
	}

	private async *executeStreaming(
		query: string,
		variables?: Record<string, unknown>,
		endpoint?: string,
	): AsyncIterable<GraphQLResult<unknown>> {
		const url = endpoint || this._endpoint;
		const headers = this.getHeaderMap();
		const controller = new AbortController();

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					...headers,
					'Content-Type': 'application/json',
					Accept: 'multipart/mixed;boundary=graphql;defer=stream',
				},
				body: JSON.stringify({ query, variables }),
				signal: controller.signal,
			});

			if (!response.ok) {
				yield { status: 'error', error: `HTTP ${response.status}` };
				return;
			}

			const contentType = response.headers.get('content-type') ?? '';
			const reader = response.body?.getReader();
			if (!reader) {
				yield { status: 'error', error: 'No response body' };
				return;
			}

			if (contentType.includes('multipart/mixed')) {
				const boundary = this.parseBoundary(contentType);
				if (!boundary) {
					yield { status: 'error', error: 'No boundary in multipart response' };
					return;
				}
				yield* this.readMultipartStream(reader, boundary);
			} else {
				const chunks: Uint8Array[] = [];
				let done = false;
				while (!done) {
					const { done: d, value } = await reader.read();
					done = d;
					if (value) chunks.push(value);
				}
				const text = new TextDecoder().decode(this.concatBuffers(chunks));
				const json: GraphQLResponse<unknown> = JSON.parse(text);
				yield this.toResult(json);
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			yield { status: 'error', error: err instanceof Error ? err.message : 'Stream error' };
		}
	}

	private parseBoundary(contentType: string): string | null {
		const match = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
		return match ? (match[1] ?? match[2]) : null;
	}

	private async *readMultipartStream(
		reader: ReadableStreamDefaultReader<Uint8Array>,
		boundary: string,
	): AsyncIterable<GraphQLResult<unknown>> {
		const decoder = new TextDecoder();
		let buffer = '';
		let done = false;

		while (!done) {
			const { done: d, value } = await reader.read();
			done = d;
			if (value) buffer += decoder.decode(value, { stream: !done });

			const parts = buffer.split(`--${boundary}`);
			if (parts.length > 1) {
				buffer = parts.pop() ?? '';
				for (const part of parts) {
					const trimmed = part.trim();
					if (!trimmed || trimmed === '--') continue;
					const jsonStart = trimmed.indexOf('\n\n');
					if (jsonStart === -1) continue;
					const jsonStr = trimmed.slice(jsonStart + 2).trim();
					if (!jsonStr) continue;
					try {
						const raw: Record<string, unknown> = JSON.parse(jsonStr);
						const parsed: GraphQLResponse<unknown> = raw;
						const result = this.toResult(parsed);
						yield result;
						if ('hasNext' in raw && raw['hasNext'] === false) return;
					} catch {
						// skip malformed chunks
					}
				}
			}
		}
	}

	private concatBuffers(chunks: Uint8Array[]): Uint8Array {
		const total = chunks.reduce((sum, c) => sum + c.length, 0);
		const result = new Uint8Array(total);
		let offset = 0;
		for (const chunk of chunks) {
			result.set(chunk, offset);
			offset += chunk.length;
		}
		return result;
	}

	private async withRetry<T>(fn: () => Promise<GraphQLResult<T>>): Promise<GraphQLResult<T>> {
		if (this.retryCount <= 0) return fn();

		let lastError: unknown;
		for (let attempt = 0; attempt <= this.retryCount; attempt++) {
			try {
				return await fn();
			} catch (error) {
				lastError = error;
				if (attempt < this.retryCount) {
					const delay = this.retryDelay * Math.pow(2, attempt);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}
		throw lastError;
	}

	private withDedup<T>(
		query: string,
		variables: Record<string, unknown> | undefined,
		fn: () => Promise<GraphQLResult<T>>,
	): Promise<GraphQLResult<T>> {
		const key = this.dedupKey(query, variables);

		if (dedupCache.has(key)) {
			return dedupCache.get(key)!;
		}

		const promise = fn().finally(() => dedupCache.delete(key));
		dedupCache.set(key, promise);
		return promise;
	}

	private dedupKey(query: string, variables?: Record<string, unknown>): string {
		return `${query}|${JSON.stringify(variables ?? {})}`;
	}

	private batchedRequest<T>(
		query: string,
		variables?: Record<string, unknown>,
		endpoint?: string,
	): Promise<GraphQLResult<T>> {
		return new Promise<GraphQLResult<T>>((resolve) => {
			if (!this.batchQueue) {
				this.batchQueue = [];
			}

			const context: GraphqlRequestContext = {
				query,
				variables: variables ?? {},
				headers: this.getHeaderMap(),
				type: 'query',
				endpoint,
			};

			this.batchQueue.push({
				request: context,
				resolve,
			});

			if (!this.batchTimer) {
				this.batchTimer = setTimeout(() => this.flushBatch(), this.batchWindow);
			}
		});
	}

	private async flushBatch(): Promise<void> {
		const queue = this.batchQueue;
		this.batchQueue = null;
		this.batchTimer = null;

		if (!queue || queue.length === 0) return;

		if (queue.length === 1) {
			const result = await this.pipeline(queue[0].request);
			queue[0].resolve(result);
			return;
		}

		try {
			const url = queue[0].request.endpoint || this._endpoint;
			const headers = queue[0].request.headers;
			const body = queue.map((item) => ({
				query: item.request.query,
				variables: item.request.variables,
			}));

			const response = await fetch(url, {
				method: 'POST',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const errorResult = this.toHttpError({
					message: `HTTP ${response.status}`,
					status: response.status,
					statusText: response.statusText,
				});
				for (const item of queue) {
					item.resolve(errorResult);
				}
				return;
			}

			const responses: GraphQLResponse<unknown>[] = await response.json();
			for (let i = 0; i < queue.length; i++) {
				const resp = responses[i];
				if (resp) {
					queue[i].resolve(this.toResult(resp));
				} else {
					queue[i].resolve({ status: 'error', error: 'No response in batch' });
				}
			}
		} catch (err) {
			const errorResult = this.toHttpError(err instanceof Error ? err : new Error('Unknown error'));
			for (const item of queue) {
				item.resolve(errorResult);
			}
		}
	}

	private async upload<T>(
		query: string,
		variables: Record<string, unknown>,
		endpoint?: string,
	): Promise<GraphQLResult<T>> {
		const files: FileEntry[] = [];
		const cleanedVariables = replaceFiles(variables, files, []);
		const operations = JSON.stringify({ query, variables: cleanedVariables });
		const map_: Record<string, string[]> = {};

		for (const [index, entry] of files.entries()) {
			map_[String(index)] = [entry.path];
		}

		const formData = new FormData();
		formData.append('operations', operations);
		formData.append('map', JSON.stringify(map_));
		for (const [index, entry] of files.entries()) {
			formData.append(String(index), entry.file);
		}

		const url = endpoint || this._endpoint;
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: this.getHeaderMap(),
				body: formData,
			});

			if (!response.ok) {
				return this.toHttpError({
					message: `HTTP ${response.status}`,
					status: response.status,
					statusText: response.statusText,
				});
			}

			const json: GraphQLResponse<T> = await response.json();
			return this.toResult(json);
		} catch (err) {
			return this.toHttpError(err instanceof Error ? err : new Error('Unknown error'));
		}
	}

	private toResult<T>(response: GraphQLResponse<T>): GraphQLResult<T> {
		const hasErrors = response.errors && response.errors.length > 0;
		const errorsPayload = hasErrors ? response.errors : undefined;

		if (hasErrors && this.errorPolicy === 'none') {
			return this.withErrorNotification({
				status: 'error',
				errorCode: 'GRAPHQL_ERROR',
				error: response.errors![0].message,
				graphQLErrors: response.errors!,
			});
		}

		if (hasErrors && this.errorPolicy === 'ignore') {
			if (response.data != null) {
				const result: {
					status: 'success';
					data: T;
					graphQLErrors?: { message: string; extensions?: Record<string, unknown> }[];
				} = {
					status: 'success',
					data: response.data,
				};
				if (this.showErrorsOnSuccess) result.graphQLErrors = response.errors;
				return result;
			}
			return this.withErrorNotification({
				status: 'error',
				errorCode: 'NO_DATA',
				error: 'No data returned',
				graphQLErrors: response.errors!,
			});
		}

		if (hasErrors && this.errorPolicy === 'all') {
			const msgs = response.errors!.map((e) => e.message);
			if (response.data != null) {
				return { status: 'success', data: response.data, graphQLErrors: response.errors };
			}
			return this.withErrorNotification({
				status: 'error',
				errorCode: 'NO_DATA',
				error: msgs.join('; '),
				graphQLErrors: response.errors!,
			});
		}

		if (response.data == null) {
			return this.withErrorNotification({
				status: 'error',
				errorCode: 'NO_DATA',
				error: 'No data returned from server',
			});
		}

		const result: {
			status: 'success';
			data: T;
			graphQLErrors?: { message: string; extensions?: Record<string, unknown> }[];
		} = {
			status: 'success',
			data: response.data,
		};
		if (this.showErrorsOnSuccess && errorsPayload) {
			result.graphQLErrors = errorsPayload;
		}
		return result;
	}

	private toHttpError<T>(error: { message: string; status?: number; statusText?: string } | Error): GraphQLResult<T> {
		if (error instanceof Error) {
			return this.withErrorNotification({
				status: 'error',
				errorCode: 'NETWORK_ERROR',
				error: error.message,
				networkError: { message: error.message },
			});
		}
		return this.withErrorNotification({
			status: 'error',
			errorCode: 'NETWORK_ERROR',
			error: error.message,
			networkError: { message: error.message, status: error.status, statusText: error.statusText ?? undefined },
		});
	}

	private withErrorNotification(result: GraphQLResult<never> & { status: 'error' }): GraphQLResult<never> {
		const { onError, errorHandler } = this.config;

		if (errorHandler) {
			const err = new Error(result.error);
			const out = errorHandler.handle(err);
			if (out instanceof Promise) {
				out.catch(() => undefined);
			}
		}

		if (onError) {
			onError(result.error);
		}
		return result;
	}
}

function replaceFiles(value: unknown, files: FileEntry[], segments: string[]): unknown {
	if (value instanceof File || value instanceof Blob) {
		files.push({ path: `variables.${segments.join('.')}`, file: value });
		return null;
	}
	if (Array.isArray(value)) {
		return value.map((item, index) => replaceFiles(item, files, [...segments, String(index)]));
	}
	if (value !== null && typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value)) {
			result[key] = replaceFiles(val, files, [...segments, key]);
		}
		return result;
	}
	return value;
}

function extractTypeNames(data: unknown, types: Set<string>): void {
	if (!data || typeof data !== 'object') return;
	if (Array.isArray(data)) {
		for (const item of data) extractTypeNames(item, types);
		return;
	}
	if ('__typename' in data && typeof data['__typename'] === 'string') {
		types.add(data['__typename']);
	}
	for (const v of Object.values(data)) {
		if (v && typeof v === 'object') extractTypeNames(v, types);
	}
}

interface EntityRef {
	__typename: string;
	id: string;
	[key: string]: unknown;
}

function extractEntitiesFromData(data: unknown): EntityRef[] {
	const entities: EntityRef[] = [];
	if (!data || typeof data !== 'object') return entities;
	if (Array.isArray(data)) {
		for (const item of data) entities.push(...extractEntitiesFromData(item));
		return entities;
	}
	const obj = data as Record<string, unknown>;
	if (typeof obj['__typename'] === 'string' && (typeof obj['id'] === 'string' || typeof obj['id'] === 'number')) {
		entities.push({ __typename: obj['__typename'] as string, id: String(obj['id']) });
	}
	for (const v of Object.values(obj)) {
		if (v && typeof v === 'object') entities.push(...extractEntitiesFromData(v));
	}
	return entities;
}

export function createClient(config: ClientConfig, cache?: CacheStore): DumbqlClient {
	return new DumbqlClient(config, cache);
}

function applyPatch(data: unknown, path: (string | number)[], patchData: unknown): unknown {
	if (path.length === 0) return patchData;

	if (!data || typeof data !== 'object') return data;

	if (Array.isArray(data)) {
		const result = [...data];
		const [head, ...rest] = path;
		if (typeof head === 'number') {
			if (head >= result.length) {
				// Extend the array (for @stream appends)
				while (result.length < head) result.push(null);
				result.push(applyPatch(undefined, rest, patchData));
			} else {
				result[head] = applyPatch(result[head], rest, patchData);
			}
		}
		return result;
	}

	const obj = { ...(data as Record<string, unknown>) };
	const [head, ...rest] = path;
	if (typeof head === 'string') {
		obj[head] = applyPatch(obj[head], rest, patchData);
	}
	return obj;
}
