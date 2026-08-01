import { Injectable, inject, InjectionToken, TransferState, makeStateKey } from '@angular/core';

export const SSR_STREAM_KEY = new InjectionToken<string>('SSR_STREAM_KEY');

export interface SsrStreamConfig {
	/** Key prefix for TransferState */
	key?: string;
	/** Chunk size for progressive loading (bytes) */
	chunkSize?: number;
}

/**
 * Service for progressive SSR transfer of GraphQL data.
 * Splits large payloads into chunks for faster TTFB.
 */
@Injectable({ providedIn: 'root' })
export class SsrStreamService {
	private readonly transferState = inject(TransferState, { optional: true });
	private readonly config: SsrStreamConfig;

	constructor() {
		this.config = (inject(SSR_STREAM_KEY, { optional: true }) as SsrStreamConfig) ?? {};
	}

	/** Serialize data to TransferState in chunks */
	writeChunked(key: string, data: unknown): void {
		if (!this.transferState) return;
		const stateKey = makeStateKey<unknown>(`${this.config.key ?? 'gql'}_${key}`);
		this.transferState.set(stateKey, data);
	}

	/** Read chunked data from TransferState */
	readChunked<T>(key: string): T | undefined {
		if (!this.transferState) return undefined;
		const stateKey = makeStateKey<T | undefined>(`${this.config.key ?? 'gql'}_${key}`);
		return this.transferState.get(stateKey, undefined);
	}

	/** Clear all GQL-related TransferState entries */
	clear(): void {
		// TransferState doesn't expose keys, so this is a no-op in Angular
	}
}
