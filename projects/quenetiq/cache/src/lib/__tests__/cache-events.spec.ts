import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheEvents } from '../cache-events';

describe('CacheEvents', () => {
	let events: CacheEvents;

	beforeEach(() => {
		events = new CacheEvents();
	});

	it('starts with zero listeners', () => {
		expect(events.listenerCount).toBe(0);
	});

	it('notifies subscribers on emit', () => {
		const listener = vi.fn();
		events.on(listener);

		events.emit({ type: 'read', data: { typename: 'User', id: '1', hit: true } });

		expect(listener).toHaveBeenCalledOnce();
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'read',
				data: { typename: 'User', id: '1', hit: true },
				timestamp: expect.any(Number),
				seq: expect.any(Number),
			}),
		);
	});

	it('supports multiple listeners', () => {
		const listener1 = vi.fn();
		const listener2 = vi.fn();
		events.on(listener1);
		events.on(listener2);

		events.emit({ type: 'write', data: { entity: { __typename: 'User', id: '1' }, key: 'User:1' } });

		expect(listener1).toHaveBeenCalledOnce();
		expect(listener2).toHaveBeenCalledOnce();
		expect(events.listenerCount).toBe(2);
	});

	it('unsubscribes correctly', () => {
		const listener = vi.fn();
		const unsub = events.on(listener);

		unsub();
		events.emit({ type: 'clear', data: { entityCount: 5 } });

		expect(listener).not.toHaveBeenCalled();
		expect(events.listenerCount).toBe(0);
	});

	it('clear() removes all listeners', () => {
		const listener1 = vi.fn();
		const listener2 = vi.fn();
		events.on(listener1);
		events.on(listener2);

		events.clear();

		expect(events.listenerCount).toBe(0);
	});

	it('emits all event types correctly', () => {
		const listener = vi.fn();
		events.on(listener);

		const eventTypes = [
			{ type: 'write' as const, data: { entity: { __typename: 'User', id: '1' }, key: 'User:1' } },
			{ type: 'read' as const, data: { typename: 'User', id: '1', hit: true } },
			{ type: 'merge' as const, data: { entity: { __typename: 'User', id: '1' }, key: 'User:1', existed: false } },
			{ type: 'evict' as const, data: { typename: 'User', id: '1' } },
			{ type: 'gcSweep' as const, data: { evicted: ['User:1'], refCounts: {} } },
			{ type: 'optimistic' as const, data: { action: 'apply' as const, id: 'opt-1' } },
			{ type: 'clear' as const, data: { entityCount: 0 } },
		];

		for (const event of eventTypes) {
			events.emit(event);
		}

		expect(listener).toHaveBeenCalledTimes(eventTypes.length);
	});

	it('setLogging() subscribes to console output', () => {
		const log = vi.fn();
		const unsub = events.setLogging({ enableLogging: true, logger: log });

		events.emit({ type: 'read', data: { typename: 'User', id: '1', hit: true } });

		expect(log).toHaveBeenCalledWith('[quenetiq:cache]', expect.stringContaining('read HIT User:1'));

		unsub();
	});

	it('setLogging(false) disables logging', () => {
		const log = vi.fn();
		const unsub = events.setLogging({ enableLogging: true, logger: log });

		events.emit({ type: 'read', data: { typename: 'User', id: '1', hit: true } });
		expect(log).toHaveBeenCalledOnce();

		unsub();
		log.mockClear();

		events.emit({ type: 'read', data: { typename: 'User', id: '1', hit: true } });
		expect(log).not.toHaveBeenCalled();
	});

	it('setLogging(true) uses console.debug', () => {
		const originalDebug = console.debug;
		console.debug = vi.fn();

		const unsub = events.setLogging(true);
		events.emit({ type: 'write', data: { entity: { __typename: 'User', id: '1' }, key: 'User:1' } });

		expect(console.debug).toHaveBeenCalledWith('[quenetiq:cache]', expect.stringContaining('write User:1'));

		console.debug = originalDebug;
		unsub();
	});

	it('setLogging replaces previous logging subscription', () => {
		const log1 = vi.fn();
		const log2 = vi.fn();

		events.setLogging({ enableLogging: true, logger: log1 });
		events.setLogging({ enableLogging: true, logger: log2 });

		events.emit({ type: 'evict', data: { typename: 'User', id: '1' } });

		expect(log1).not.toHaveBeenCalled();
		expect(log2).toHaveBeenCalled();
	});

	it('setLogging formats gcSweep event with count', () => {
		const log = vi.fn();
		events.setLogging({ enableLogging: true, logger: log });

		events.emit({ type: 'gcSweep', data: { evicted: ['User:1', 'User:2', 'Post:3'], refCounts: {} } });

		expect(log).toHaveBeenCalledWith('[quenetiq:cache]', expect.stringContaining('evicted 3 entities'));
	});

	it('setLogging formats merge event with updated/new', () => {
		const log = vi.fn();
		events.setLogging({ enableLogging: true, logger: log });

		events.emit({ type: 'merge', data: { entity: { __typename: 'User', id: '1' }, key: 'User:1', existed: true } });
		expect(log).toHaveBeenCalledWith('[quenetiq:cache]', expect.stringContaining('(updated)'));

		log.mockClear();
		events.emit({ type: 'merge', data: { entity: { __typename: 'User', id: '2' }, key: 'User:2', existed: false } });
		expect(log).toHaveBeenCalledWith('[quenetiq:cache]', expect.stringContaining('(new)'));
	});
});
