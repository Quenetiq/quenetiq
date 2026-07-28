// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useEpicFetus } from '../use-epic-fetus';

const EXT_SOURCE = 'dumb-keystore-graphql-debug';

function postMessage(data: any, source: Window | null = window) {
	window.dispatchEvent(
		new MessageEvent('message', {
			data,
			source,
		}),
	);
}

function makePayload(type: string, payload: any) {
	return {
		source: EXT_SOURCE,
		type: 'null-detection',
		payload,
	};
}

const TestComponent = defineComponent({
	setup() {
		const info = useEpicFetus();
		return { info };
	},
	render() {
		if (this.info) {
			return h('div', { 'data-testid': 'info' }, this.info.message);
		}
		return h('div', { 'data-testid': 'empty' }, 'empty');
	},
});

describe('useEpicFetus', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns null initially', () => {
		const wrapper = mount(TestComponent);

		expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="info"]').exists()).toBe(false);
	});

	it('captures null-detection messages from the extension', async () => {
		const wrapper = mount(TestComponent);

		postMessage(
			makePayload('null-detection', {
				type: 'null-value',
				message: 'Found null at path $.user.name',
				path: '$.user.name',
			}),
		);
		await nextTick();

		expect(wrapper.find('[data-testid="info"]').text()).toBe('Found null at path $.user.name');
	});

	it('ignores messages from wrong source', async () => {
		const wrapper = mount(TestComponent);

		postMessage(makePayload('null-detection', { message: 'should be ignored' }), null);
		await nextTick();

		expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
	});

	it('ignores messages with wrong source identifier', async () => {
		const wrapper = mount(TestComponent);

		postMessage({
			source: 'wrong-source',
			type: 'null-detection',
			payload: { message: 'bad' },
		});
		await nextTick();

		expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
	});

	it('ignores messages with wrong type', async () => {
		const wrapper = mount(TestComponent);

		postMessage({
			source: EXT_SOURCE,
			type: 'other-type',
			payload: { message: 'bad' },
		});
		await nextTick();

		expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
	});

	it('ignores null message data', () => {
		const wrapper = mount(TestComponent);

		expect(() => {
			postMessage(null);
		}).not.toThrow();

		expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
	});

	it('ignores undefined message data', () => {
		const wrapper = mount(TestComponent);

		expect(() => {
			postMessage(undefined);
		}).not.toThrow();

		expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
	});

	it('clears event after 6 seconds', async () => {
		const wrapper = mount(TestComponent);

		postMessage(
			makePayload('null-detection', {
				type: 'null-value',
				message: 'Found null',
			}),
		);
		await nextTick();

		expect(wrapper.find('[data-testid="info"]').exists()).toBe(true);

		vi.advanceTimersByTime(6000);
		await nextTick();

		expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
	});

	it('does not clear event before 6 seconds', async () => {
		const wrapper = mount(TestComponent);

		postMessage(
			makePayload('null-detection', {
				type: 'null-value',
				message: 'Found null',
			}),
		);
		await nextTick();

		vi.advanceTimersByTime(5999);
		await nextTick();

		expect(wrapper.find('[data-testid="info"]').exists()).toBe(true);
	});

	it('debounces rapid messages within the 6-second window', async () => {
		const wrapper = mount(TestComponent);

		postMessage(
			makePayload('null-detection', {
				type: 'null-value',
				message: 'First message',
			}),
		);
		await nextTick();

		expect(wrapper.find('[data-testid="info"]').text()).toBe('First message');

		postMessage(
			makePayload('null-detection', {
				type: 'query-error',
				message: 'Second message',
			}),
		);
		await nextTick();

		expect(wrapper.find('[data-testid="info"]').text()).toBe('First message');
	});

	it('allows new message after the 6-second debounce window clears', async () => {
		const wrapper = mount(TestComponent);

		postMessage(
			makePayload('null-detection', {
				type: 'null-value',
				message: 'First message',
			}),
		);
		await nextTick();

		expect(wrapper.find('[data-testid="info"]').text()).toBe('First message');

		vi.advanceTimersByTime(6000);
		await nextTick();

		expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);

		postMessage(
			makePayload('null-detection', {
				type: 'query-error',
				message: 'Second message',
			}),
		);
		await nextTick();

		expect(wrapper.find('[data-testid="info"]').text()).toBe('Second message');
	});

	it('cleans up event listener on unmount', () => {
		const spy = vi.spyOn(window, 'removeEventListener');
		const wrapper = mount(TestComponent);

		wrapper.unmount();

		expect(spy).toHaveBeenCalledWith('message', expect.any(Function));
		spy.mockRestore();
	});

	it('clears timeout on unmount', async () => {
		const wrapper = mount(TestComponent);

		postMessage(
			makePayload('null-detection', {
				type: 'null-value',
				message: 'Found null',
			}),
		);
		await nextTick();

		wrapper.unmount();

		expect(() => {
			vi.advanceTimersByTime(6000);
		}).not.toThrow();
	});

	it('includes full payload details', async () => {
		const wrapper = mount(TestComponent);

		postMessage(
			makePayload('null-detection', {
				type: 'query-error',
				operationName: 'GetUser',
				path: '$.user.email',
				message: 'Query returned null',
			}),
		);
		await nextTick();

		expect(wrapper.find('[data-testid="info"]').text()).toBe('Query returned null');
	});

	it('registers message listener on mount', () => {
		const spy = vi.spyOn(window, 'addEventListener');
		const wrapper = mount(TestComponent);

		expect(spy).toHaveBeenCalledWith('message', expect.any(Function));

		wrapper.unmount();
		spy.mockRestore();
	});
});
