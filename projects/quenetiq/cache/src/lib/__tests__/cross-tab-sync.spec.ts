import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrossTabSync, type CacheSyncOperations } from '../cross-tab-sync';
import { CacheEvents } from '../cache-events';

function createMockOps(): CacheSyncOperations {
	return {
		merge: vi.fn(),
		write: vi.fn(),
		evict: vi.fn(),
		clear: vi.fn(() => Promise.resolve()),
	};
}

function getChannel(sync: CrossTabSync): BroadcastChannel {
	const channel = (sync as unknown as Record<string, unknown>).channel as BroadcastChannel | null;
	expect(channel).not.toBeNull();
	return channel as BroadcastChannel;
}

function dispatch(sync: CrossTabSync, data: unknown): void {
	getChannel(sync).onmessage?.({ data } as MessageEvent);
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
		const channel = getChannel(sync);

		const closeSpy = vi.fn();
		channel.close = closeSpy;

		sync.disconnect();
		expect(closeSpy).toHaveBeenCalled();
		expect((sync as unknown as Record<string, unknown>).channel).toBeNull();
	});

	it('applies a remote merge message to ops', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const entity = { __typename: 'User', id: '1', name: 'Alice' };
		dispatch(sync, { type: 'merge', entity, sender: 'other-tab', seq: 1 });

		expect(ops.merge).toHaveBeenCalledWith(entity, 'cross-tab');
	});

	it('applies a remote write message to ops', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const entity = { __typename: 'User', id: '1', name: 'Bob' };
		dispatch(sync, { type: 'write', entity, sender: 'other-tab', seq: 2 });

		expect(ops.write).toHaveBeenCalledWith(entity, 'cross-tab');
	});

	it('applies a remote evict message to ops', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		dispatch(sync, { type: 'evict', typename: 'User', id: '1', sender: 'other-tab', seq: 3 });

		expect(ops.evict).toHaveBeenCalledWith('User', '1');
	});

	it('applies a remote clear message to ops', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		dispatch(sync, { type: 'clear', sender: 'other-tab', seq: 4 });

		expect(ops.clear).toHaveBeenCalled();
	});

	it('ignores messages from self', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const senderId = (sync as unknown as Record<string, unknown>).senderId as string;
		dispatch(sync, { type: 'write', entity: { __typename: 'User', id: '1' }, sender: senderId, seq: 5 });

		expect(ops.write).not.toHaveBeenCalled();
	});

	it('does not re-broadcast events emitted while applying a remote message', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const spy = vi.spyOn(BroadcastChannel.prototype, 'postMessage');

		(ops.merge as ReturnType<typeof vi.fn>).mockImplementation((entity: unknown) => {
			events.emit({
				type: 'merge',
				data: { entity: entity as { __typename: string; id?: string }, key: 'User:1', existed: true, changedFields: [] },
			});
		});

		dispatch(sync, { type: 'merge', entity: { __typename: 'User', id: '1', name: 'Alice' }, sender: 'other-tab', seq: 6 });

		expect(ops.merge).toHaveBeenCalled();
		expect(spy).not.toHaveBeenCalled();
	});

	it('deduplicates the same message delivered twice', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const msg = { type: 'merge', entity: { __typename: 'User', id: '1' }, sender: 'other-tab', seq: 7 };

		dispatch(sync, msg);
		dispatch(sync, msg);

		expect(ops.merge).toHaveBeenCalledTimes(1);
	});

	it('ignores malformed messages', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });

		dispatch(sync, null);
		dispatch(sync, undefined);
		dispatch(sync, {});
		dispatch(sync, { type: 'merge', sender: 'other-tab', seq: 1 });
		dispatch(sync, { type: 'merge', entity: {}, sender: 'other-tab', seq: 1 });
		dispatch(sync, { type: 'unknown', sender: 'other-tab', seq: 1 });
		dispatch(sync, { type: 'clear', sender: '', seq: 1 });
		dispatch(sync, { type: 'clear', sender: 'other-tab', seq: 1.5 });

		expect(ops.merge).not.toHaveBeenCalled();
		expect(ops.write).not.toHaveBeenCalled();
		expect(ops.evict).not.toHaveBeenCalled();
		expect(ops.clear).not.toHaveBeenCalled();
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

	it('does not broadcast local-only cache events', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const spy = vi.spyOn(BroadcastChannel.prototype, 'postMessage');

		events.emit({ type: 'optimistic', data: { action: 'apply', id: 'opt-1' } });
		events.emit({ type: 'read', data: { typename: 'User', id: '1', hit: true } });
		events.emit({ type: 'gcSweep', data: { evicted: ['User:1'], refCounts: {} } });
		events.emit({ type: 'error', data: { operation: 'persist', error: new Error('boom') } });

		expect(spy).not.toHaveBeenCalled();
		expect(sync).toBeDefined();
	});

	it('unsubscribes from cache events on disconnect', () => {
		const sync = new CrossTabSync(events, ops, { enabled: true });
		const spy = vi.spyOn(BroadcastChannel.prototype, 'postMessage');

		sync.disconnect();
		events.emit({ type: 'write', data: { entity: { __typename: 'X', id: '1', val: 1 }, key: 'X:1' } });

		expect(spy).not.toHaveBeenCalled();
	});
});
