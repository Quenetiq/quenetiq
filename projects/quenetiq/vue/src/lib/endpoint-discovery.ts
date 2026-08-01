export interface DiscoveryResult {
	routeName: string;
	url: string;
	accessible: boolean;
	hasSchema: boolean;
	sdlPreview?: string;
	error?: string;
}

export type EndpointDefinition = Record<string, { url: string; headers?: Record<string, string> }>;

const INTROSPECTION_QUERY = '{ __schema { queryType { name } mutationType { name } types { name kind } } }';

/**
 * Probe all endpoints and report accessibility + schema availability.
 *
 * Framework-agnostic — uses `fetch` directly, no Angular DI required.
 */
export async function discoverEndpoints(
	endpoints: EndpointDefinition,
): Promise<DiscoveryResult[]> {
	const results: DiscoveryResult[] = [];

	for (const [name, route] of Object.entries(endpoints)) {
		const result: DiscoveryResult = {
			routeName: name,
			url: route.url,
			accessible: false,
			hasSchema: false,
		};

		try {
			const response = await fetch(route.url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...route.headers,
				},
				body: JSON.stringify({ query: INTROSPECTION_QUERY }),
			});

			result.accessible = response.ok;

			if (response.ok) {
				const json = (await response.json()) as {
					data?: Record<string, unknown>;
					errors?: { message: string }[];
				};

				if (json.data?.['__schema']) {
					result.hasSchema = true;
					const schema = json.data['__schema'] as Record<string, unknown>;
					const types = (schema['types'] as { name: string; kind: string }[])?.length ?? 0;
					result.sdlPreview = `${types} types found`;
				} else if (json.errors?.length) {
					result.error = json.errors[0].message;
				}
			}
		} catch (err) {
			result.error = err instanceof Error ? err.message : 'Connection failed';
		}

		results.push(result);
	}

	return results;
}
