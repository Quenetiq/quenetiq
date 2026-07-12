import type { GraphqlRequestContext, GraphqlMiddlewareNext, GraphqlMiddleware } from './middleware';

// ─── Query Log Entry ──────────────────────────────────────────────────────

export interface QueryLogEntry {
	readonly id: number;
	readonly timestamp: number;
	readonly type: 'query' | 'mutation' | 'subscription';
	readonly operationName: string | undefined;
	readonly query: string;
	readonly variables: Record<string, unknown> | undefined;
	readonly durationMs: number;
	readonly status: 'success' | 'error';
	readonly error?: string;
	readonly fromCache: boolean;
	readonly size: number;
}

// ─── DevTools State ────────────────────────────────────────────────────────

export interface DevToolsState {
	readonly queries: QueryLogEntry[];
	readonly cacheHits: number;
	readonly networkRequests: number;
	readonly totalDurationMs: number;
}

let nextId = 1;

function extractOperationName(query: string): string | undefined {
	const match = query.match(/(?:query|mutation|subscription)\s+(\w+)/);
	return match?.[1];
}

function estimateSize(data: unknown): number {
	try {
		return JSON.stringify(data).length;
	} catch {
		return 0;
	}
}

// ─── DevTools Middleware ───────────────────────────────────────────────────

export interface DevToolsConfig {
	readonly maxEntries?: number;
	readonly onEntry?: (entry: QueryLogEntry) => void;
}

export function devToolsMiddleware(config?: DevToolsConfig): {
	middleware: GraphqlMiddleware;
	getLog: () => QueryLogEntry[];
	getState: () => DevToolsState;
	clearLog: () => void;
} {
	const maxEntries = config?.maxEntries ?? 100;
	const entries: QueryLogEntry[] = [];
	let cacheHits = 0;
	let networkRequests = 0;
	let totalDuration = 0;

	const middleware: GraphqlMiddleware = async (
		request: GraphqlRequestContext,
		next: GraphqlMiddlewareNext<unknown>,
	) => {
		const id = nextId++;
		const startTime = performance.now();
		const operationName = extractOperationName(request.query);

		try {
			const result = await next(request);
			const durationMs = Math.round(performance.now() - startTime);
			const status = result.status === 'success' ? 'success' : 'error';
			const fromCache = 'fromCache' in result ? Boolean(result['fromCache']) : false;
			const size = result.status === 'success' ? estimateSize(result.data) : 0;

			if (fromCache) {
				cacheHits++;
			} else {
				networkRequests++;
			}
			totalDuration += durationMs;

			const entry: QueryLogEntry = {
				id,
				timestamp: Date.now(),
				type: request.type,
				operationName,
				query: request.query,
				variables: request.variables,
				durationMs,
				status,
				error: result.status === 'error' ? result.error : undefined,
				fromCache,
				size,
			};

			entries.unshift(entry);
			if (entries.length > maxEntries) {
				entries.length = maxEntries;
			}

			config?.onEntry?.(entry);

			return result;
		} catch (err) {
			const durationMs = Math.round(performance.now() - startTime);
			totalDuration += durationMs;
			networkRequests++;

			const entry: QueryLogEntry = {
				id,
				timestamp: Date.now(),
				type: request.type,
				operationName,
				query: request.query,
				variables: request.variables,
				durationMs,
				status: 'error',
				error: err instanceof Error ? err.message : 'Unknown error',
				fromCache: false,
				size: 0,
			};

			entries.unshift(entry);
			if (entries.length > maxEntries) {
				entries.length = maxEntries;
			}

			config?.onEntry?.(entry);

			throw err;
		}
	};

	const getLog = (): QueryLogEntry[] => [...entries];

	const getState = (): DevToolsState => ({
		queries: getLog(),
		cacheHits,
		networkRequests,
		totalDurationMs: totalDuration,
	});

	const clearLog = (): void => {
		entries.length = 0;
		cacheHits = 0;
		networkRequests = 0;
		totalDuration = 0;
	};

	return { middleware, getLog, getState, clearLog };
}
