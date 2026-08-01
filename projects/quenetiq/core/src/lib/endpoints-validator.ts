import type { EndpointsYaml } from './endpoints-config.types';

export function validateEndpointsYaml(config: EndpointsYaml): string[] {
	const errors: string[] = [];

	if (!config.default_endpoint) {
		errors.push('Missing required field: default_endpoint');
	}

	if (!config.endpoints || Object.keys(config.endpoints).length === 0) {
		errors.push('Missing required field: endpoints (must have at least one endpoint)');
	}

	if (config.default_endpoint && config.endpoints && !config.endpoints[config.default_endpoint]) {
		errors.push(
			`default_endpoint "${config.default_endpoint}" references an endpoint that does not exist in endpoints`,
		);
	}

	for (const [name, route] of Object.entries(config.endpoints ?? {})) {
		if (!route.url) {
			errors.push(`Route "${name}" is missing required field: url`);
		}
		if (route.errorPolicy && !['none', 'all', 'ignore'].includes(route.errorPolicy)) {
			errors.push(
				`Route "${name}" has invalid errorPolicy: "${route.errorPolicy}" (expected none|all|ignore)`,
			);
		}
		if (route.retryCount !== undefined && (route.retryCount < 0 || !Number.isInteger(route.retryCount))) {
			errors.push(
				`Route "${name}" has invalid retryCount: ${route.retryCount} (expected non-negative integer)`,
			);
		}
		if (route.retryDelay !== undefined && (route.retryDelay < 0 || !Number.isInteger(route.retryDelay))) {
			errors.push(
				`Route "${name}" has invalid retryDelay: ${route.retryDelay} (expected non-negative integer)`,
			);
		}
		if (route.fallbackTo && !config.endpoints?.[route.fallbackTo]) {
			errors.push(
				`Route "${name}" fallbackTo "${route.fallbackTo}" references an endpoint that does not exist`,
			);
		}
	}

	for (const [groupName, group] of Object.entries(config.groups ?? {})) {
		for (const routeName of group.endpoints) {
			if (!config.endpoints?.[routeName]) {
				errors.push(
					`Group "${groupName}" references route "${routeName}" that does not exist`,
				);
			}
		}
	}

	return errors;
}
