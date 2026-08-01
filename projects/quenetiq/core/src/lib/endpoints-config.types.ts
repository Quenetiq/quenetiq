import type { GraphqlMiddleware } from './middleware';
import type { ErrorPolicy } from './graphql.service';

export interface EndpointRoute {
	url: string;
	headers?: Record<string, string | (() => string)>;
	middleware?: (GraphqlMiddleware | string)[];
	errorPolicy?: ErrorPolicy;
	retryCount?: number;
	retryDelay?: number;
	fallbackTo?: string;
	healthCheck?: string;
	transformError?: (message: string, statusCode?: number) => string;
	mock?: boolean;
}

export interface EndpointGroup {
	endpoints: string[];
}

export interface EndpointsYaml {
	default_endpoint: string;
	endpoints: Record<string, EndpointRoute>;
	groups?: Record<string, EndpointGroup>;
}

export type TransformFn = (message: string, statusCode?: number) => string;
