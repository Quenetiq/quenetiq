import { describe, it, expect, vi } from 'vitest';
import type { App } from 'vue';
import { registerDirectives } from '../directives';

function captureDirectives() {
	const defs: Record<string, any> = {};
	const app = {
		directive: (name: string, def: any) => {
			defs[name] = def;
		},
	} as unknown as App;
	return { app, defs };
}

describe('registerDirectives', () => {
	it('registers dql-mutate and dql-loading directives', () => {
		const directive = vi.fn();
		const app = { directive } as unknown as App;

		registerDirectives(app, {} as any);

		expect(directive).toHaveBeenCalledTimes(2);
		expect(directive).toHaveBeenCalledWith('dql-mutate', expect.objectContaining({ mounted: expect.any(Function) }));
		expect(directive).toHaveBeenCalledWith(
			'dql-loading',
			expect.objectContaining({ mounted: expect.any(Function), updated: expect.any(Function) }),
		);
	});

	describe('v-dql-mutate', () => {
		it('calls client.mutate on click with { mutation, variables }', async () => {
			const client = { mutate: vi.fn().mockResolvedValue({ status: 'success', data: {} }) };
			const { app, defs } = captureDirectives();
			registerDirectives(app, client as any);

			const addEventListener = vi.fn();
			defs['dql-mutate'].mounted(
				{ style: {}, addEventListener },
				{ value: { mutation: 'mutation { x }', variables: { id: 1 } } },
			);

			const handler = addEventListener.mock.calls[0][1];
			await handler();
			expect(client.mutate).toHaveBeenCalledWith('mutation { x }', { id: 1 });
		});

		it('accepts bare string as mutation', async () => {
			const client = { mutate: vi.fn().mockResolvedValue({ status: 'success', data: {} }) };
			const { app, defs } = captureDirectives();
			registerDirectives(app, client as any);

			const addEventListener = vi.fn();
			defs['dql-mutate'].mounted({ style: {}, addEventListener }, { value: 'mutation { x }' });

			const handler = addEventListener.mock.calls[0][1];
			await handler();
			expect(client.mutate).toHaveBeenCalledWith('mutation { x }', undefined);
		});
	});

	describe('v-dql-loading', () => {
		it('adds class on mount when truthy', () => {
			const { app, defs } = captureDirectives();
			registerDirectives(app, {} as any);

			const classList = { add: vi.fn(), toggle: vi.fn() };
			defs['dql-loading'].mounted({ classList }, { value: true });
			expect(classList.add).toHaveBeenCalledWith('dql-loading');
		});

		it('toggles class on update', () => {
			const { app, defs } = captureDirectives();
			registerDirectives(app, {} as any);

			const classList = { add: vi.fn(), toggle: vi.fn() };
			defs['dql-loading'].updated({ classList }, { value: false, oldValue: true });
			expect(classList.toggle).toHaveBeenCalledWith('dql-loading', false);
		});

		it('does not add class on mount when falsy', () => {
			const { app, defs } = captureDirectives();
			registerDirectives(app, {} as any);

			const classList = { add: vi.fn(), toggle: vi.fn() };
			defs['dql-loading'].mounted({ classList }, { value: false });
			expect(classList.add).not.toHaveBeenCalled();
		});
	});
});
