import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer, isPlatformBrowser } from '@angular/common';
import { SsrStreamService } from './ssr-stream';
import { type CacheService } from '@quenetiq/cache/angular';

@Injectable({ providedIn: 'root' })
export class TransferCacheService {
	private readonly platformId = inject(PLATFORM_ID);
	private readonly streamSvc = inject(SsrStreamService);

	/** Save cache state for transfer to browser */
	save(cache: CacheService): void {
		if (!isPlatformServer(this.platformId)) return;
		this.streamSvc.writeChunked('cache', cache.serialize());
	}

	/** Restore cache state from SSR transfer */
	restore(cache: CacheService): boolean {
		if (!isPlatformBrowser(this.platformId)) return false;
		const data = this.streamSvc.readChunked<string>('cache');
		if (!data) return false;
		try {
			cache.deserialize(data);
			return true;
		} catch {
			return false;
		}
	}
}
