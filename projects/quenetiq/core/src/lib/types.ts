import type { GraphQLResult } from './graphql.service';
import type { TypedDocumentNode, TypedQueryString } from './gql';
import type { QueryHandle } from './query';
import type { EndpointsYaml } from './endpoints-config';
import type { GraphqlMiddleware } from './middleware';

// ─── Result inference ───────────────────────────────────────────────────────

/** Extract data type from GraphQLResult<T> */
export type InferResultData<T> = T extends GraphQLResult<infer D> ? D : never;

/** Extract error type from GraphQLResult<T> */
export type InferResultError<T> = T extends { status: 'error'; error: infer E } ? E : never;

/** Check if result is success */
export type IsSuccess<T> = T extends { status: 'success' } ? true : false;

/** Extract data type only when result is success */
export type InferSuccessData<T> = T extends { status: 'success'; data: infer D } ? D : never;

// ─── Document inference ─────────────────────────────────────────────────────

/** Infer response type from DocumentNode or TypedDocumentNode */
export type InferResponse<T> = T extends TypedDocumentNode<infer R>
	? R
	: T extends TypedQueryString<infer R>
		? R
		: T extends { __resultType?: infer R }
			? R
			: unknown;

/** Infer variables type from DocumentNode or TypedDocumentNode */
export type InferVariables<T> = T extends TypedDocumentNode<unknown, infer V>
	? V
	: T extends TypedQueryString<unknown, infer V>
		? V
		: T extends { __variablesType?: infer V }
			? V
			: Record<string, unknown>;

/** Infer both response and variables from a document */
export interface InferDocument<T> {
	response: InferResponse<T>;
	variables: InferVariables<T>;
}

// ─── QueryHandle inference ──────────────────────────────────────────────────

/** Infer data type from QueryHandle<T> */
export type InferQueryData<T> = T extends QueryHandle<infer D> ? D : never;

/** Extract all signal types from QueryHandle */
export type InferQuerySignals<T> = T extends QueryHandle<infer D>
	? {
			data: import('@angular/core').Signal<D | undefined>;
			error: import('@angular/core').Signal<string | undefined>;
			loading: import('@angular/core').Signal<boolean>;
			status: import('@angular/core').Signal<'idle' | 'loading' | 'success' | 'error'>;
	  }
	: never;

// ─── Endpoint inference ─────────────────────────────────────────────────────

/** Infer endpoint route names from EndpointsYaml */
export type InferEndpointNames<T> = T extends EndpointsYaml
	? keyof T['endpoints'] & string
	: string;

/** Infer a specific endpoint route config */
export type InferEndpointRoute<T, N extends string> = T extends EndpointsYaml
	? N extends keyof T['endpoints']
		? T['endpoints'][N]
		: never
	: never;

/** Infer endpoint URL from EndpointsYaml by route name */
export type InferEndpointUrl<T, N extends string> = T extends EndpointsYaml
	? N extends keyof T['endpoints']
		? T['endpoints'][N] extends { url: infer U }
			? U
			: string
		: string
	: string;

/** Infer endpoint headers from EndpointsYaml by route name */
export type InferEndpointHeaders<T, N extends string> = T extends EndpointsYaml
	? N extends keyof T['endpoints']
		? T['endpoints'][N] extends { headers?: infer H }
			? H
			: undefined
		: undefined
	: undefined;

// ─── Middleware inference ───────────────────────────────────────────────────

/** Infer middleware type from an array of middlewares */
export type InferMiddleware<T> = T extends readonly (infer M)[]
	? M extends GraphqlMiddleware
		? M
		: never
	: never;

/** Infer the request context type that middleware receives */
export type InferMiddlewareRequest<T> = T extends (
	req: infer R,
	next: unknown,
) => unknown
	? R
	: never;

// ─── Combined helpers ───────────────────────────────────────────────────────

/** Type-safe endpoint parameter for multi-endpoint mode */
export type EndpointParam<Yaml extends EndpointsYaml | undefined = undefined> = [Yaml] extends [EndpointsYaml]
	? InferEndpointNames<Yaml>
	: string;

/** Extract success data from an observable of GraphQLResult */
export type InferObservableData<T> = T extends import('rxjs').Observable<infer R>
	? InferSuccessData<R>
	: never;

/** Make all fields of a type deeply optional (for partial config merging) */
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Extract non-nullable fields from a type */
export type RequiredKeys<T> = {
	[K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

/** Make only required fields optional (for config defaults) */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;
