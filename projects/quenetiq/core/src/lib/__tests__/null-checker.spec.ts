import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NullDetectionService } from '../null-detection.service';

class FakeChecker {
	detector: NullDetectionService | null = null;

	checkResponse(data: unknown, operationName?: string): void {
		if (!this.detector) return;
		walkObject(data, 'data', operationName, this.detector);
	}

	reportError(operationName: string | undefined, message: string): void {
		this.detector?.reportError(operationName, message);
	}
}

function walkObject(
	obj: unknown,
	path: string,
	operationName: string | undefined,
	detector: NullDetectionService,
): void {
	if (obj === null) {
		detector.reportNull(operationName, path);
		return;
	}
	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			walkObject(obj[i], `${path}[${i}]`, operationName, detector);
		}
		return;
	}
	if (typeof obj === 'object' && obj !== null) {
		for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
			walkObject(value, `${path}.${key}`, operationName, detector);
		}
	}
}

describe('NullCheckerService', () => {
	let detector: NullDetectionService;
	let checker: FakeChecker;

	beforeEach(() => {
		vi.stubGlobal('window', { postMessage: vi.fn() });
		detector = new NullDetectionService();
		checker = new FakeChecker();
		checker.detector = detector;
	});

	it('reports null values via checkResponse', () =>
		new Promise<void>((done) => {
			detector.onEvent.subscribe((event) => {
				expect(event.type).toBe('null-value');
				expect(event.path).toBe('data.user.name');
				done();
			});
			checker.checkResponse({ user: { name: null } }, 'TestQuery');
		}));

	it('reports null in arrays', () =>
		new Promise<void>((done) => {
			detector.onEvent.subscribe((event) => {
				expect(event.path).toBe('data.items[1]');
				done();
			});
			checker.checkResponse({ items: ['a', null, 'c'] }, 'Q');
		}));

	it('reports error via reportError', () =>
		new Promise<void>((done) => {
			detector.onEvent.subscribe((event) => {
				expect(event.type).toBe('query-error');
				expect(event.message).toBe('fail');
				done();
			});
			checker.reportError('Q', 'fail');
		}));

	it('does nothing when detector is null', () => {
		checker.detector = null;
		expect(() => checker.checkResponse({ x: null }, 'Q')).not.toThrow();
	});

	it('does nothing for primitive response', () => {
		const spy = vi.spyOn(detector, 'reportNull');
		checker.checkResponse('string', 'Q');
		expect(spy).not.toHaveBeenCalled();
	});
});
