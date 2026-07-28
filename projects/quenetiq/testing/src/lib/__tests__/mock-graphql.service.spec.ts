import { describe, it, expect, vi } from 'vitest';

vi.mock('@angular/core', () => ({
	Injectable: () => (target: unknown) => target,
}));

vi.mock('@quenetiq/core', () => ({
	print: (doc: unknown) => (typeof doc === 'string' ? doc : ''),
}));

import { MockGraphqlService } from '../mock-graphql.service';

describe('MockGraphqlService', () => {
	it('returns error when no mock configured', (done) => {
		const svc = new MockGraphqlService();
		svc.query('query { user }').subscribe((result) => {
			expect(result.status).toBe('error');
			expect(result.error).toBe('No mock response configured');
			done();
		});
	});

	it('returns mocked response for matching query', (done) => {
		const svc = new MockGraphqlService();
		svc.when(
			{ query: 'query { user }' },
			{ status: 'success', data: { name: 'Alice' } },
		);

		svc.query('query { user }').subscribe((result) => {
			expect(result.status).toBe('success');
			expect(result.data).toEqual({ name: 'Alice' });
			done();
		});
	});

	it('pops responses in order (FIFO)', (done) => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'q' }, { status: 'success', data: 1 });
		svc.when({ query: 'q' }, { status: 'success', data: 2 });

		svc.query('q').subscribe((r1) => {
			expect(r1.data).toBe(1);
			svc.query('q').subscribe((r2) => {
				expect(r2.data).toBe(2);
				done();
			});
		});
	});

	it('falls back to default after consuming all mocks', (done) => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'q' }, { status: 'success', data: 'ok' });

		svc.query('q').subscribe(() => {
			svc.query('q').subscribe((result) => {
				expect(result.status).toBe('error');
				done();
			});
		});
	});

	it('mutate delegates to query mock', (done) => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'mutation { create }' }, { status: 'success', data: { id: '1' } });

		svc.mutate('mutation { create }').subscribe((result) => {
			expect(result.status).toBe('success');
			done();
		});
	});

	it('refetch delegates to query mock', (done) => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'query { x }' }, { status: 'success', data: 42 });

		svc.refetch('query { x }').subscribe((result) => {
			expect(result.data).toBe(42);
			done();
		});
	});

	it('matches by variables too', (done) => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'q', variables: { id: '1' } }, { status: 'success', data: 'a' });
		svc.when({ query: 'q', variables: { id: '2' } }, { status: 'success', data: 'b' });

		svc.query('q', { id: '2' }).subscribe((result) => {
			expect(result.data).toBe('b');
			done();
		});
	});

	it('delays response when delay is set', (done) => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'q' }, { status: 'success', data: 'delayed', delay: 50 });

		const start = Date.now();
		svc.query('q').subscribe(() => {
			expect(Date.now() - start).toBeGreaterThanOrEqual(40);
			done();
		});
	});
});
