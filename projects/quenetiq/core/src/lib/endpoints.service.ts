import { inject, Injectable, InjectionToken, type Provider } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { EndpointsYaml, EndpointRoute } from './endpoints-config';
import { parseEndpointsYaml, validateEndpointsYaml, resolveHeaderEnvVars } from './endpoints-config';
import { GraphqlEndpoint, getEndpointToken } from './endpoint';
import type { GraphqlMiddleware } from './middleware';
import { GraphqlService, type RequestOverrideConfig } from './graphql.service';

export const ENDPOINTS_YAML = new InjectionToken<EndpointsYaml>('ENDPOINTS_YAML');
export const IS_MULTI_ENDPOINT = new InjectionToken<boolean>('IS_MULTI_ENDPOINT');

export interface EndpointLifecycleHook {
	beforeEndpoint?: (name: string, route: EndpointRoute) => void;
	afterEndpoint?: (name: string, route: EndpointRoute, durationMs: number) => void;
	onFallback?: (from: string, to: string) => void;
	onHealthCheck?: (name: string, route: EndpointRoute, healthy: boolean) => void;
}

export const ENDPOINT_LIFECYCLE = new InjectionToken<EndpointLifecycleHook>('ENDPOINT_LIFECYCLE');

export interface HealthCheckResult {
	name: string;
	url: string;
	healthy: boolean;
	statusCode?: number;
	durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class EndpointsService {
	private readonly yaml: EndpointsYaml | null;
	private readonly graphql: GraphqlService;
	private readonly http = inject(HttpClient, { optional: true });
	private readonly lifecycle: EndpointLifecycleHook | null;
	readonly isMultiEndpoint: boolean;

	/** Track failed endpoints for fallback routing. */
	private readonly failedEndpoints = new Set<string>();

	constructor() {
		this.graphql = inject(GraphqlService);
		this.isMultiEndpoint = inject(IS_MULTI_ENDPOINT, { optional: true }) ?? false;
		this.yaml = inject(ENDPOINTS_YAML, { optional: true });
		this.lifecycle = inject(ENDPOINT_LIFECYCLE, { optional: true }) ?? null;
	}

	get defaultEndpoint(): string | null {
		return this.yaml?.default_endpoint ?? null;
	}

	get routeNames(): string[] {
		return this.yaml ? Object.keys(this.yaml.endpoints) : [];
	}

	getRoute(name: string): EndpointRoute | undefined {
		return this.yaml?.endpoints[name];
	}

	hasRoute(name: string): boolean {
		return name in (this.yaml?.endpoints ?? {});
	}

	/** Get all routes in a named group. */
	getGroupRoutes(groupName: string): string[] {
		return this.yaml?.groups?.[groupName]?.endpoints ?? [];
	}

	/** Get all group names. */
	get groupNames(): string[] {
		return this.yaml?.groups ? Object.keys(this.yaml.groups) : [];
	}

	/** Check if a route belongs to a group. */
	isInGroup(routeName: string, groupName: string): boolean {
		return this.getGroupRoutes(groupName).includes(routeName);
	}

	/** Resolve endpoint with fallback support. Resolves to fallback URL if primary is failed. */
	resolveEndpointUrl(name: string): string | undefined {
		const route = this.getRoute(name);
		if (!route) return undefined;

		if (this.failedEndpoints.has(name) && route.fallbackTo) {
			this.lifecycle?.onFallback?.(name, route.fallbackTo);
			const fallback = this.getRoute(route.fallbackTo);
			return fallback?.url;
		}

		return route.url;
	}

	/** Mark an endpoint as failed (e.g. after 5xx / timeout). */
	markFailed(name: string): void {
		this.failedEndpoints.add(name);
	}

	/** Clear failed status for an endpoint. */
	markHealthy(name: string): void {
		this.failedEndpoints.delete(name);
	}

	/** Check if an endpoint is currently marked as failed. */
	isFailed(name: string): boolean {
		return this.failedEndpoints.has(name);
	}

	resolveEndpoint(name: string): GraphqlEndpoint {
		const route = this.getRoute(name);
		if (!route) {
			throw new Error(
				`Quenetiq: Endpoint "${name}" not found in endpoints.yml. ` +
					`Available endpoints: ${this.routeNames.join(', ') || 'none'}`,
			);
		}
		const url = this.resolveEndpointUrl(name) ?? route.url;
		const resolvedHeaders = route.headers ? resolveHeaderEnvVars(route.headers) : undefined;
		return new GraphqlEndpoint(this.graphql, url, resolvedHeaders, {
			middleware: route.middleware?.filter((m): m is GraphqlMiddleware => typeof m !== 'string'),
			errorPolicy: route.errorPolicy,
			retryCount: route.retryCount,
			retryDelay: route.retryDelay,
		});
	}

	/** Run health checks for all routes that have a healthCheck path. */
	async runHealthChecks(): Promise<HealthCheckResult[]> {
		if (!this.http) return [];

		const results: HealthCheckResult[] = [];

		for (const [name, route] of Object.entries(this.yaml?.endpoints ?? {})) {
			if (!route.healthCheck) continue;

			const url = `${route.url.replace(/\/graphql\/?$/, '')}${route.healthCheck}`;
			const start = performance.now();

			try {
				const response = await this.http.get(url, { observe: 'response' }).toPromise();
				const durationMs = performance.now() - start;
				const healthy = (response?.status ?? 0) >= 200 && (response?.status ?? 0) < 400;

				if (healthy) {
					this.markHealthy(name);
				} else {
					this.markFailed(name);
				}

				this.lifecycle?.onHealthCheck?.(name, route, healthy);

				results.push({
					name,
					url: route.url,
					healthy,
					statusCode: response?.status,
					durationMs,
				});
			} catch {
				const durationMs = performance.now() - start;
				this.markFailed(name);
				this.lifecycle?.onHealthCheck?.(name, route, false);

				results.push({
					name,
					url: route.url,
					healthy: false,
					durationMs,
				});
			}
		}

		return results;
	}

	throwIfMultiEndpointMissing(endpointName: string | undefined): string | undefined {
		if (!endpointName && this.isMultiEndpoint) {
			const defaultEp = this.defaultEndpoint;
			if (defaultEp) return defaultEp;
			throw new Error(
				'Quenetiq: multiEndpoint is enabled but no endpoint name was provided ' +
					'and no default_endpoint is set in endpoints.yml. ' +
					`Available endpoints: ${this.routeNames.join(', ')}`,
			);
		}
		return endpointName;
	}
}

function createEndpointProviders(yaml: EndpointsYaml): Provider[] {
	const providers: Provider[] = [];

	for (const [name, route] of Object.entries(yaml.endpoints)) {
		const token = getEndpointToken(name);
		const resolvedHeaders = route.headers ? resolveHeaderEnvVars(route.headers) : undefined;
		const hasOverride = route.middleware || route.errorPolicy ||
			route.retryCount !== undefined || route.retryDelay !== undefined;
		const overrideConfig: RequestOverrideConfig | undefined = hasOverride
			? {
				middleware: route.middleware?.filter((m): m is GraphqlMiddleware => typeof m !== 'string'),
				errorPolicy: route.errorPolicy,
				retryCount: route.retryCount,
				retryDelay: route.retryDelay,
			}
			: undefined;

		providers.push({
			provide: token,
			useFactory: (graphql: GraphqlService) =>
				new GraphqlEndpoint(graphql, route.url, resolvedHeaders, overrideConfig),
			deps: [GraphqlService],
		});
	}

	return providers;
}

export function provideMultiEndpoint(yamlContent: string | EndpointsYaml): Provider[] {
	const yaml = typeof yamlContent === 'string' ? parseEndpointsYaml(yamlContent) : yamlContent;

	const errors = validateEndpointsYaml(yaml);
	if (errors.length > 0) {
		throw new Error(`Quenetiq: Invalid endpoints.yml configuration:\n  - ${errors.join('\n  - ')}`);
	}

	return [
		{ provide: IS_MULTI_ENDPOINT, useValue: true },
		{ provide: ENDPOINTS_YAML, useValue: yaml },
		...createEndpointProviders(yaml),
	];
}

export function provideMultiEndpointWithLifecycle(
	yamlContent: string | EndpointsYaml,
	hook: EndpointLifecycleHook,
): Provider[] {
	return [
		...provideMultiEndpoint(yamlContent),
		{ provide: ENDPOINT_LIFECYCLE, useValue: hook },
	];
}

export function provideSingleEndpoint(): Provider[] {
	return [{ provide: IS_MULTI_ENDPOINT, useValue: false }];
}
