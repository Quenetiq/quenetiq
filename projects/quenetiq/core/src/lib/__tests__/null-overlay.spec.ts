import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NullDetectionService } from '../null-detection.service';

// The NullOverlay is an Angular component with inline template.
// We test the underlying service integration here.

describe('NullOverlay integration', () => {
	let detector: NullDetectionService;

	beforeEach(() => {
		detector = new NullDetectionService();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reports null and triggers visibility', () =>
		new Promise<void>((done) => {
			detector.onEvent.subscribe((event) => {
				expect(event.type).toBe('null-value');
				expect(event.path).toBe('data.foo');
				done();
			});
			detector.reportNull('Q', 'data.foo');
		}));

	it('reports error and triggers visibility', () =>
		new Promise<void>((done) => {
			detector.onEvent.subscribe((event) => {
				expect(event.type).toBe('query-error');
				expect(event.message).toBe('err');
				done();
			});
			detector.reportError('Q', 'err');
		}));

	it('handles multiple events', () => {
		const spy = vi.fn();
		detector.onEvent.subscribe(spy);
		detector.reportNull('Q1', 'data.a');
		detector.reportError('Q2', 'err');
		expect(spy).toHaveBeenCalledTimes(2);
	});
});
