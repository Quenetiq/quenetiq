import type { ParseOptions } from 'graphql';
import type { TSESTree } from '@typescript-eslint/utils';

export interface ExtractedTemplate {
	/** GraphQL source passed to `parse()`. */
	text: string;
	/** ESLint loc (1-based line, 0-based column) of the first character of the document. */
	start: { line: number; column: number };
	/** Whether the template contains `${...}` interpolations (unparseable statically). */
	hasInterpolation: boolean;
}

export interface SourcePosition {
	line: number;
	column: number;
}

export type GqlOperationKind = 'query' | 'mutation' | 'subscription';

/** `graphql.parse()` options exposed to rule consumers. `lexer` is internal and omitted. */
export type GqlParseOptions = Omit<ParseOptions, 'lexer'>;

/**
 * Options shared by every `quenetiq/gql-*` rule.
 *
 * All options are optional; defaults are tuned for the Quenetiq feature set:
 * `gql`/`graphql` tagged templates, `createTypedQuery()` strings, fragment
 * composition via `${...}` interpolation, and per-file overrides.
 */
export interface GqlRuleOptions {
	/**
	 * Tag names treated as GraphQL tagged templates.
	 * Default: `['gql', 'graphql']`.
	 */
	tags?: readonly string[];
	/**
	 * Also validate string literals passed to `createTypedQuery()`.
	 * Default: `true`.
	 */
	checkTypedQueries?: boolean;
	/**
	 * Skip templates that contain `${...}` interpolations — they cannot be
	 * statically parsed and are a supported fragment-composition feature.
	 * Default: `true`.
	 */
	skipInterpolated?: boolean;
	/**
	 * Fully disable the rule. Escape hatch for per-file overrides that want to
	 * keep the plugin registered. Default: `false`.
	 */
	disabled?: boolean;
	/**
	 * Options passed through to `graphql.parse()` — e.g. `maxTokens`,
	 * `experimentalFragmentArguments`. Default: `undefined`.
	 */
	parseOptions?: GqlParseOptions;
}

export interface GqlNamedOperationsOptions extends GqlRuleOptions {
	/**
	 * Allow anonymous operations. Default: `false`.
	 */
	allowAnonymous?: boolean;
	/**
	 * Operation kinds exempt from the naming requirement.
	 * Default: `[]`.
	 */
	ignoreOperations?: readonly GqlOperationKind[];
	/**
	 * Skip `*.spec.*` test files. Default: `false`.
	 */
	allowInSpec?: boolean;
}

/**
 * JSON schema properties for the options shared by every `quenetiq/gql-*` rule.
 * Spread into each rule's `meta.schema` alongside its rule-specific options.
 */
export const GQL_OPTIONS_SCHEMA_PROPERTIES = {
	tags: {
		type: 'array',
		items: { type: 'string' },
		description: 'Tag names treated as GraphQL templates. Default: ["gql", "graphql"]',
	},
	checkTypedQueries: {
		type: 'boolean',
		description: 'Also check createTypedQuery() strings. Default: true',
	},
	skipInterpolated: {
		type: 'boolean',
		description: 'Skip templates with ${...} interpolation. Default: true',
	},
	disabled: {
		type: 'boolean',
		description: 'Disable the rule entirely. Default: false',
	},
	parseOptions: {
		type: 'object',
		additionalProperties: false,
		properties: {
			noLocation: {
				type: 'boolean',
				description: 'Do not attach AST location info (graphql.parse). Default: false',
			},
			maxTokens: {
				type: 'number',
				description: 'Reject documents with more tokens (graphql.parse). Default: undefined',
			},
			experimentalFragmentArguments: {
				type: 'boolean',
				description: 'Parse fragment variable definitions / spread arguments. Default: false',
			},
		},
		description: 'Options passed through to graphql.parse()',
	},
} as const;

export interface ResolvedGqlOptions {
	tags: readonly string[];
	checkTypedQueries: boolean;
	skipInterpolated: boolean;
	disabled: boolean;
	parseOptions: GqlParseOptions | undefined;
}

export interface ResolvedGqlNamedOptions extends ResolvedGqlOptions {
	allowAnonymous: boolean;
	ignoreOperations: readonly GqlOperationKind[];
	allowInSpec: boolean;
}

export const DEFAULT_GQL_TAGS = ['gql', 'graphql'] as const;

export function resolveGqlOptions(raw: GqlRuleOptions | undefined): ResolvedGqlOptions {
	return {
		tags: raw?.tags && raw.tags.length > 0 ? raw.tags : DEFAULT_GQL_TAGS,
		checkTypedQueries: raw?.checkTypedQueries ?? true,
		skipInterpolated: raw?.skipInterpolated ?? true,
		disabled: raw?.disabled ?? false,
		parseOptions: raw?.parseOptions,
	};
}

export function resolveGqlNamedOptions(
	raw: GqlNamedOperationsOptions | undefined,
): ResolvedGqlNamedOptions {
	return {
		...resolveGqlOptions(raw),
		allowAnonymous: raw?.allowAnonymous ?? false,
		ignoreOperations: raw?.ignoreOperations ?? [],
		allowInSpec: raw?.allowInSpec ?? false,
	};
}

export function getGqlTagName(tag: TSESTree.TaggedTemplateExpression['tag']): string | null {
	if (tag.type === 'Identifier') return tag.name;
	if (tag.type === 'MemberExpression' && !tag.computed && tag.property.type === 'Identifier') {
		return tag.property.name;
	}
	return null;
}

export function isGqlTag(tagName: string, tags: readonly string[]): boolean {
	return tags.includes(tagName);
}

export function isSpecFile(filename: string): boolean {
	return /\.spec\.[cm]?[jt]sx?$/.test(filename);
}

export function extractTemplate(node: TSESTree.TaggedTemplateExpression): ExtractedTemplate {
	const quasis = node.quasi.quasis;
	const text = quasis.map((q) => q.value.cooked ?? q.value.raw).join('${}');
	const first = quasis[0];
	return {
		text,
		start: { line: first.loc.start.line, column: first.loc.start.column },
		hasInterpolation: quasis.length > 1,
	};
}

export function extractStringLiteral(node: TSESTree.Literal): ExtractedTemplate | null {
	if (typeof node.value !== 'string') return null;
	return {
		text: node.value,
		start: { line: node.loc.start.line, column: node.loc.start.column + 1 },
		hasInterpolation: false,
	};
}

/**
 * Map a `graphql` parser position (1-based line, 1-based column) back to an
 * ESLint source location (1-based line, 0-based column) inside a template.
 */
export function mapGraphQlLoc(template: ExtractedTemplate, gqlLoc: SourcePosition): SourcePosition {
	const line = template.start.line + gqlLoc.line - 1;
	if (gqlLoc.line === 1) {
		return { line, column: template.start.column + (gqlLoc.column - 1) };
	}
	return { line, column: gqlLoc.column - 1 };
}

export function isCreateTypedQuery(callee: TSESTree.Expression): boolean {
	if (callee.type === 'Identifier') return callee.name === 'createTypedQuery';
	if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') {
		return callee.property.name === 'createTypedQuery';
	}
	return false;
}
