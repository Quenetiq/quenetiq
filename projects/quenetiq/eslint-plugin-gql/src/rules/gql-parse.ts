import { parse, GraphQLError } from 'graphql';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import {
	extractTemplate,
	extractStringLiteral,
	GQL_OPTIONS_SCHEMA_PROPERTIES,
	getGqlTagName,
	isGqlTag,
	isCreateTypedQuery,
	mapGraphQlLoc,
	resolveGqlOptions,
	type ExtractedTemplate,
	type GqlRuleOptions,
} from './gql-utils';

type MessageIds = 'gqlParseError';

/**
 * Validates that `gql` tagged templates (and `createTypedQuery()` strings)
 * contain valid GraphQL syntax by running them through `graphql.parse()`.
 *
 * Options:
 * - `tags`            — tag names to check (default `['gql', 'graphql']`)
 * - `checkTypedQueries` — also check `createTypedQuery()` strings (default `true`)
 * - `skipInterpolated`  — skip `${...}` templates (fragment composition, default `true`)
 * - `disabled`          — disable the rule entirely (default `false`)
 * - `parseOptions`      — passed through to `graphql.parse()`
 */
export const gqlParseRule: TSESLint.RuleModule<MessageIds, [options?: GqlRuleOptions]> = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Validate GraphQL syntax inside gql tagged templates',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					...GQL_OPTIONS_SCHEMA_PROPERTIES,
				},
			},
		],
		messages: {
			gqlParseError: 'GraphQL syntax error: {{message}}',
		},
	},
	create(context) {
		const options = resolveGqlOptions(context.options[0]);
		if (options.disabled) return {};

		const validate = (template: ExtractedTemplate, node: TSESTree.Node): void => {
			if (template.hasInterpolation && options.skipInterpolated) return;
			if (!template.text.trim()) return;

			try {
				parse(template.text, options.parseOptions);
			} catch (error) {
				if (error instanceof GraphQLError) {
					const gqlLoc = error.locations?.[0];
					context.report({
						node,
						loc: gqlLoc ? mapGraphQlLoc(template, gqlLoc) : undefined,
						messageId: 'gqlParseError',
						data: { message: error.message },
					});
					return;
				}
				if (error instanceof Error) {
					context.report({
						node,
						messageId: 'gqlParseError',
						data: { message: error.message },
					});
				}
			}
		};

		return {
			TaggedTemplateExpression(node) {
				const tagName = getGqlTagName(node.tag);
				if (!tagName || !isGqlTag(tagName, options.tags)) return;
				validate(extractTemplate(node), node);
			},
			CallExpression(node) {
				if (!options.checkTypedQueries) return;
				if (!isCreateTypedQuery(node.callee)) return;
				const arg = node.arguments.at(0);
				if (arg?.type !== 'Literal') return;
				const template = extractStringLiteral(arg);
				if (!template) return;
				validate(template, arg);
			},
		};
	},
};
