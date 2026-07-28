// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { RateLimitGate } from '../rate-limit-gate';

describe('RateLimitGate', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders default slot when not limited', () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false },
			slots: { default: '<p>Content</p>' },
		});

		expect(wrapper.html()).toContain('Content');
	});

	it('renders fallback slot when limited and countdown active', async () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false },
			slots: { fallback: '<div>Custom fallback</div>' },
		});

		await wrapper.setProps({ isLimited: true, retryAfter: 3000 });

		expect(wrapper.html()).toContain('Custom fallback');
		expect(wrapper.html()).not.toContain('Content');
	});

	it('renders default fallback UI when no fallback slot provided', async () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false },
		});

		await wrapper.setProps({ isLimited: true, retryAfter: 5000 });

		expect(wrapper.html()).toContain('Rate limit exceeded');
		expect(wrapper.html()).toContain('5s');
	});

	it('shows error message when error prop is provided', async () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 3000, error: 'Too many requests' },
		});

		await wrapper.setProps({ isLimited: true });

		expect(wrapper.html()).toContain('Too many requests');
	});

	it('does not show error message when error prop is not provided', async () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 3000 },
		});

		await wrapper.setProps({ isLimited: true });

		expect(wrapper.html()).not.toContain('Too many requests');
	});

	it('counts down remaining time', async () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 3000 },
		});

		await wrapper.setProps({ isLimited: true });

		expect(wrapper.html()).toContain('3s');

		vi.advanceTimersByTime(1000);
		await nextTick();

		expect(wrapper.html()).toContain('2s');

		vi.advanceTimersByTime(1000);
		await nextTick();

		expect(wrapper.html()).toContain('1s');
	});

	it('calls onRetry when countdown reaches zero', async () => {
		const onRetry = vi.fn();

		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 2000, onRetry },
		});

		await wrapper.setProps({ isLimited: true });

		expect(onRetry).not.toHaveBeenCalled();

		vi.advanceTimersByTime(2000);
		await nextTick();

		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('uses default retryAfter of 5000 when not provided', async () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false },
		});

		await wrapper.setProps({ isLimited: true });

		expect(wrapper.html()).toContain('5s');
	});

	it('stops timer on unmount', async () => {
		const onRetry = vi.fn();

		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 1000, onRetry },
		});

		await wrapper.setProps({ isLimited: true });

		wrapper.unmount();

		vi.advanceTimersByTime(1000);
		await nextTick();

		expect(onRetry).not.toHaveBeenCalled();
	});

	it('resets remaining when isLimited changes from true to false', async () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 3000 },
			slots: { default: '<p>Content</p>' },
		});

		await wrapper.setProps({ isLimited: true });

		expect(wrapper.html()).toContain('3s');
		expect(wrapper.html()).not.toContain('Content');

		await wrapper.setProps({ isLimited: false });

		expect(wrapper.html()).not.toContain('3s');
		expect(wrapper.html()).not.toContain('Rate limit exceeded');
	});

	it('resets timer when isLimited changes from true to true with different retryAfter', async () => {
		const onRetry = vi.fn();
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 5000, onRetry },
		});

		await wrapper.setProps({ isLimited: true });

		vi.advanceTimersByTime(3000);
		await nextTick();

		await wrapper.setProps({ isLimited: true, retryAfter: 2000 });

		expect(wrapper.html()).toContain('2s');

		vi.advanceTimersByTime(2000);
		await nextTick();

		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('clears previous timer when isLimited toggles rapidly', async () => {
		const onRetry = vi.fn();
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 1000, onRetry },
		});

		await wrapper.setProps({ isLimited: true });

		vi.advanceTimersByTime(500);
		await nextTick();

		await wrapper.setProps({ isLimited: false });
		vi.advanceTimersByTime(500);
		await nextTick();

		expect(onRetry).not.toHaveBeenCalled();

		await wrapper.setProps({ isLimited: true, retryAfter: 1000 });
		vi.advanceTimersByTime(1000);
		await nextTick();

		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('does not render default slot when limited even with fallback slot', async () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 3000 },
			slots: {
				default: '<p>Hidden content</p>',
				fallback: '<div>Fallback shown</div>',
			},
		});

		await wrapper.setProps({ isLimited: true });

		expect(wrapper.html()).toContain('Fallback shown');
		expect(wrapper.html()).not.toContain('Hidden content');
	});

	it('shows rounded up seconds in countdown', async () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 3500 },
		});

		await wrapper.setProps({ isLimited: true });

		expect(wrapper.html()).toContain('4s');

		vi.advanceTimersByTime(1000);
		await nextTick();

		expect(wrapper.html()).toContain('3s');
	});

	it('shows 0s briefly before onRetry fires', async () => {
		const onRetry = vi.fn();
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 2000, onRetry },
		});

		await wrapper.setProps({ isLimited: true });

		vi.advanceTimersByTime(1900);
		await nextTick();

		expect(onRetry).not.toHaveBeenCalled();

		vi.advanceTimersByTime(200);
		await nextTick();

		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('does not call onRetry when onRetry is not provided', async () => {
		const wrapper = mount(RateLimitGate, {
			props: { isLimited: false, retryAfter: 1000 },
		});

		await wrapper.setProps({ isLimited: true });

		expect(() => {
			vi.advanceTimersByTime(1000);
		}).not.toThrow();

		await nextTick();

		expect(wrapper.html()).toContain('Rate limit exceeded');
	});
});
