import type { EndpointRoute, EndpointsYaml } from './endpoints-config.types';

export function parseEndpointsYaml(raw: string): EndpointsYaml {
	const lines = raw.split('\n');
	const result: EndpointsYaml = {
		default_endpoint: '',
		endpoints: {},
		groups: {},
	};

	let currentRoute: string | null = null;
	let currentHeaders: Record<string, string | (() => string)> | null = null;
	let inHeaders = false;
	let inMiddleware = false;
	let inGroups = false;
	let currentGroup: string | null = null;

	const flushHeaders = (): void => {
		if (currentRoute && currentHeaders && Object.keys(currentHeaders).length > 0) {
			if (!result.endpoints[currentRoute]) {
				result.endpoints[currentRoute] = { url: '', headers: currentHeaders };
			} else {
				result.endpoints[currentRoute].headers = currentHeaders;
			}
		}
	};

	const getIndent = (line: string): number => {
		let count = 0;
		for (const ch of line) {
			if (ch === ' ' || ch === '\t') count++;
			else break;
		}
		return count;
	};

	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith('#')) continue;

		const indent = getIndent(line);

		if (indent === 0) {
			flushHeaders();
			inHeaders = false;
			inMiddleware = false;
			inGroups = false;
			currentHeaders = null;

			const defaultMatch = trimmed.match(/^default_endpoint:\s*(.+)$/);
			if (defaultMatch) {
				result.default_endpoint = defaultMatch[1].trim().replace(/['"]/g, '');
				continue;
			}

			if (/^endpoints:\s*$/.test(trimmed)) {
				continue;
			}

			if (/^groups:\s*$/.test(trimmed)) {
				inGroups = true;
				continue;
			}
		}

		if (indent === 2) {
			flushHeaders();
			inHeaders = false;
			inMiddleware = false;
			currentHeaders = null;

			const routeMatch = trimmed.match(/^(\w[\w-]*):\s*$/);
			if (routeMatch) {
				inGroups = false;
				currentRoute = routeMatch[1];
				currentGroup = null;
				if (!result.endpoints[currentRoute]) {
					result.endpoints[currentRoute] = { url: '' };
				}
				continue;
			}
		}

		if (indent === 2 && inGroups) {
			const groupMatch = trimmed.match(/^(\w[\w-]*):\s*$/);
			if (groupMatch) {
				currentGroup = groupMatch[1];
				result.groups ??= {};
				result.groups[currentGroup] = { endpoints: [] };
				continue;
			}
		}

		if (indent === 4 && currentRoute && !inGroups) {
			const headersMatch = trimmed.match(/^headers:\s*$/);
			if (headersMatch) {
				inHeaders = true;
				inMiddleware = false;
				currentHeaders = {};
				continue;
			}

			const middlewareMatch = trimmed.match(/^middleware:\s*$/);
			if (middlewareMatch) {
				inHeaders = false;
				inMiddleware = true;
				if (!result.endpoints[currentRoute]) {
					result.endpoints[currentRoute] = { url: '', middleware: [] };
				} else {
					result.endpoints[currentRoute].middleware = [];
				}
				continue;
			}

			inHeaders = false;
			inMiddleware = false;

			const urlMatch = trimmed.match(/^url:\s*(.+)$/);
			if (urlMatch) {
				const url = urlMatch[1].trim().replace(/['"]/g, '');
				if (!result.endpoints[currentRoute]) {
					result.endpoints[currentRoute] = { url };
				} else {
					result.endpoints[currentRoute].url = url;
				}
				continue;
			}

			const errorPolicyMatch = trimmed.match(/^errorPolicy:\s*(.+)$/);
			if (errorPolicyMatch) {
				const policy = errorPolicyMatch[1].trim().replace(/['"]/g, '');
				if (!result.endpoints[currentRoute]) {
					result.endpoints[currentRoute] = { url: '', errorPolicy: policy as EndpointRoute['errorPolicy'] };
				} else {
					result.endpoints[currentRoute].errorPolicy = policy as EndpointRoute['errorPolicy'];
				}
				continue;
			}

			const retryCountMatch = trimmed.match(/^retryCount:\s*(.+)$/);
			if (retryCountMatch) {
				const count = parseInt(retryCountMatch[1].trim(), 10);
				if (!isNaN(count)) {
					if (!result.endpoints[currentRoute]) {
						result.endpoints[currentRoute] = { url: '', retryCount: count };
					} else {
						result.endpoints[currentRoute].retryCount = count;
					}
				}
				continue;
			}

			const retryDelayMatch = trimmed.match(/^retryDelay:\s*(.+)$/);
			if (retryDelayMatch) {
				const delay = parseInt(retryDelayMatch[1].trim(), 10);
				if (!isNaN(delay)) {
					if (!result.endpoints[currentRoute]) {
						result.endpoints[currentRoute] = { url: '', retryDelay: delay };
					} else {
						result.endpoints[currentRoute].retryDelay = delay;
					}
				}
				continue;
			}

			const fallbackMatch = trimmed.match(/^fallbackTo:\s*(.+)$/);
			if (fallbackMatch) {
				const target = fallbackMatch[1].trim().replace(/['"]/g, '');
				if (!result.endpoints[currentRoute]) {
					result.endpoints[currentRoute] = { url: '', fallbackTo: target };
				} else {
					result.endpoints[currentRoute].fallbackTo = target;
				}
				continue;
			}

			const healthCheckMatch = trimmed.match(/^healthCheck:\s*(.+)$/);
			if (healthCheckMatch) {
				const path = healthCheckMatch[1].trim().replace(/['"]/g, '');
				if (!result.endpoints[currentRoute]) {
					result.endpoints[currentRoute] = { url: '', healthCheck: path };
				} else {
					result.endpoints[currentRoute].healthCheck = path;
				}
				continue;
			}

			const transformErrorMatch = trimmed.match(/^transformError:\s*(.+)$/);
			if (transformErrorMatch) {
				const name = transformErrorMatch[1].trim().replace(/['"]/g, '');
				if (!result.endpoints[currentRoute]) {
					result.endpoints[currentRoute] = { url: '', transformError: name as unknown as EndpointRoute['transformError'] };
				} else {
					result.endpoints[currentRoute].transformError = name as unknown as EndpointRoute['transformError'];
				}
				continue;
			}

			const mockMatch = trimmed.match(/^mock:\s*(true|false)$/);
			if (mockMatch) {
				const val = mockMatch[1] === 'true';
				if (!result.endpoints[currentRoute]) {
					result.endpoints[currentRoute] = { url: '', mock: val };
				} else {
					result.endpoints[currentRoute].mock = val;
				}
				continue;
			}
		}

		if (indent === 4 && inGroups && currentGroup && result.groups?.[currentGroup]) {
			const itemMatch = trimmed.match(/^-\s+(.+)$/);
			if (itemMatch) {
				const routeName = itemMatch[1].trim().replace(/['"]/g, '');
				result.groups[currentGroup].endpoints.push(routeName);
				continue;
			}
		}

		if (indent === 6 && currentRoute) {
			if (inHeaders && currentHeaders) {
				const headerMatch = trimmed.match(/^(\w[\w-]*):\s*(.+)$/);
				if (headerMatch) {
					const key = headerMatch[1];
					const value = headerMatch[2].trim().replace(/['"]/g, '');
					currentHeaders[key] = value;
					continue;
				}
			}

			if (inMiddleware) {
				const itemMatch = trimmed.match(/^-\s+(.+)$/);
				if (itemMatch) {
					const itemName = itemMatch[1].trim();
					result.endpoints[currentRoute] ??= { url: '', middleware: [] };
					result.endpoints[currentRoute].middleware ??= [];
					(result.endpoints[currentRoute].middleware as string[]).push(itemName);
				}
			}
		}
	}

	flushHeaders();

	return result;
}
