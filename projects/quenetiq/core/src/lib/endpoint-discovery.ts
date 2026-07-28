import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { EndpointsYaml } from './endpoints-config';

export interface DiscoveryResult {
	routeName: string;
	url: string;
	accessible: boolean;
	hasSchema: boolean;
	sdlPreview?: string;
	error?: string;
}

/**
 * Auto-validates endpoint YAML against running schemas.
 * For each route, fetches the introspection query to verify the endpoint
 * is reachable and serves a valid GraphQL schema.
 */
@Injectable({ providedIn: 'root' })
export class EndpointDiscoveryService {
	private readonly http = inject(HttpClient, { optional: true });

	/**
	 * Probe all endpoints in the YAML config and report accessibility + schema availability.
	 */
	async discover(yaml: EndpointsYaml): Promise<DiscoveryResult[]> {
		if (!this.http) return [];

		const results: DiscoveryResult[] = [];
		const introspectionQuery = {
			query: '{ __schema { queryType { name } mutationType { name } types { name kind } } }',
		};

		for (const [name, route] of Object.entries(yaml.endpoints)) {
			const result: DiscoveryResult = {
				routeName: name,
				url: route.url,
				accessible: false,
				hasSchema: false,
			};

			try {
				const response = await this.http
					.post<{ data?: Record<string, unknown>; errors?: { message: string }[] }>(
						route.url,
						introspectionQuery,
					)
					.toPromise();

				result.accessible = true;
				if (response?.data?.['__schema']) {
					result.hasSchema = true;
					const schema = response.data['__schema'] as Record<string, unknown>;
					const types = (schema['types'] as { name: string; kind: string }[])?.length ?? 0;
					result.sdlPreview = `${types} types found`;
				} else if (response?.errors?.length) {
					result.error = response.errors[0].message;
				}
			} catch (err) {
				result.error = err instanceof Error ? err.message : 'Connection failed';
			}

			results.push(result);
		}

		return results;
	}
}
