import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@quenetiq/client', () => ({ createClient: vi.fn(), gql: vi.fn() }));
vi.mock('@quenetiq/cache', () => ({ createCache: vi.fn() }));

import { mapGlobalConfigToClientConfig, mapGlobalConfigToCacheConfig } from '../quenetiq-config-plugin';
import type { QuenetiqGlobalConfig } from '../quenetiq-config-plugin';

describe('QuenetiqConfigPlugin — config mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('maps endpoint and url', () => {
		const config: QuenetiqGlobalConfig = { endpoint: '/graphql', url: '/v2/graphql' };
		const c = mapGlobalConfigToClientConfig(config);
		expect(c.endpoint).toBe('/graphql');
		expect(c.url).toBe('/v2/graphql');
	});

	it('prefers endpoint over url as fallback', () => {
		const config: QuenetiqGlobalConfig = { url: '/v2/graphql' };
		const c = mapGlobalConfigToClientConfig(config);
		expect(c.endpoint).toBe('/v2/graphql');
	});

	it('maps all core config fields', () => {
		const onError = vi.fn();
		const errorHandler = { handle: vi.fn() };
		const mw = vi.fn();
		const config: QuenetiqGlobalConfig = {
			endpoint: '/api/graphql',
			headers: { Authorization: 'Bearer test' },
			errorPolicy: 'all',
			showErrorsOnSuccess: true,
			retryCount: 3,
			retryDelay: 1000,
			dedup: true,
			batchWindow: 50,
			middleware: [mw],
			retryExchange: { maxRetries: 5, jitter: true },
			devAuth: { token: 'dev-token', enabled: true },
			onError,
			errorHandler,
		};
		const c = mapGlobalConfigToClientConfig(config);
		expect(c.endpoint).toBe('/api/graphql');
		expect(c.headers).toEqual({ Authorization: 'Bearer test' });
		expect(c.errorPolicy).toBe('all');
		expect(c.showErrorsOnSuccess).toBe(true);
		expect(c.retryCount).toBe(3);
		expect(c.retryDelay).toBe(1000);
		expect(c.dedup).toBe(true);
		expect(c.batchWindow).toBe(50);
		expect(c.middleware).toEqual([mw]);
		expect(c.retryExchange).toEqual({ maxRetries: 5, jitter: true });
		expect(c.devAuth).toEqual({ token: 'dev-token', enabled: true });
		expect(c.onError).toBe(onError);
		expect(c.errorHandler).toBe(errorHandler);
	});

	it('maps feature config fields', () => {
		const config: QuenetiqGlobalConfig = {
			clientDirectives: { enabled: true, fields: { token: 'abc' } },
			discovery: { enabled: true, timeout: 5000 },
			mock: { enabled: true, delay: 100, passthrough: ['/real'] },
			streaming: { enabled: true, chunkTimeout: 30000 },
		};
		const c = mapGlobalConfigToClientConfig(config);
		expect(c.clientDirectives).toEqual({ enabled: true, fields: { token: 'abc' } });
		expect(c.discovery).toEqual({ enabled: true, timeout: 5000 });
		expect(c.mock).toEqual({ enabled: true, delay: 100, passthrough: ['/real'] });
		expect(c.streaming).toEqual({ enabled: true, chunkTimeout: 30000 });
	});

	it('maps persistedQueries', () => {
		const config: QuenetiqGlobalConfig = {
			persistedQueries: { enabled: true, hash: 'sha256', autoPersist: true, useGetForHashedQueries: true },
		};
		const c = mapGlobalConfigToClientConfig(config);
		expect(c.persistedQueries).toEqual({ enabled: true, hash: 'sha256', autoPersist: true, useGetForHashedQueries: true });
	});

	it('maps subscriptions', () => {
		const config: QuenetiqGlobalConfig = {
			subscriptions: { wsEndpoint: 'ws://localhost:4000', reconnect: true, lazy: true },
		};
		const c = mapGlobalConfigToClientConfig(config);
		expect(c.subscriptions).toEqual({ wsEndpoint: 'ws://localhost:4000', reconnect: true, lazy: true });
	});

	it('maps cache config with typePolicies and maxAge', () => {
		const config: QuenetiqGlobalConfig = {
			cache: { enabled: true, typePolicies: { User: { keyFields: ['id'] } }, maxAge: 60000 },
		};
		const c = mapGlobalConfigToClientConfig(config);
		expect(c.cache).toEqual({ enabled: true, typePolicies: { User: { keyFields: ['id'] } }, maxAge: 60000 });
	});

	it('returns undefined cache when not configured', () => {
		const c = mapGlobalConfigToClientConfig({});
		expect(c.cache).toBeUndefined();
	});

	it('maps empty config to empty client config', () => {
		const c = mapGlobalConfigToClientConfig({});
		expect(c.endpoint).toBeUndefined();
		expect(c.middleware).toBeUndefined();
	});

	it('cache config maps typePolicies and persist', () => {
		const config: QuenetiqGlobalConfig = {
			cache: {
				enabled: true,
				typePolicies: { User: { keyFields: ['id'] } },
				persist: { key: 'quenetiq-cache', storage: 'localStorage' },
			},
		};
		const cc = mapGlobalConfigToCacheConfig(config);
		expect(cc).toEqual({
			typePolicies: { User: { keyFields: ['id'] } },
			persist: { key: 'quenetiq-cache', storage: 'localStorage' },
		});
	});

	it('cache config returns undefined when no cache configured', () => {
		const cc = mapGlobalConfigToCacheConfig({});
		expect(cc).toBeUndefined();
	});

	it('cache config returns undefined fields when cache has no persist/typePolicies', () => {
		const cc = mapGlobalConfigToCacheConfig({ cache: { enabled: true } });
		expect(cc).toEqual({ typePolicies: undefined, persist: undefined });
	});
});
