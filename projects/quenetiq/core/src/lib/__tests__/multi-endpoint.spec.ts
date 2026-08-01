import { describe, it, expect } from 'vitest';
import {
	parseEndpointsYaml,
	validateEndpointsYaml,
	type EndpointsYaml,
} from '../endpoints-config';
import { buildMultiEndpointConfig, buildSingleEndpointConfig } from '../endpoints-providers';

describe('Multi-Endpoint Integration', () => {
	const validYaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
    headers:
      Authorization: "Bearer token"
  users:
    url: http://localhost:4001/graphql
  posts:
    url: http://localhost:4002/graphql
`;

	it('parses and validates a complete endpoints.yml', () => {
		const config = parseEndpointsYaml(validYaml);

		expect(config.default_endpoint).toBe('main');
		expect(Object.keys(config.endpoints)).toHaveLength(3);
		expect(config.endpoints['main'].url).toBe('http://localhost:4000/graphql');
		expect(config.endpoints['users'].url).toBe('http://localhost:4001/graphql');
		expect(config.endpoints['posts'].url).toBe('http://localhost:4002/graphql');

		const errors = validateEndpointsYaml(config);
		expect(errors).toHaveLength(0);
	});

	it('creates valid config from parsed YAML', () => {
		const config = parseEndpointsYaml(validYaml);
		const result = buildMultiEndpointConfig(config);

		expect(result.multiEndpoint).toBe(true);
		expect(result.endpoints.length).toBe(3);
		expect(result.yaml.default_endpoint).toBe('main');
	});

	it('fails validation when default_endpoint is missing from routes', () => {
		const yaml = `
default_endpoint: nonexistent

endpoints:
  main:
    url: http://localhost:4000/graphql
`;
		const config = parseEndpointsYaml(yaml);
		const errors = validateEndpointsYaml(config);

		expect(errors).toContainEqual(
			'default_endpoint "nonexistent" references an endpoint that does not exist in endpoints',
		);
	});

	it('buildSingleEndpointConfig sets multi-endpoint to false', () => {
		const config = buildSingleEndpointConfig();

		expect(config.multiEndpoint).toBe(false);
		expect(config.endpoints).toHaveLength(0);
	});

	it('buildMultiEndpointConfig sets multi-endpoint to true', () => {
		const config: EndpointsYaml = {
			default_endpoint: 'main',
			endpoints: {
				main: { url: 'http://localhost:4000/graphql' },
			},
		};

		const result = buildMultiEndpointConfig(config);
		expect(result.multiEndpoint).toBe(true);
		expect(result.endpoints).toHaveLength(1);
	});

	it('parses YAML with different route names', () => {
		const yaml = `
default_endpoint: primary

endpoints:
  primary:
    url: http://primary.example.com/graphql
  secondary:
    url: http://secondary.example.com/graphql
  staging:
    url: http://staging.example.com/graphql
`;
		const config = parseEndpointsYaml(yaml);

		expect(config.default_endpoint).toBe('primary');
		expect(config.endpoints['primary'].url).toBe('http://primary.example.com/graphql');
		expect(config.endpoints['secondary'].url).toBe('http://secondary.example.com/graphql');
		expect(config.endpoints['staging'].url).toBe('http://staging.example.com/graphql');
	});

	it('handles YAML with only default route', () => {
		const yaml = `
default_endpoint: default

endpoints:
  default:
    url: http://localhost:4000/graphql
`;
		const config = parseEndpointsYaml(yaml);

		expect(config.default_endpoint).toBe('default');
		expect(Object.keys(config.endpoints)).toHaveLength(1);
	});

	it('handles routes with different header formats', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
    headers:
      Authorization: "Bearer token123"
      X-API-Key: "key-456"
      X-Tenant-ID: "tenant-789"
`;
		const config = parseEndpointsYaml(yaml);

		expect(config.endpoints['main'].headers).toEqual({
			Authorization: 'Bearer token123',
			'X-API-Key': 'key-456',
			'X-Tenant-ID': 'tenant-789',
		});
	});

	it('validates multiple routes with missing URLs', () => {
		const config: EndpointsYaml = {
			default_endpoint: 'main',
			endpoints: {
				main: { url: '' },
				users: { url: 'http://localhost:4001/graphql' },
			},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors).toContainEqual('Route "main" is missing required field: url');
	});
});

describe('End-to-end config generation', () => {
	it('generates correct endpoint count for multi-route config', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
  users:
    url: http://localhost:4001/graphql
  posts:
    url: http://localhost:4002/graphql
  comments:
    url: http://localhost:4003/graphql
`;
		const config = parseEndpointsYaml(yaml);
		const result = buildMultiEndpointConfig(config);

		expect(result.endpoints).toHaveLength(4);
		expect(result.endpoints.map((e) => e.name)).toEqual(['main', 'users', 'posts', 'comments']);
	});

	it('each endpoint descriptor has name and route', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
  users:
    url: http://localhost:4001/graphql
`;
		const config = parseEndpointsYaml(yaml);
		const result = buildMultiEndpointConfig(config);

		for (const endpoint of result.endpoints) {
			expect(endpoint).toHaveProperty('name');
			expect(endpoint).toHaveProperty('route');
			expect(endpoint.route).toHaveProperty('url');
			expect(typeof endpoint.name).toBe('string');
			expect(typeof endpoint.route.url).toBe('string');
		}
	});

	it('parses per-endpoint errorPolicy', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
    errorPolicy: all
  strict:
    url: http://localhost:4001/graphql
    errorPolicy: none
  lenient:
    url: http://localhost:4002/graphql
    errorPolicy: ignore
`;
		const config = parseEndpointsYaml(yaml);

		expect(config.endpoints['main'].errorPolicy).toBe('all');
		expect(config.endpoints['strict'].errorPolicy).toBe('none');
		expect(config.endpoints['lenient'].errorPolicy).toBe('ignore');
	});

	it('parses per-endpoint retryCount and retryDelay', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
    retryCount: 3
    retryDelay: 1000
  noRetry:
    url: http://localhost:4001/graphql
    retryCount: 0
    retryDelay: 0
`;
		const config = parseEndpointsYaml(yaml);

		expect(config.endpoints['main'].retryCount).toBe(3);
		expect(config.endpoints['main'].retryDelay).toBe(1000);
		expect(config.endpoints['noRetry'].retryCount).toBe(0);
		expect(config.endpoints['noRetry'].retryDelay).toBe(0);
	});

	it('passes per-endpoint middleware to buildMultiEndpointConfig', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
    middleware:
      - auth
      - logging
  users:
    url: http://localhost:4001/graphql
`;
		const config = parseEndpointsYaml(yaml);
		const result = buildMultiEndpointConfig(config);

		expect(result.endpoints[0].route.middleware).toEqual(['auth', 'logging']);
		expect(result.endpoints[1].route.middleware).toBeUndefined();
	});

	it('routes with full per-endpoint config preserve all fields', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
    headers:
      Authorization: "Bearer token"
    middleware:
      - auth
    errorPolicy: all
    retryCount: 5
    retryDelay: 2000
`;
		const config = parseEndpointsYaml(yaml);
		const route = config.endpoints['main'];

		expect(route.url).toBe('http://localhost:4000/graphql');
		expect(route.headers).toEqual({ Authorization: 'Bearer token' });
		expect(route.middleware).toEqual(['auth']);
		expect(route.errorPolicy).toBe('all');
		expect(route.retryCount).toBe(5);
		expect(route.retryDelay).toBe(2000);
	});

	it('routes without per-endpoint config have undefined optional fields', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
`;
		const config = parseEndpointsYaml(yaml);
		const route = config.endpoints['main'];

		expect(route.middleware).toBeUndefined();
		expect(route.errorPolicy).toBeUndefined();
		expect(route.retryCount).toBeUndefined();
		expect(route.retryDelay).toBeUndefined();
	});
});
