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

export class CacheMetrics {
	totalReads = 0;
	totalWrites = 0;
	totalMerges = 0;
	totalEvictions = 0;
	totalGcRuns = 0;
	totalEntitiesEvicted = 0;
	totalErrors = 0;
	totalReadTimeMs = 0;
	totalMergeTimeMs = 0;
	private hits = 0;
	private misses = 0;

	recordRead(hit: boolean): void {
		this.totalReads++;
		if (hit) this.hits++;
		else this.misses++;
	}

	recordWrite(): void {
		this.totalWrites++;
	}

	recordMerge(): void {
		this.totalMerges++;
	}

	recordEviction(): void {
		this.totalEvictions++;
	}

	recordGcRun(evicted: number): void {
		this.totalGcRuns++;
		this.totalEntitiesEvicted += evicted;
	}

	recordError(): void {
		this.totalErrors++;
	}

	recordReadTime(ms: number): void {
		this.totalReadTimeMs += ms;
	}

	recordMergeTime(ms: number): void {
		this.totalMergeTimeMs += ms;
	}

	get hitRate(): number {
		const total = this.hits + this.misses;
		return total === 0 ? 0 : this.hits / total;
	}

	snapshot(
		entityCount: number,
		refCountTotal: number,
		danglingCount: number,
		optimisticCount: number,
		localStateCount: number,
		sizeEstimate: number,
	): CacheMetricsSnapshot {
		return {
			totalReads: this.totalReads,
			totalWrites: this.totalWrites,
			totalMerges: this.totalMerges,
			totalEvictions: this.totalEvictions,
			totalGcRuns: this.totalGcRuns,
			totalEntitiesEvicted: this.totalEntitiesEvicted,
			totalErrors: this.totalErrors,
			hitRate: this.hitRate,
			currentEntityCount: entityCount,
			currentRefCountTotal: refCountTotal,
			currentDanglingCount: danglingCount,
			optimisticUpdateCount: optimisticCount,
			localStateCount,
			sizeEstimateBytes: sizeEstimate,
			totalReadTimeMs: this.totalReadTimeMs,
			totalMergeTimeMs: this.totalMergeTimeMs,
		};
	}

	reset(): void {
		this.totalReads = 0;
		this.totalWrites = 0;
		this.totalMerges = 0;
		this.totalEvictions = 0;
		this.totalGcRuns = 0;
		this.totalEntitiesEvicted = 0;
		this.totalErrors = 0;
		this.totalReadTimeMs = 0;
		this.totalMergeTimeMs = 0;
		this.hits = 0;
		this.misses = 0;
	}
}
