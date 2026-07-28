import { describe, it, expect, vi } from 'vitest';
import { otelMiddleware, otelClientMiddleware } from './middleware';
import { MinimalTracer, setTracer } from './tracer';
import { Observable, of } from 'rxjs';

function makeNext() {
	return vi.fn((req: any) => of({ status: 'success', data: {} }) as Observable<any>);
}

describe('otelMiddleware', () => {
	it('returns a middleware function', () => {
		const mw = otelMiddleware();
		expect(typeof mw).toBe('function');
	});

	it('adds traceparent header when tracer is configured', () => {
		const tracer = new MinimalTracer({ serviceName: 'test' });
		const mw = otelMiddleware({ tracer });
		const next = makeNext();
		const request = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query' as const,
		};
		(mw as any)(request, next);
		expect(next).toHaveBeenCalled();
		const calledReq = next.mock.calls[0][0] as any;
		expect(calledReq.headers.traceparent).toMatch(/^[0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
	});

	it('works without a tracer (no-op)', () => {
		const mw = otelMiddleware();
		const next = makeNext();
		const request = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query' as const,
		};
		(mw as any)(request, next);
		expect(next).toHaveBeenCalled();
	});

	it('uses the global tracer when set', () => {
		const tracer = new MinimalTracer({ serviceName: 'global' });
		setTracer(tracer);
		const mw = otelMiddleware();
		const next = makeNext();
		const request = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query' as const,
		};
		(mw as any)(request, next);
		const calledReq = next.mock.calls[0][0] as any;
		expect(calledReq.headers.traceparent).toBeDefined();
	});
});

describe('otelClientMiddleware', () => {
	it('returns a promise-based middleware', async () => {
		const mw = otelClientMiddleware();
		const next = vi.fn(async (req: any) => ({ status: 'success', data: {} }));
		const request = {
			query: 'query { hi }',
			variables: {},
			headers: {},
			type: 'query' as const,
		};
		const result = await mw(request, next);
		expect(result).toEqual({ status: 'success', data: {} });
	});
});
