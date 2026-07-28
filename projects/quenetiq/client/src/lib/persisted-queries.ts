import type { PersistedQueriesConfig } from './config';

// ─── Hash computation ──────────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = new Uint8Array(hashBuffer);
	return Array.from(hashArray).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function simpleHash(input: string): string {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		const char = input.charCodeAt(i);
		hash = ((hash << 5) - hash + char) | 0;
	}
	return Math.abs(hash).toString(16);
}

export async function computeHash(query: string, algorithm: 'sha256' | 'simple' = 'sha256'): Promise<string> {
	return algorithm === 'sha256' ? sha256Hex(query) : simpleHash(query);
}

// ─── Persisted Query Registry ─────────────────────────────────────────────

export class PersistedQueryRegistry {
	private hashToQuery = new Map<string, string>();
	private queryToHash = new Map<string, string>();
	private registeredHashes = new Set<string>();

	constructor(private config: PersistedQueriesConfig) {}

	/** Compute hash and register the query locally. */
	register(query: string): string {
		const existingHash = this.queryToHash.get(query);
		if (existingHash) return existingHash;

		// Use a placeholder; actual async hash is done via registerAsync
		const hash = simpleHash(query);
		this.hashToQuery.set(hash, query);
		this.queryToHash.set(query, hash);
		return hash;
	}

	/** Register query with full hash computation (async). */
	async registerAsync(query: string): Promise<string> {
		const existingHash = this.queryToHash.get(query);
		if (existingHash) return existingHash;

		const hash = await computeHash(query, this.config.hash ?? 'sha256');
		this.hashToQuery.set(hash, query);
		this.queryToHash.set(query, hash);
		return hash;
	}

	/** Mark a hash as successfully registered with the server. */
	markRegistered(hash: string): void {
		this.registeredHashes.add(hash);
	}

	/** Check if hash is already registered with the server. */
	isRegistered(hash: string): boolean {
		return this.registeredHashes.has(hash);
	}

	/** Get query body by hash. */
	getQuery(hash: string): string | undefined {
		return this.hashToQuery.get(hash);
	}

	/** Get hash by query body. */
	getHash(query: string): string | undefined {
		return this.queryToHash.get(query);
	}

	/** Clear all registered state. */
	clear(): void {
		this.registeredHashes.clear();
	}
}

// ─── APQ Request Helpers ───────────────────────────────────────────────────

export interface ApqHashPayload {
	readonly persistedQuery: {
		readonly version: 1;
		readonly sha256Hash: string;
	};
}

/** Build the extensions payload for a hash-only request. */
export function buildApqPayload(hash: string): ApqHashPayload {
	return {
		persistedQuery: {
			version: 1,
			sha256Hash: hash,
		},
	};
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Check if a response indicates "query not found" (needs full query re-send). */
export function isPersistedQueryNotFound(response: unknown): boolean {
	if (!isNonNullObject(response)) return false;
	const errors = response['errors'];
	if (!Array.isArray(errors)) return false;
	return errors.some(
		(e: unknown) =>
			isNonNullObject(e) &&
			'message' in e &&
			typeof e['message'] === 'string' &&
			e['message'].includes('PersistedQueryNotFound'),
	);
}
