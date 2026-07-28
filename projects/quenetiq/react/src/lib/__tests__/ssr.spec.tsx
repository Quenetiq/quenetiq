import { describe, it, expect, vi } from 'vitest';
import { getDataFromTree, renderToStringWithData, extractSSRData } from '../ssr/get-data-from-tree';
import { createSSRState, useSSRState, SSRContextProvider } from '../ssr/ssr-context';

describe('getDataFromTree', () => {
	it('renders a simple component to string', async () => {
		const { createElement: h } = await import('react');
		const tree = h('div', null, 'Hello');
		const html = await getDataFromTree(tree);
		expect(html).toContain('Hello');
	});

	it('renders nested components', async () => {
		const { createElement: h } = await import('react');
		const tree = h('div', null,
			h('span', null, 'One'),
			h('span', null, 'Two'),
		);
		const html = await getDataFromTree(tree);
		expect(html).toContain('One');
		expect(html).toContain('Two');
	});

	it('returns empty string for empty tree', async () => {
		const { createElement: h } = await import('react');
		const tree = h('div', null);
		const html = await getDataFromTree(tree);
		expect(html).toBe('<div></div>');
	});
});

describe('renderToStringWithData', () => {
	it('returns both html and ssrContext', async () => {
		const { createElement: h } = await import('react');
		const tree = h('div', null, 'SSR');
		const { html, ssrContext } = await renderToStringWithData(tree);

		expect(html).toContain('SSR');
		expect(ssrContext).toBeDefined();
		expect(ssrContext.results).toBeInstanceOf(Map);
	});

	it('creates a fresh SSRContext each call', async () => {
		const { createElement: h } = await import('react');
		const tree = h('div', null, 'A');

		const { ssrContext: ctx1 } = await renderToStringWithData(tree);
		const { ssrContext: ctx2 } = await renderToStringWithData(tree);

		expect(ctx1).not.toBe(ctx2);
	});
});

describe('extractSSRData', () => {
	it('converts Map to plain object', () => {
		const ctx = createSSRState();
		ctx.results.set('query1', { status: 'success', data: { hello: 'world' } });
		ctx.results.set('query2', { status: 'error', error: 'fail' });

		const data = extractSSRData(ctx);

		expect(data).toEqual({
			query1: { status: 'success', data: { hello: 'world' } },
			query2: { status: 'error', error: 'fail' },
		});
	});

	it('returns empty object for empty results', () => {
		const ctx = createSSRState();
		const data = extractSSRData(ctx);
		expect(data).toEqual({});
	});

	it('returns JSON-serializable object', () => {
		const ctx = createSSRState();
		ctx.results.set('q', { status: 'success', data: { nested: { arr: [1, 2, 3] } } });

		const data = extractSSRData(ctx);
		const json = JSON.stringify(data);
		const parsed = JSON.parse(json);

		expect(parsed).toEqual(data);
	});
});

describe('createSSRState', () => {
	it('creates state with empty results map', () => {
		const state = createSSRState();
		expect(state.results).toBeInstanceOf(Map);
		expect(state.results.size).toBe(0);
	});
});

describe('useSSRState', () => {
	it('returns null when no provider', async () => {
		const { renderHook } = await import('@testing-library/react');
		const { useSSRState } = await import('../ssr/ssr-context');

		const { result } = renderHook(() => useSSRState());
		expect(result.current).toBeNull();
	});
});

describe('SSRContextProvider', () => {
	it('renders children', async () => {
		const { createElement: h } = await import('react');
		const { renderToString } = await import('react-dom/server');

		const tree = h(SSRContextProvider, null, h('div', null, 'child'));
		const html = renderToString(tree);

		expect(html).toContain('child');
	});
});
