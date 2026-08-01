import { describe, it, expect, beforeEach } from 'vitest';
import { computeHash, PersistedQueryRegistry, buildApqPayload, isPersistedQueryNotFound } from '../persisted-queries';

describe('computeHash', () => {
	it('computes sha256 hash', async () => {
		const hash = await computeHash('query { user }');
		expect(hash).toBeTypeOf('string');
		expect(hash.length).toBe(64);
	});

	it('computes simple hash', async () => {
		const hash = await computeHash('query { user }', 'simple');
		expect(hash).toBeTypeOf('string');
		expect(hash.length).toBeLessThan(64);
	});

	it('produces consistent sha256 hash for same input', async () => {
		const a = await computeHash('query { user }', 'sha256');
		const b = await computeHash('query { user }', 'sha256');
		expect(a).toBe(b);
	});

	it('produces different sha256 hash for different input', async () => {
		const a = await computeHash('query { user }', 'sha256');
		const b = await computeHash('query { posts }', 'sha256');
		expect(a).not.toBe(b);
	});

	it('defaults to sha256 algorithm', async () => {
		const hash = await computeHash('query { user }');
		expect(hash.length).toBe(64);
	});
});

describe('PersistedQueryRegistry', () => {
	let registry: PersistedQueryRegistry;

	beforeEach(() => {
		registry = new PersistedQueryRegistry({});
	});

	it('registers query and returns hash', () => {
		const hash = registry.register('query { user }');
		expect(hash).toBeTypeOf('string');
	});

	it('returns same hash for same query', () => {
		const a = registry.register('query { user }');
		const b = registry.register('query { user }');
		expect(a).toBe(b);
	});

	it('looks up query by hash', () => {
		const hash = registry.register('query { user }');
		expect(registry.getQuery(hash)).toBe('query { user }');
	});

	it('looks up hash by query', () => {
		const hash = registry.register('query { user }');
		expect(registry.getHash('query { user }')).toBe(hash);
	});

	it('returns undefined for unknown hash', () => {
		expect(registry.getQuery('nonexistent')).toBeUndefined();
	});

	it('returns undefined for unknown query', () => {
		expect(registry.getHash('query { unknown }')).toBeUndefined();
	});

	it('marks hash as registered', () => {
		const hash = registry.register('query { user }');
		expect(registry.isRegistered(hash)).toBe(false);
		registry.markRegistered(hash);
		expect(registry.isRegistered(hash)).toBe(true);
	});

	it('clears registered state', () => {
		const hash = registry.register('query { user }');
		registry.markRegistered(hash);
		registry.clear();
		expect(registry.isRegistered(hash)).toBe(false);
	});

	it('registerAsync computes hash and registers', async () => {
		const hash = await registry.registerAsync('query { user }');
		expect(hash).toBeTypeOf('string');
		expect(registry.getHash('query { user }')).toBe(hash);
	});

	it('registerAsync returns existing hash on re-register', async () => {
		const a = await registry.registerAsync('query { user }');
		const b = await registry.registerAsync('query { user }');
		expect(a).toBe(b);
	});
});

describe('buildApqPayload', () => {
	it('builds correct APQ payload', () => {
		const payload = buildApqPayload('abc123');
		expect(payload).toEqual({
			persistedQuery: {
				version: 1,
				sha256Hash: 'abc123',
			},
		});
	});
});

describe('isPersistedQueryNotFound', () => {
	it('returns true when error contains PersistedQueryNotFound', () => {
		const response = { errors: [{ message: 'PersistedQueryNotFound' }] };
		expect(isPersistedQueryNotFound(response)).toBe(true);
	});

	it('returns true in nested error', () => {
		const response = { errors: [{ message: 'Something: PersistedQueryNotFound' }] };
		expect(isPersistedQueryNotFound(response)).toBe(true);
	});

	it('returns false for non-object', () => {
		expect(isPersistedQueryNotFound(null)).toBe(false);
		expect(isPersistedQueryNotFound('string')).toBe(false);
		expect(isPersistedQueryNotFound(42)).toBe(false);
	});

	it('returns false for response without errors', () => {
		expect(isPersistedQueryNotFound({ data: {} })).toBe(false);
	});

	it('returns false for empty errors array', () => {
		expect(isPersistedQueryNotFound({ errors: [] })).toBe(false);
	});

	it('returns false for non-GraphQL error', () => {
		const response = { errors: [{ message: 'Network error' }] };
		expect(isPersistedQueryNotFound(response)).toBe(false);
	});

	it('returns false when errors is not an array', () => {
		const response = { errors: 'not-array' };
		expect(isPersistedQueryNotFound(response)).toBe(false);
	});
});
