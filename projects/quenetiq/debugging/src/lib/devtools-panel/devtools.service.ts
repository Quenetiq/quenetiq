import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, type Observable } from 'rxjs';
import { type GraphqlDebugEntry } from '../graphql-debug.service';
import { GraphqlDebugService } from '../graphql-debug.service';

export type DevToolsTab = 'queries' | 'cache' | 'errors' | 'metrics';

export interface CacheSnapshot {
	typename: string;
	id: string;
	fields: Record<string, unknown>;
	createdAt?: number;
	updatedAt?: number;
	source?: string;
	mergeCount?: number;
	ageMs?: number;
	staleness?: 'fresh' | 'stale';
}

export interface CacheMetricsSnapshot {
	totalReads: number;
	totalWrites: number;
	totalMerges: number;
	totalEvictions: number;
	totalGcRuns: number;
	totalEntitiesEvicted: number;
	totalErrors: number;
	hitRate: number;
	currentEntityCount: number;
	currentRefCountTotal: number;
	currentDanglingCount: number;
	optimisticUpdateCount: number;
	localStateCount: number;
	sizeEstimateBytes: number;
	totalReadTimeMs: number;
	totalMergeTimeMs: number;
}

@Injectable({ providedIn: 'root' })
export class DevToolsService {
	private readonly debugSvc = inject(GraphqlDebugService);

	readonly visible = new BehaviorSubject(false);
	readonly activeTab = new BehaviorSubject<DevToolsTab>('queries');
	readonly cacheSnapshot = new BehaviorSubject<CacheSnapshot[]>([]);
	readonly cacheMetrics = new BehaviorSubject<CacheMetricsSnapshot | null>(null);

	visible$: Observable<boolean> = this.visible.asObservable();
	activeTab$: Observable<DevToolsTab> = this.activeTab.asObservable();
	cacheSnapshot$: Observable<CacheSnapshot[]> = this.cacheSnapshot.asObservable();
	cacheMetrics$: Observable<CacheMetricsSnapshot | null> = this.cacheMetrics.asObservable();

	get cacheSnapshotValue(): CacheSnapshot[] {
		return this.cacheSnapshot.value;
	}

	private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

	init(): void {
		if (typeof document === 'undefined' || this.keyboardHandler) return;

		this.keyboardHandler = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
				e.preventDefault();
				this.toggle();
			}
		};
		document.addEventListener('keydown', this.keyboardHandler);
	}

	destroy(): void {
		if (this.keyboardHandler) {
			document.removeEventListener('keydown', this.keyboardHandler);
			this.keyboardHandler = null;
		}
	}

	toggle(): void {
		this.visible.next(!this.visible.value);
		if (this.visible.value) {
			this.snapshotCache();
		}
	}

	open(): void {
		this.visible.next(true);
		this.snapshotCache();
	}

	close(): void {
		this.visible.next(false);
	}

	setTab(tab: DevToolsTab): void {
		this.activeTab.next(tab);
		if (tab === 'cache') {
			this.snapshotCache();
		}
		if (tab === 'metrics') {
			this.snapshotMetrics();
		}
	}

	get entries(): GraphqlDebugEntry[] {
		return this.debugSvc.entries;
	}

	private getCacheStore(): Promise<{
		cache?: { all: () => Map<string, unknown>; explain?: (typename: string, id: string) => unknown };
		metrics?: { snapshot: (...args: unknown[]) => CacheMetricsSnapshot };
		localSize?: () => number;
		allKeys?: () => string[];
	} | null> {
		return import('@quenetiq/cache/angular')
			.then(({ CacheService }) => {
				const svc = this.debugSvc as unknown as {
					svc: { injector: { get: <T>(token: unknown, opts?: { optional?: boolean }) => T | null } };
				};
				const injector = svc?.svc?.injector;
				if (!injector) return null;
				return injector.get(CacheService, { optional: true }) as {
					cache?: { all: () => Map<string, unknown>; explain?: (typename: string, id: string) => unknown };
					metrics?: { snapshot: (...args: unknown[]) => CacheMetricsSnapshot };
					localSize?: () => number;
					allKeys?: () => string[];
				} | null;
			})
			.catch(() => null);
	}

	private snapshotCache(): void {
		this.getCacheStore().then((cache) => {
			if (!cache?.cache) return;

			const snapshot: CacheSnapshot[] = [];
			const allEntries = cache.cache.all();
			const now = Date.now();
			for (const [key, value] of allEntries) {
				const entity = value as Record<string, unknown> & { __typename?: string; id?: string };
				const typename = entity.__typename ?? '(unknown)';
				const id = entity.id ?? key;

				const entry: CacheSnapshot = {
					typename,
					id,
					fields: entity,
				};

				// Enrich with metadata if explain() is available
				if (cache.cache.explain) {
					try {
						const info = cache.cache.explain(typename, id) as {
							meta?: { createdAt?: number; updatedAt?: number; source?: string; mergeCount?: number };
							ageMs?: number;
							staleness?: 'fresh' | 'stale';
						} | undefined;
						if (info?.meta) {
							entry.createdAt = info.meta.createdAt;
							entry.updatedAt = info.meta.updatedAt;
							entry.source = info.meta.source;
							entry.mergeCount = info.meta.mergeCount;
						}
						if (info?.ageMs !== undefined) entry.ageMs = now - info.ageMs;
						if (info?.staleness) entry.staleness = info.staleness;
					} catch {
						// explain is best-effort
					}
				}

				snapshot.push(entry);
			}
			this.cacheSnapshot.next(snapshot);
		});
	}

	private snapshotMetrics(): void {
		this.getCacheStore().then((cacheService) => {
			if (!cacheService?.metrics) return;

			const entityCount = cacheService.cache?.all()?.size ?? 0;
			const localState = cacheService.localSize?.() ?? 0;

			try {
				const metrics = cacheService.metrics.snapshot(entityCount, 0, 0, 0, localState, 0);
				this.cacheMetrics.next(metrics);
			} catch {
				// metrics snapshot is best-effort
			}
		});
	}

	getQueryCount(): number {
		return this.debugSvc.entries.length;
	}

	getErrorCount(): number {
		return this.debugSvc.entries.filter((e) => e.result.status === 'error').length;
	}
}
