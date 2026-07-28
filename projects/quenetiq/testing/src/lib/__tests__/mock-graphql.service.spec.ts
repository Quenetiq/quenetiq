import { describe, it, expect, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';

vi.mock('@angular/core', () => ({
	Injectable: () => (target: unknown) => target,
}));

vi.mock('@quenetiq/core', () => ({
	print: (doc: unknown) => (typeof doc === 'string' ? doc : ''),
}));

import { MockGraphqlService } from '../mock-graphql.service';

describe('MockGraphqlService', () => {
	it('returns error when no mock configured', async () => {
		const svc = new MockGraphqlService();
		const result = await firstValueFrom(svc.query('query { user }'));
		expect(result.status).toBe('error');
		expect(result.error).toBe('No mock response configured');
	});

	it('returns mocked response for matching query', async () => {
		const svc = new MockGraphqlService();
		svc.when(
			{ query: 'query { user }' },
			{ status: 'success', data: { name: 'Alice' } },
		);

		const result = await firstValueFrom(svc.query('query { user }'));
		expect(result.status).toBe('success');
		expect(result.data).toEqual({ name: 'Alice' });
	});

	it('pops responses in order (FIFO)', async () => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'q' }, { status: 'success', data: 1 });
		svc.when({ query: 'q' }, { status: 'success', data: 2 });

		const r1 = await firstValueFrom(svc.query('q'));
		expect(r1.data).toBe(1);
		const r2 = await firstValueFrom(svc.query('q'));
		expect(r2.data).toBe(2);
	});

	it('falls back to default after consuming all mocks', async () => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'q' }, { status: 'success', data: 'ok' });

		await firstValueFrom(svc.query('q'));
		const result = await firstValueFrom(svc.query('q'));
		expect(result.status).toBe('error');
	});

	it('mutate delegates to query mock', async () => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'mutation { create }' }, { status: 'success', data: { id: '1' } });

		const result = await firstValueFrom(svc.mutate('mutation { create }'));
		expect(result.status).toBe('success');
	});

	it('refetch delegates to query mock', async () => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'query { x }' }, { status: 'success', data: 42 });

		const result = await firstValueFrom(svc.refetch('query { x }'));
		expect(result.data).toBe(42);
	});

	it('matches by variables too', async () => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'q', variables: { id: '1' } }, { status: 'success', data: 'a' });
		svc.when({ query: 'q', variables: { id: '2' } }, { status: 'success', data: 'b' });

		const result = await firstValueFrom(svc.query('q', { id: '2' }));
		expect(result.data).toBe('b');
	});

	it('delays response when delay is set', async () => {
		const svc = new MockGraphqlService();
		svc.when({ query: 'q' }, { status: 'success', data: 'delayed', delay: 50 });

		const start = Date.now();
		await firstValueFrom(svc.query('q'));
		expect(Date.now() - start).toBeGreaterThanOrEqual(40);
	});
});
