import type { TSESLint } from '@typescript-eslint/utils';
import { gqlParseRule } from './rules/gql-parse';
import { gqlNamedOperationsRule } from './rules/gql-named-operations';

/**
 * ESLint plugin for Quenetiq GraphQL.
 *
 * Rules operate on `gql` tagged templates (and `createTypedQuery()` strings)
 * and parse the embedded GraphQL document with the `graphql` package at lint time.
 */
export const quenetiqPlugin: TSESLint.FlatConfig.Plugin = {
	meta: {
		name: '@quenetiq/eslint-plugin-gql',
		version: '1.0.6-beta',
	},
	rules: {
		'gql-parse': gqlParseRule,
		'gql-named-operations': gqlNamedOperationsRule,
	},
};
