import { QuenetiqError } from './base';

export interface GraphQLLocation {
	line: number;
	column: number;
}

export class GraphQLError extends QuenetiqError {
	public readonly locations?: readonly GraphQLLocation[];
	public readonly path?: readonly (string | number)[];
	public readonly extensions?: Readonly<Record<string, unknown>>;

	constructor(gqlError: {
		message: string;
		locations?: GraphQLLocation[];
		path?: (string | number)[];
		extensions?: Record<string, unknown>;
	}) {
		super(gqlError.message, 'GRAPHQL_ERROR', gqlError.extensions);
		this.name = 'GraphQLError';
		this.locations = gqlError.locations;
		this.path = gqlError.path;
		this.extensions = gqlError.extensions;
	}
}
