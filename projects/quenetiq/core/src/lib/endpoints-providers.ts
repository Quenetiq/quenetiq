import type { EndpointsYaml, EndpointRoute } from './endpoints-config';
import { parseEndpointsYaml, validateEndpointsYaml } from './endpoints-config';

export interface EndpointProviderDescriptor {
	name: string;
	route: EndpointRoute;
}

export interface MultiEndpointProviderResult {
	multiEndpoint: boolean;
	yaml: EndpointsYaml;
	endpoints: EndpointProviderDescriptor[];
}

export function buildMultiEndpointConfig(yamlContent: string | EndpointsYaml): MultiEndpointProviderResult {
	const yaml = typeof yamlContent === 'string' ? parseEndpointsYaml(yamlContent) : yamlContent;

	const errors = validateEndpointsYaml(yaml);
	if (errors.length > 0) {
		throw new Error(`Quenetiq: Invalid endpoints.yml configuration:\n  - ${errors.join('\n  - ')}`);
	}

	const endpoints: EndpointProviderDescriptor[] = Object.entries(yaml.endpoints).map(([name, route]) => ({
		name,
		route,
	}));

	return {
		multiEndpoint: true,
		yaml,
		endpoints,
	};
}

export function buildSingleEndpointConfig(): MultiEndpointProviderResult {
	return {
		multiEndpoint: false,
		yaml: { default_endpoint: '', endpoints: {} },
		endpoints: [],
	};
}
