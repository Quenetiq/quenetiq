import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NullDetectionService } from '../null-detection.service';

describe('NullDetectionService', () => {
	let service: NullDetectionService;

	beforeEach(() => {
		vi.stubGlobal('window', { postMessage: vi.fn() });
		service = new NullDetectionService();
	});

	it('emits null-value event on reportNull', () =>
		new Promise<void>((done) => {
			service.onEvent.subscribe((event) => {
				expect(event.type).toBe('null-value');
				expect(event.path).toBe('data.foo');
				expect(event.operationName).toBe('TestQuery');
				expect(event.message).toBe('Null value at data.foo');
				expect(typeof event.timestamp).toBe('number');
				done();
			});
			service.reportNull('TestQuery', 'data.foo');
		}));

	it('emits query-error event on reportError', () =>
		new Promise<void>((done) => {
			service.onEvent.subscribe((event) => {
				expect(event.type).toBe('query-error');
				expect(event.message).toBe('some error');
				expect(event.operationName).toBe('MyMutation');
				done();
			});
			service.reportError('MyMutation', 'some error');
		}));

	it('sends postMessage to extension', () => {
		const postSpy = vi.fn();
		vi.stubGlobal('window', { postMessage: postSpy });
		service.reportNull('Q', 'data.x');
		expect(postSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				source: 'dumb-keystore-graphql-debug',
				type: 'null-detection',
				payload: expect.objectContaining({ type: 'null-value', path: 'data.x' }),
			}),
			'*',
		);
	});

	it('completes subject on destroy', () => {
		const nextSpy = vi.fn();
		service.onEvent.subscribe({ next: nextSpy, complete: vi.fn() });
		service.ngOnDestroy();
		service.reportNull('Q', 'data.x');
		expect(nextSpy).not.toHaveBeenCalled();
	});

	it('each instance has independent stream', () => {
		const s2 = new NullDetectionService();
		let count = 0;
		service.onEvent.subscribe(() => {
			count++;
		});
		s2.onEvent.subscribe(() => {
			count++;
		});
		s2.reportNull('Q', 'data.x');
		expect(count).toBe(1);
	});
});
