import { describe, it, expect } from 'vitest';
import { parseEndpointsYaml, validateEndpointsYaml, generateEndpointsYamlTemplate } from '../endpoints-config';

describe('parseEndpointsYaml', () => {
	it('parses a basic endpoints.yml with one route', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
`;
		const result = parseEndpointsYaml(yaml);

		expect(result.default_endpoint).toBe('main');
		expect(result.endpoints['main']).toEqual({ url: 'http://localhost:4000/graphql' });
	});

	it('parses multiple routes', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
  users:
    url: http://localhost:4001/graphql
  posts:
    url: http://localhost:4002/graphql
`;
		const result = parseEndpointsYaml(yaml);

		expect(result.default_endpoint).toBe('main');
		expect(Object.keys(result.endpoints)).toHaveLength(3);
		expect(result.endpoints['main'].url).toBe('http://localhost:4000/graphql');
		expect(result.endpoints['users'].url).toBe('http://localhost:4001/graphql');
		expect(result.endpoints['posts'].url).toBe('http://localhost:4002/graphql');
	});

	it('parses routes with headers', () => {
		const yaml = `
default_endpoint: main

endpoints:
  main:
    url: http://localhost:4000/graphql
    headers:
      Authorization: "Bearer token123"
      X-Custom: "value"
`;
		const result = parseEndpointsYaml(yaml);

		expect(result.endpoints['main'].headers).toEqual({
			Authorization: 'Bearer token123',
			'X-Custom': 'value',
		});
	});

	it('strips quotes from values', () => {
		const yaml = `
default_endpoint: "main"

endpoints:
  main:
    url: "http://localhost:4000/graphql"
`;
		const result = parseEndpointsYaml(yaml);

		expect(result.default_endpoint).toBe('main');
		expect(result.endpoints['main'].url).toBe('http://localhost:4000/graphql');
	});

	it('skips comment lines', () => {
		const yaml = `
# This is a comment
default_endpoint: main

# Another comment
endpoints:
  main:
    url: http://localhost:4000/graphql
`;
		const result = parseEndpointsYaml(yaml);

		expect(result.default_endpoint).toBe('main');
		expect(result.endpoints['main'].url).toBe('http://localhost:4000/graphql');
	});

	it('handles empty lines', () => {
		const yaml = `
default_endpoint: main

endpoints:

  main:
    url: http://localhost:4000/graphql
`;
		const result = parseEndpointsYaml(yaml);

		expect(result.default_endpoint).toBe('main');
		expect(result.endpoints['main'].url).toBe('http://localhost:4000/graphql');
	});

	it('parses route with headers but no other properties first', () => {
		const yaml = `
default_endpoint: api

endpoints:
  api:
    headers:
      Authorization: "Bearer token"
    url: http://localhost:4000/graphql
`;
		const result = parseEndpointsYaml(yaml);

		expect(result.default_endpoint).toBe('api');
		expect(result.endpoints['api'].url).toBe('http://localhost:4000/graphql');
		expect(result.endpoints['api'].headers).toEqual({
			Authorization: 'Bearer token',
		});
	});
});

describe('validateEndpointsYaml', () => {
	it('returns no errors for valid config', () => {
		const config = {
			default_endpoint: 'main',
			endpoints: {
				main: { url: 'http://localhost:4000/graphql' },
			},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors).toHaveLength(0);
	});

	it('returns error when default_endpoint is missing', () => {
		const config = {
			default_endpoint: '',
			endpoints: {
				main: { url: 'http://localhost:4000/graphql' },
			},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors).toContainEqual('Missing required field: default_endpoint');
	});

	it('returns error when endpoints is empty', () => {
		const config = {
			default_endpoint: 'main',
			endpoints: {},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors).toContainEqual('Missing required field: endpoints (must have at least one endpoint)');
	});

	it('returns error when endpoints is undefined', () => {
		const config = {
			default_endpoint: 'main',
			endpoints: undefined as unknown as Record<string, { url: string }>,
		};

		const errors = validateEndpointsYaml(config);
		expect(errors).toContainEqual('Missing required field: endpoints (must have at least one endpoint)');
	});

	it('returns error when default_endpoint references non-existent endpoint', () => {
		const config = {
			default_endpoint: 'nonexistent',
			endpoints: {
				main: { url: 'http://localhost:4000/graphql' },
			},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors).toContainEqual(
			'default_endpoint "nonexistent" references an endpoint that does not exist in endpoints',
		);
	});

	it('returns error when a route is missing url', () => {
		const config = {
			default_endpoint: 'main',
			endpoints: {
				main: { url: '' },
			},
		};

		const errors = validateEndpointsYaml(config);
		expect(errors).toContainEqual('Route "main" is missing required field: url');
	});

	it('returns multiple errors at once', () => {
		const config = {
			default_endpoint: '',
			endpoints: {} as Record<string, { url: string }>,
		};

		const errors = validateEndpointsYaml(config);
		expect(errors.length).toBeGreaterThanOrEqual(2);
	});
});

describe('generateEndpointsYamlTemplate', () => {
	it('returns a non-empty string', () => {
		const template = generateEndpointsYamlTemplate();
		expect(template.length).toBeGreaterThan(0);
	});

	it('contains default_endpoint field', () => {
		const template = generateEndpointsYamlTemplate();
		expect(template).toContain('default_endpoint:');
	});

	it('contains endpoints section', () => {
		const template = generateEndpointsYamlTemplate();
		expect(template).toContain('endpoints:');
	});

	it('contains example routes', () => {
		const template = generateEndpointsYamlTemplate();
		expect(template).toContain('main:');
		expect(template).toContain('users:');
		expect(template).toContain('payments:');
	});

	it('contains comments', () => {
		const template = generateEndpointsYamlTemplate();
		expect(template).toContain('# Quenetiq Endpoints Configuration');
	});
});
