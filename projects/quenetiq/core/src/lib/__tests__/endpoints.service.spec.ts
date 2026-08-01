import { describe, it, expect } from 'vitest';
import { buildMultiEndpointConfig, buildSingleEndpointConfig } from '../endpoints-providers';
import { validateEndpointsYaml, type EndpointsYaml } from '../endpoints-config';

describe('buildMultiEndpointConfig', () => {
	it('returns config from YAML string', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
`;
		const config = buildMultiEndpointConfig(yaml);

		expect(config.multiEndpoint).toBe(true);
		expect(config.yaml.default_endpoint).toBe('main');
		expect(config.endpoints).toHaveLength(1);
		expect(config.endpoints[0].name).toBe('main');
		expect(config.endpoints[0].route.url).toBe('http://localhost:4000/graphql');
	});

	it('returns config from EndpointsYaml object', () => {
		const yamlObj: EndpointsYaml = {
			default_endpoint: 'main',
			endpoints: {
				main: { url: 'http://localhost:4000/graphql' },
				users: { url: 'http://localhost:4001/graphql' },
			},
		};

		const config = buildMultiEndpointConfig(yamlObj);

		expect(config.multiEndpoint).toBe(true);
		expect(config.endpoints).toHaveLength(2);
		expect(config.endpoints.map((e) => e.name)).toEqual(['main', 'users']);
	});

	it('throws on invalid config', () => {
		const yaml = `
default_endpoint: nonexistent

endpoints:
  main:
    url: http://localhost:4000/graphql
`;

		expect(() => buildMultiEndpointConfig(yaml)).toThrow('Invalid endpoints.yml configuration');
	});

	it('includes route headers in descriptors', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
    headers:
      Authorization: "Bearer token"
`;
		const config = buildMultiEndpointConfig(yaml);

		expect(config.endpoints[0].route.headers).toEqual({
			Authorization: 'Bearer token',
		});
	});

	it('handles multiple routes', () => {
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
		const config = buildMultiEndpointConfig(yaml);

		expect(config.endpoints).toHaveLength(4);
		expect(config.endpoints.map((e) => e.name)).toEqual(['main', 'users', 'posts', 'comments']);
	});
});

describe('buildSingleEndpointConfig', () => {
	it('returns config with multiEndpoint false', () => {
		const config = buildSingleEndpointConfig();

		expect(config.multiEndpoint).toBe(false);
		expect(config.yaml.default_endpoint).toBe('');
		expect(config.yaml.endpoints).toEqual({});
		expect(config.endpoints).toHaveLength(0);
	});
});

describe('validateEndpointsYaml integration', () => {
	it('validates valid config', () => {
		const config: EndpointsYaml = {
			default_endpoint: 'main',
			endpoints: {
				main: { url: 'http://localhost:4000/graphql' },
			},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors).toHaveLength(0);
	});

	it('catches missing default_endpoint', () => {
		const config: EndpointsYaml = {
			default_endpoint: '',
			endpoints: {
				main: { url: 'http://localhost:4000/graphql' },
			},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors.length).toBeGreaterThan(0);
	});

	it('catches empty endpoints', () => {
		const config: EndpointsYaml = {
			default_endpoint: 'main',
			endpoints: {},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors.length).toBeGreaterThan(0);
	});

	it('catches missing url in route', () => {
		const config: EndpointsYaml = {
			default_endpoint: 'main',
			endpoints: {
				main: { url: '' },
			},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors.length).toBeGreaterThan(0);
	});

	it('catches non-existent default_endpoint', () => {
		const config: EndpointsYaml = {
			default_endpoint: 'nonexistent',
			endpoints: {
				main: { url: 'http://localhost:4000/graphql' },
			},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors.length).toBeGreaterThan(0);
	});
});
