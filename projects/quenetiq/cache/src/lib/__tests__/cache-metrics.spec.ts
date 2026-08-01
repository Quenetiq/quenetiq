import { describe, it, expect, beforeEach } from 'vitest';
import { CacheMetrics } from '../cache-metrics';

describe('CacheMetrics', () => {
	let metrics: CacheMetrics;

	beforeEach(() => {
		metrics = new CacheMetrics();
	});

	it('starts with zero counters', () => {
		expect(metrics.totalReads).toBe(0);
		expect(metrics.totalWrites).toBe(0);
		expect(metrics.totalMerges).toBe(0);
		expect(metrics.totalEvictions).toBe(0);
		expect(metrics.totalGcRuns).toBe(0);
		expect(metrics.totalEntitiesEvicted).toBe(0);
		expect(metrics.hitRate).toBe(0);
	});

	it('recordRead increments totalReads and tracks hits', () => {
		metrics.recordRead(true);
		metrics.recordRead(true);
		metrics.recordRead(false);

		expect(metrics.totalReads).toBe(3);
		expect(metrics.hitRate).toBeCloseTo(2 / 3);
	});

	it('recordRead tracks misses correctly', () => {
		metrics.recordRead(false);
		metrics.recordRead(false);

		expect(metrics.totalReads).toBe(2);
		expect(metrics.hitRate).toBe(0);
	});

	it('recordWrite increments totalWrites', () => {
		metrics.recordWrite();
		metrics.recordWrite();
		metrics.recordWrite();

		expect(metrics.totalWrites).toBe(3);
	});

	it('recordMerge increments totalMerges', () => {
		metrics.recordMerge();
		metrics.recordMerge();

		expect(metrics.totalMerges).toBe(2);
	});

	it('recordEviction increments totalEvictions', () => {
		metrics.recordEviction();
		metrics.recordEviction();

		expect(metrics.totalEvictions).toBe(2);
	});

	it('recordGcRun increments counters', () => {
		metrics.recordGcRun(5);
		metrics.recordGcRun(3);

		expect(metrics.totalGcRuns).toBe(2);
		expect(metrics.totalEntitiesEvicted).toBe(8);
	});

	it('snapshot returns correct values', () => {
		metrics.recordRead(true);
		metrics.recordRead(false);
		metrics.recordWrite();
		metrics.recordMerge();
		metrics.recordEviction();
		metrics.recordGcRun(2);

		const snap = metrics.snapshot(10, 5, 1, 0, 3, 1024);

		expect(snap.totalReads).toBe(2);
		expect(snap.totalWrites).toBe(1);
		expect(snap.totalMerges).toBe(1);
		expect(snap.totalEvictions).toBe(1);
		expect(snap.totalGcRuns).toBe(1);
		expect(snap.totalEntitiesEvicted).toBe(2);
		expect(snap.hitRate).toBeCloseTo(0.5);
		expect(snap.currentEntityCount).toBe(10);
		expect(snap.currentRefCountTotal).toBe(5);
		expect(snap.currentDanglingCount).toBe(1);
		expect(snap.localStateCount).toBe(3);
		expect(snap.sizeEstimateBytes).toBe(1024);
	});

	it('hitRate is 0 when no reads', () => {
		expect(metrics.hitRate).toBe(0);
	});

	it('hitRate is 1 when all reads are hits', () => {
		metrics.recordRead(true);
		metrics.recordRead(true);
		metrics.recordRead(true);

		expect(metrics.hitRate).toBe(1);
	});

	it('reset() zeroes all counters', () => {
		metrics.recordRead(true);
		metrics.recordWrite();
		metrics.recordMerge();
		metrics.recordEviction();
		metrics.recordGcRun(5);

		metrics.reset();

		expect(metrics.totalReads).toBe(0);
		expect(metrics.totalWrites).toBe(0);
		expect(metrics.totalMerges).toBe(0);
		expect(metrics.totalEvictions).toBe(0);
		expect(metrics.totalGcRuns).toBe(0);
		expect(metrics.totalEntitiesEvicted).toBe(0);
		expect(metrics.hitRate).toBe(0);
	});
});
