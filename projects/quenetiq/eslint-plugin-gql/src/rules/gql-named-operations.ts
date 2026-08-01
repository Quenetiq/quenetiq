import { parse, getLocation, type DocumentNode } from 'graphql';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import {
	extractTemplate,
	extractStringLiteral,
	GQL_OPTIONS_SCHEMA_PROPERTIES,
	getGqlTagName,
	isGqlTag,
	isCreateTypedQuery,
	isSpecFile,
	mapGraphQlLoc,
	resolveGqlNamedOptions,
	type ExtractedTemplate,
	type GqlNamedOperationsOptions,
	type ResolvedGqlNamedOptions,
} from './gql-utils';

type MessageIds = 'operationMustBeNamed';

/**
 * Requires every GraphQL operation (`query`, `mutation`, `subscription`)
 * inside a `gql` tagged template (or `createTypedQuery()` string) to have an
 * explicit name.
 *
 * Named operations can be cached, invalidated, and debugged; anonymous
 * operations cannot be identified after the request is sent.
 *
 * Options (in addition to the shared `gql-*` options):
 * - `allowAnonymous`    — allow anonymous operations (default `false`)
 * - `ignoreOperations`  — exempt specific operation kinds (default `[]`)
 * - `allowInSpec`       — skip `*.spec.*` test files (default `false`)
 */
export const gqlNamedOperationsRule: TSESLint.RuleModule<
	MessageIds,
	[options?: GqlNamedOperationsOptions]
> = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Require every GraphQL operation in a gql template to be named',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					...GQL_OPTIONS_SCHEMA_PROPERTIES,
					allowAnonymous: {
						type: 'boolean',
						description: 'Allow anonymous operations. Default: false',
					},
					ignoreOperations: {
						type: 'array',
						items: { type: 'string', enum: ['query', 'mutation', 'subscription'] },
						description: 'Operation kinds exempt from the naming requirement. Default: []',
					},
					allowInSpec: {
						type: 'boolean',
						description: 'Skip *.spec.* test files. Default: false',
					},
				},
			},
		],
		messages: {
			operationMustBeNamed: 'GraphQL {{kind}} operations must be named.',
		},
	},
	create(context) {
		const options: ResolvedGqlNamedOptions = resolveGqlNamedOptions(context.options[0]);
		if (options.disabled) return {};
		if (options.allowAnonymous) return {};
		if (options.allowInSpec && isSpecFile(context.filename)) return {};

		const check = (template: ExtractedTemplate, node: TSESTree.Node): void => {
			if (template.hasInterpolation && options.skipInterpolated) return;
			if (!template.text.trim()) return;

			let doc: DocumentNode;
			try {
				doc = parse(template.text, options.parseOptions);
			} catch {
				return; // gql-parse reports syntax errors
			}

			for (const def of doc.definitions) {
				if (def.kind !== 'OperationDefinition') continue;
				if (options.ignoreOperations.includes(def.operation)) continue;
				if (def.name) continue;

				const gqlLoc = def.loc ? getLocation(def.loc.source, def.loc.start) : undefined;
				context.report({
					node,
					loc: gqlLoc ? mapGraphQlLoc(template, gqlLoc) : undefined,
					messageId: 'operationMustBeNamed',
					data: { kind: def.operation },
				});
			}
		};

		return {
			TaggedTemplateExpression(node) {
				const tagName = getGqlTagName(node.tag);
				if (!tagName || !isGqlTag(tagName, options.tags)) return;
				check(extractTemplate(node), node);
			},
			CallExpression(node) {
				if (!options.checkTypedQueries) return;
				if (!isCreateTypedQuery(node.callee)) return;
				const arg = node.arguments.at(0);
				if (arg?.type !== 'Literal') return;
				const template = extractStringLiteral(arg);
				if (!template) return;
				check(template, arg);
			},
		};
	},
};
