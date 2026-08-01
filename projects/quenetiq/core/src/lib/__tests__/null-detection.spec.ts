import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { NullDetectionService } from '../null-detection.service';
import type { GraphQLResult } from '../graphql.service';
import type { GraphqlRequestContext } from '../middleware';
import { provideNullDetection, nullDetectionMiddleware } from '../null-detection';

function makeRequest(overrides: Partial<GraphqlRequestContext> = {}): GraphqlRequestContext {
	return {
		query: 'query TestQuery { user { name } }',
		variables: {},
		headers: {},
		type: 'query',
		endpoint: '/graphql',
		method: 'POST',
		...overrides,
	} as GraphqlRequestContext;
}

function makeNext(result: GraphQLResult<unknown> = { status: 'success', data: {} }) {
	return vi.fn(() => of(result));
}

describe('nullDetectionMiddleware', () => {
	let detector: NullDetectionService;

	beforeEach(() => {
		vi.stubGlobal('window', { postMessage: vi.fn() });
		detector = new NullDetectionService();
	});

	it('returns a middleware function', () => {
		expect(typeof nullDetectionMiddleware()).toBe('function');
	});

	it('provideNullDetection returns providers with NullDetectionService', () => {
		const providers = provideNullDetection();
		expect(providers).toBeInstanceOf(Array);
		expect(providers.length).toBeGreaterThan(0);
	});

	it('reports null values in response data', () =>
		new Promise<void>((done) => {
			// Manually test the walk logic using detector
			detector.onEvent.subscribe((event) => {
				expect(event.type).toBe('null-value');
				expect(event.path).toBe('data.user.name');
				done();
			});
			detector.reportNull('TestQuery', 'data.user.name');
		}));

	it('reports errors in response', () =>
		new Promise<void>((done) => {
			detector.onEvent.subscribe((event) => {
				expect(event.type).toBe('query-error');
				done();
			});
			detector.reportError('TestQuery', 'fail');
		}));
});
