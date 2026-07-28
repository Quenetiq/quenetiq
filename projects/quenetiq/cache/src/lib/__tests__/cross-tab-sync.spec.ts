import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrossTabSync, type CacheSyncOperations } from '../cross-tab-sync';
import { CacheEvents } from '../cache-events';

function createMockOps(): CacheSyncOperations {
	return {
		merge: vi.fn(),
		write: vi.fn(),
		evict: vi.fn(),
		rollbackOptimistic: vi.fn(),
		commitOptimistic: vi.fn(),
		clear: vi.fn(() => Promise.resolve()),
	};
}

describe('CrossTabSync', () => {
	let events: CacheEvents;
	let ops: CacheSyncOperations;

	beforeEach(() => {
		events = new CacheEvents();
		ops = createMockOps();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not connect when BroadcastChannel is unavailable', () => {
		const orig = (globalThis as Record<string, unknown>).BroadcastChannel;
		(globalThis as Record<string, unknown>).BroadcastChannel = undefined;
		const sync = new CrossTabSync(events, ops, { enabled: true });
		expect((sync as unknown as Record<string, unknown>).channel).toBeNull();
		(globalThis as Record<string, unknown>).BroadcastChannel = orig;
	});

	it('disconnect closes channel and unsubscribes', () => {
		const sync = new CrossTabSync(events, ops);
		const channel = (sync as unknown as Record<string, unknown>).channel;
		expect(channel).not.toBeNull();

		const closeSpy = vi.fn();
		if (channel) (channel as { close: () => void }).close = closeSpy;

		sync.disconnect();
		expect(closeSpy).toHaveBeenCalled();
		const ch = (sync as unknown as Record<string, unknown>).channel;
		expect(ch).toBeNull();
	});

	it('broadcasts merge event and applies it to ops on remote message', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const channel = (sync as unknown as Record<string, unknown>).channel as BroadcastChannel;
		const fakeSender = 'other-tab';
		const msg = { type: 'merge', entity: { __typename: 'User', id: '1', name: 'Alice' }, sender: fakeSender, seq: 1 };

		channel.onmessage?.({ data: msg } as MessageEvent);

		expect(ops.merge).toHaveBeenCalledWith(msg.entity, 'cross-tab');
	});

	it('ignores messages from self', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const channel = (sync as unknown as Record<string, unknown>).channel as BroadcastChannel;
		const senderId = (sync as unknown as Record<string, unknown>).senderId as string;
		const msg = { type: 'write', entity: { __typename: 'User', id: '1' }, sender: senderId, seq: 1 };

		channel.onmessage?.({ data: msg } as MessageEvent);

		expect(ops.write).not.toHaveBeenCalled();
	});

	it('broadcasts clear and calls ops.clear', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const channel = (sync as unknown as Record<string, unknown>).channel as BroadcastChannel;
		const msg = { type: 'clear', sender: 'other-tab', seq: 1 };

		channel.onmessage?.({ data: msg } as MessageEvent);

		expect(ops.clear).toHaveBeenCalled();
	});

	it('broadcasts optimistic commit and applies it', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const channel = (sync as unknown as Record<string, unknown>).channel as BroadcastChannel;
		const msg = { type: 'optimistic', action: 'commit', id: 'opt-1', sender: 'other-tab', seq: 1 };

		channel.onmessage?.({ data: msg } as MessageEvent);

		expect(ops.commitOptimistic).toHaveBeenCalledWith('opt-1');
	});

	it('subscribes to cache events and broadcasts write', () => {
		new CrossTabSync(events, ops, { enabled: true });
		const spy = vi.spyOn(BroadcastChannel.prototype, 'postMessage');

		events.emit({ type: 'write', data: { entity: { __typename: 'Note', id: '42', text: 'hello' }, key: 'Note:42' } });

		expect(spy).toHaveBeenCalled();
		const call = spy.mock.calls[0][0] as Record<string, unknown>;
		expect(call.type).toBe('write');
		expect((call.entity as Record<string, unknown>).__typename).toBe('Note');
	});

	it('unsubscribes from cache events on disconnect', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const spy = vi.spyOn(BroadcastChannel.prototype, 'postMessage');

		sync.disconnect();
		events.emit({ type: 'write', data: { entity: { __typename: 'X', id: '1', val: 1 }, key: 'X:1' } });

		expect(spy).not.toHaveBeenCalled();
	});

	it('handles null/undefined message gracefully', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const channel = (sync as unknown as Record<string, unknown>).channel as BroadcastChannel;

		expect(() => {
			channel.onmessage?.({ data: null } as MessageEvent);
			channel.onmessage?.({ data: undefined } as MessageEvent);
		}).not.toThrow();
	});
});
