import { parse, type DocumentNode, print } from 'graphql';

export function gql(strings: TemplateStringsArray, ...values: string[]): DocumentNode {
	return parse(String.raw(strings, ...values));
}

export { type DocumentNode, print };

export interface TypedDocumentNode<
	TResult = unknown,
	TVariables extends Record<string, unknown> = Record<string, unknown>,
> extends DocumentNode {
	__resultType?: TResult;
	__variablesType?: TVariables;
}
