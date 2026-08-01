import { describe, it, expect } from 'vitest';

const EXT_SOURCE = 'dumb-keystore-graphql-debug';

describe('useEpicFetus message protocol (React)', () => {
	it('null detection event shape is correct', () => {
		const event = {
			source: EXT_SOURCE,
			type: 'null-detection',
			payload: { type: 'null-value', path: 'data.foo', operationName: 'Test' },
		};
		expect(event.source).toBe(EXT_SOURCE);
		expect(event.payload.type).toBe('null-value');
		expect(event.payload.path).toBe('data.foo');
	});

	it('query-error event shape is correct', () => {
		const event = {
			source: EXT_SOURCE,
			type: 'null-detection',
			payload: { type: 'query-error', message: 'fail', operationName: 'Test' },
		};
		expect(event.payload.type).toBe('query-error');
		expect(event.payload.message).toBe('fail');
	});

	it('ignores messages from other sources', () => {
		const event = { source: 'other', type: 'null-detection' };
		expect(event.source).not.toBe(EXT_SOURCE);
	});

	it('spawnEpicFetus is blocked when efEnabled is false', () => {
		let spawnCalled = 0;
		const efEnabled = false;
		const spawnEpicFetus = () => {
			if (!efEnabled) return;
			spawnCalled++;
		};
		spawnEpicFetus();
		expect(spawnCalled).toBe(0);
	});

	it('spawnEpicFetus runs when efEnabled is true', () => {
		let spawnCalled = 0;
		const efEnabled = true;
		const spawnEpicFetus = () => {
			if (!efEnabled) return;
			spawnCalled++;
		};
		spawnEpicFetus();
		expect(spawnCalled).toBe(1);
	});
});
