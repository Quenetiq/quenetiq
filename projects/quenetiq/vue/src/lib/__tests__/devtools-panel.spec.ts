// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import type { QueryLogEntry } from '@quenetiq/client';
import { DevToolsPanel } from '../devtools-panel';

function makeEntry(overrides: Partial<QueryLogEntry> = {}): QueryLogEntry {
	return {
		id: 1,
		timestamp: Date.now(),
		type: 'query',
		operationName: 'GetUser',
		query: 'query GetUser { user { id name } }',
		variables: { id: '1' },
		durationMs: 42,
		status: 'success',
		fromCache: false,
		size: 128,
		...overrides,
	};
}

const defaultProps = {
	getLog: vi.fn().mockReturnValue([]),
	clearLog: vi.fn(),
};

describe('DevToolsPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('toggle button', () => {
		it('renders toggle button with QL label when closed', () => {
			const wrapper = mount(DevToolsPanel, { props: defaultProps });
			expect(wrapper.text()).toContain('QL');
		});

		it('renders toggle button with X label when opened', () => {
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, isOpen: true } });
			expect(wrapper.text()).toContain('X');
		});

		it('toggles open on click (uncontrolled)', async () => {
			const wrapper = mount(DevToolsPanel, { props: defaultProps });
			expect(wrapper.text()).not.toContain('Quenetiq DevTools');

			await wrapper.find('button').trigger('click');
			await nextTick();
			expect(wrapper.text()).toContain('Quenetiq DevTools');
			expect(wrapper.text()).toContain('X');

			await wrapper.find('button').trigger('click');
			await nextTick();
			expect(wrapper.text()).not.toContain('Quenetiq DevTools');
		});

		it('calls onToggle with open state on click', async () => {
			const onToggle = vi.fn();
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, onToggle } });

			await wrapper.find('button').trigger('click');
			await nextTick();
			expect(onToggle).toHaveBeenCalledWith(true);

			await wrapper.find('button').trigger('click');
			await nextTick();
			expect(onToggle).toHaveBeenCalledWith(false);
		});
	});

	describe('controlled mode', () => {
		it('uses isOpen prop to control visibility', async () => {
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, isOpen: false } });
			expect(wrapper.text()).not.toContain('Quenetiq DevTools');

			await wrapper.setProps({ isOpen: true });
			await nextTick();
			expect(wrapper.text()).toContain('Quenetiq DevTools');
		});

		it('still calls onToggle in controlled mode', async () => {
			const onToggle = vi.fn();
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, isOpen: false, onToggle } });

			await wrapper.find('button').trigger('click');
			await nextTick();
			expect(onToggle).toHaveBeenCalledWith(true);
		});
	});

	describe('log entries', () => {
		it('shows "No queries yet" when log is empty', () => {
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, isOpen: true } });
			expect(wrapper.text()).toContain('No queries yet');
		});

		it('displays entries from getLog', () => {
			const entry = makeEntry({ operationName: 'GetUser' });
			const getLog = vi.fn().mockReturnValue([entry]);
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true } });
			expect(wrapper.text()).toContain('GetUser');
		});

		it('does not show CACHE badge for non-cached entries', () => {
			const entry = makeEntry({ fromCache: false });
			const getLog = vi.fn().mockReturnValue([entry]);
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true } });
			expect(wrapper.text()).not.toContain('CACHE');
		});

		it('shows CACHE badge for cached entries', () => {
			const entry = makeEntry({ fromCache: true });
			const getLog = vi.fn().mockReturnValue([entry]);
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true } });
			expect(wrapper.text()).toContain('CACHE');
		});

		it('shows QRY badge for query entries', () => {
			const entry = makeEntry({ type: 'query' });
			const getLog = vi.fn().mockReturnValue([entry]);
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true } });
			expect(wrapper.text()).toContain('QRY');
		});

		it('shows MUT badge for mutation entries', () => {
			const entry = makeEntry({ type: 'mutation', operationName: 'CreateUser' });
			const getLog = vi.fn().mockReturnValue([entry]);
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true } });
			expect(wrapper.text()).toContain('MUT');
		});

		it('calls clearLog when Clear button is clicked', async () => {
			const clearLog = vi.fn();
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, clearLog, isOpen: true } });

			const buttons = wrapper.findAll('button');
			const clearBtn = buttons.find((b) => b.text() === 'Clear');
			expect(clearBtn).toBeDefined();

			await clearBtn!.trigger('click');
			expect(clearLog).toHaveBeenCalledOnce();
		});
	});

	describe('entry selection', () => {
		it('shows entry details on click and hides on second click', async () => {
			const entry = makeEntry({
				operationName: 'GetUser',
				status: 'success',
				durationMs: 42,
				size: 256,
				query: 'query GetUser { user { id name } }',
				variables: { id: '1' },
			});
			const getLog = vi.fn().mockReturnValue([entry]);
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true } });

			// Click to expand
			await wrapper.find('div').find('div[style*="cursor"]').trigger('click');
			await nextTick();
			expect(wrapper.text()).toContain('Type:');
			expect(wrapper.text()).toContain('Status:');
			expect(wrapper.text()).toContain('Duration:');
			expect(wrapper.text()).toContain('Size:');
			expect(wrapper.text()).toContain('Query:');
			expect(wrapper.text()).toContain('Variables:');

			// Click again to collapse
			await wrapper.find('div').find('div[style*="cursor"]').trigger('click');
			await nextTick();
			expect(wrapper.text()).not.toContain('Variables:');
		});

		it('shows error text in details when entry has error', async () => {
			const entry = makeEntry({ status: 'error', error: 'Something went wrong' });
			const getLog = vi.fn().mockReturnValue([entry]);
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true } });

			await wrapper.find('div').find('div[style*="cursor"]').trigger('click');
			await nextTick();
			expect(wrapper.text()).toContain('Error: Something went wrong');
		});

		it('does not show Variables section when variables is undefined', async () => {
			const entry = makeEntry({ variables: undefined });
			const getLog = vi.fn().mockReturnValue([entry]);
			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true } });

			await wrapper.find('div').find('div[style*="cursor"]').trigger('click');
			await nextTick();
			expect(wrapper.text()).not.toContain('Variables:');
		});
	});

	describe('filter', () => {
		it('filters to queries only', async () => {
			const queryEntry = makeEntry({ id: 1, type: 'query', operationName: 'GetUser' });
			const mutationEntry = makeEntry({ id: 2, type: 'mutation', operationName: 'CreateUser' });
			const getLog = vi.fn().mockReturnValue([queryEntry, mutationEntry]);

			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true } });
			expect(wrapper.text()).toContain('GetUser');
			expect(wrapper.text()).toContain('CreateUser');

			const select = wrapper.find('select');
			await select.setValue('query');
			await nextTick();
			expect(wrapper.text()).toContain('GetUser');
			expect(wrapper.text()).not.toContain('CreateUser');
		});

		it('filters to mutations only', async () => {
			const queryEntry = makeEntry({ id: 1, type: 'query', operationName: 'GetUser' });
			const mutationEntry = makeEntry({ id: 2, type: 'mutation', operationName: 'CreateUser' });
			const getLog = vi.fn().mockReturnValue([queryEntry, mutationEntry]);

			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true } });
			const select = wrapper.find('select');
			await select.setValue('mutation');
			await nextTick();
			expect(wrapper.text()).not.toContain('GetUser');
			expect(wrapper.text()).toContain('CreateUser');
		});
	});

	describe('maxEntries', () => {
		it('limits displayed entries to maxEntries', () => {
			const entries = Array.from({ length: 10 }, (_, i) =>
				makeEntry({ id: i + 1, operationName: `Query${i + 1}` }),
			);
			const getLog = vi.fn().mockReturnValue(entries);

			const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, getLog, isOpen: true, maxEntries: 3 } });
			expect(wrapper.text()).toContain('Query1');
			expect(wrapper.text()).toContain('Query3');
			expect(wrapper.text()).not.toContain('Query4');
		});
	});

	describe('position', () => {
		it('renders without crashing with different positions', async () => {
			for (const pos of ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const) {
				const wrapper = mount(DevToolsPanel, { props: { ...defaultProps, position: pos, isOpen: true } });
				expect(wrapper.text()).toContain('Quenetiq DevTools');
				wrapper.unmount();
			}
		});
	});
});
