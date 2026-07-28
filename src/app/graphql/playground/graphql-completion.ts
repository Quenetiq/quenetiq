import {
	type CompletionContext,
	type CompletionResult,
	type Completion,
	autocompletion,
} from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import {
	type GraphQLSchema,
	type GraphQLObjectType,
	type GraphQLType,
	isObjectType,
	isInputObjectType,
	isEnumType,
	isNonNullType,
	isListType,
} from 'graphql';

function unwrapType(type: GraphQLType): GraphQLType {
	if (isNonNullType(type) || isListType(type)) {
		return unwrapType(type.ofType);
	}
	return type;
}

function formatType(type: GraphQLType): string {
	if (isNonNullType(type)) return `${formatType(type.ofType)}!`;
	if (isListType(type)) return `[${formatType(type.ofType)}]`;
	return type.toString();
}

function lastIdentifier(ctx: string): string | null {
	const matches = ctx.matchAll(/(\w+)\s*(?:\(|$)/g);
	let last: string | null = null;
	for (const m of matches) last = m[1];
	return last;
}

function resolveFieldType(
	schema: GraphQLSchema,
	parentType: GraphQLObjectType,
	fieldName: string,
): GraphQLObjectType | null {
	const field = parentType.getFields()[fieldName];
	if (!field) return null;
	const named = unwrapType(field.type);
	return isObjectType(named) ? named : null;
}

function resolveCurrentType(
	schema: GraphQLSchema,
	before: string,
): GraphQLObjectType | null {
	interface Brace { pos: number; depth: number }
	const braces: Brace[] = [];
	let depth = 0;

	for (let i = before.length - 1; i >= 0; i--) {
		if (before[i] === '}') {
			depth++;
		} else if (before[i] === '{') {
			braces.push({ pos: i, depth });
			depth--;
		}
	}

	braces.reverse();

	let currentType: GraphQLObjectType | null = null;

	for (const brace of braces) {
		const ctx = before.slice(0, brace.pos).trimEnd();

		if (!currentType) {
			const onMatch = ctx.match(/on\s+(\w+)\s*$/);
			if (onMatch) {
				const type = schema.getType(onMatch[1]);
				if (type && isObjectType(type)) currentType = type;
			}

			if (!currentType) {
				const opMatch = ctx.match(
					/(?:query|mutation|subscription)(?:\s+\w+)?(?:\([^)]*\))?\s*$/,
				);
				if (opMatch) {
					const kw = opMatch[0].trimStart();
					if (kw.startsWith('query')) currentType = schema.getQueryType() ?? null;
					else if (kw.startsWith('mutation')) currentType = schema.getMutationType() ?? null;
					else if (kw.startsWith('subscription')) currentType = schema.getSubscriptionType() ?? null;
				}
			}

			if (!currentType) {
				const typeName = lastIdentifier(ctx);
				if (typeName) {
					const type = schema.getType(typeName);
					if (type && isObjectType(type)) currentType = type;
				}
			}
		} else {
			const fieldName = lastIdentifier(ctx);
			if (fieldName) {
				const resolved = resolveFieldType(
					schema,
					currentType,
					fieldName,
				);
				if (resolved) currentType = resolved;
			}
		}
	}

	return currentType;
}

function getIndent(before: string): string {
	const lastNewline = before.lastIndexOf('\n');
	if (lastNewline === -1) return '';
	const line = before.slice(lastNewline + 1);
	const match = line.match(/^(\s*)/);
	return match ? match[1] : '';
}

function isInsideSelectionSet(before: string): boolean {
	let depth = 0;
	for (let i = before.length - 1; i >= 0; i--) {
		if (before[i] === '}') depth++;
		if (before[i] === '{') depth--;
	}
	return depth < 0;
}

function isInArgsContext(before: string): boolean {
	let parenDepth = 0;
	for (let i = before.length - 1; i >= 0; i--) {
		if (before[i] === ')') parenDepth++;
		if (before[i] === '(') parenDepth--;
	}
	return parenDepth < 0;
}

function isInsideInputObject(before: string): boolean {
	let braceDepth = 0;
	for (let i = before.length - 1; i >= 0; i--) {
		if (before[i] === '}') braceDepth++;
		if (before[i] === '{') braceDepth--;
	}
	return braceDepth < 0;
}

function resolveArgType(
	schema: GraphQLSchema,
	before: string,
): { argName: string; argType: GraphQLType } | null {
	const lastParen = before.lastIndexOf('(');
	if (lastParen < 0) return null;

	const beforeParen = before.slice(0, lastParen).trimEnd();
	const fieldMatch = beforeParen.match(/(\w+)\s*$/);
	if (!fieldMatch) return null;
	const fieldName = fieldMatch[1];

	const currentType = resolveCurrentType(schema, before.slice(0, lastParen + 1));
	if (!currentType) return null;

	const afterParen = before.slice(lastParen + 1);
	const colonMatch = afterParen.match(/(\w+)\s*:/);
	if (!colonMatch) return null;
	const argName = colonMatch[1];

	const field = currentType.getFields()[fieldName];
	if (!field) return null;

	const arg = field.args.find((a) => a.name === argName);
	if (!arg) return null;

	return { argName, argType: arg.type };
}

function getInputFieldCompletions(
	schema: GraphQLSchema,
	inputTypeName: string,
): Completion[] {
	const named = schema.getType(inputTypeName);
	if (!named || !isInputObjectType(named)) return [];

	const fields = named.getFields();
	return Object.values(fields).map((f) => ({
		label: f.name,
		type: 'property',
		detail: formatType(f.type),
		info: f.description ?? undefined,
	}));
}

function buildFieldCompletions(
	objType: GraphQLObjectType,
	indent: string,
): Completion[] {
	return Object.values(objType.getFields()).map((field) => {
		const args = field.args.length > 0
			? `(${field.args.map((a) => `${a.name}: ${formatType(a.type)}`).join(', ')})`
			: '';
		const namedType = unwrapType(field.type);
		const isObject = isObjectType(namedType);

		return {
			label: field.name,
			type: 'property',
			detail: formatType(field.type) + args,
			info: field.description ?? undefined,
			apply(
				view: EditorView,
				_completion: Completion,
				from: number,
				to: number,
			): void {
				if (isObject) {
					const snippet = `${field.name}${args} {\n${indent}\t\n${indent}}`;
					const cursorOffset = snippet.length - indent.length - 2;
					view.dispatch({
						changes: { from, to, insert: snippet },
						selection: { anchor: from + cursorOffset },
					});
				} else {
					const snippet = `${field.name}${args}`;
					view.dispatch({
						changes: { from, to, insert: snippet },
						selection: { anchor: from + snippet.length },
					});
				}
			},
		};
	});
}

function getEnumCompletions(
	schema: GraphQLSchema,
	typeName: string,
): Completion[] {
	const type = schema.getType(typeName);
	if (!type || !isEnumType(type)) return [];
	return type.getValues().map((v) => ({
		label: v.name,
		type: 'constant',
		info: v.description ?? undefined,
	}));
}

const KEYWORDS: Completion[] = [
	{ label: 'query', type: 'keyword' },
	{ label: 'mutation', type: 'keyword' },
	{ label: 'subscription', type: 'keyword' },
	{ label: 'fragment', type: 'keyword' },
	{ label: 'on', type: 'keyword' },
	{ label: 'true', type: 'keyword' },
	{ label: 'false', type: 'keyword' },
	{ label: 'null', type: 'keyword' },
];

type CompletionFn = (context: CompletionContext) => CompletionResult | null;

export function graphqlCompletionSource(
	getSchema: () => GraphQLSchema | null,
): CompletionFn {
	return (context: CompletionContext): CompletionResult | null => {
		const word = context.matchBefore(/[\w@]*/);
		if (!word && !context.explicit) return null;

		const from = word ? word.from : context.pos;
		const query = context.state.doc.toString();
		const before = query.slice(0, context.pos);
		const token = word ? word.text : '';
		const schema = getSchema();

		if (token.startsWith('@')) {
			if (!schema) return null;
			return {
				from,
				options: schema.getDirectives().map((d) => ({
					label: `@${d.name}`,
					type: 'keyword',
					info: d.description ?? undefined,
				})),
			};
		}

		if (before.trimEnd().endsWith('@')) {
			if (!schema) return null;
			return {
				from,
				options: schema.getDirectives().map((d) => ({
					label: `@${d.name}`,
					type: 'keyword',
					info: d.description ?? undefined,
				})),
			};
		}

		if (!schema) {
			return { from, options: KEYWORDS };
		}

		const indent = getIndent(before);
		const options: Completion[] = [];

		if (isInArgsContext(before)) {
			const lastParen = before.lastIndexOf('(');
			if (lastParen >= 0) {
				const afterParen = before.slice(lastParen + 1);

				if (afterParen.includes(':')) {
					const argInfo = resolveArgType(schema, before);

					if (isInsideInputObject(afterParen) && argInfo) {
						const namedType = unwrapType(argInfo.argType);
						const inputTypeName =
							'name' in namedType ? namedType.name : '';
						options.push(
							...getInputFieldCompletions(schema, inputTypeName),
						);
					} else if (argInfo) {
						const namedType = unwrapType(argInfo.argType);
						if (isEnumType(namedType)) {
							options.push(
								...getEnumCompletions(schema, namedType.name),
							);
						} else {
							const allTypes = Object.values(schema.getTypeMap())
								.filter((t) => !t.name.startsWith('__'))
								.map((t) => ({
									label: t.name,
									type: 'type' as const,
									info: t.description ?? undefined,
								}));
							options.push(...allTypes);
						}
						options.push(
							...KEYWORDS.filter(
								(k) => k.label === 'true' || k.label === 'false' || k.label === 'null',
							),
						);
					}
				} else {
					const currentType = resolveCurrentType(schema, before);
					if (currentType) {
						const argNameMatch = afterParen.match(/(\w+)\s*$/);
						if (argNameMatch) {
							for (const field of Object.values(currentType.getFields())) {
								const lastArg = field.args.find(
									(a) => a.name === argNameMatch[1],
								);
								if (lastArg) {
									options.push({
										label: lastArg.name,
										type: 'property',
										detail: formatType(lastArg.type),
									});
								}
							}
						} else {
							for (const field of Object.values(currentType.getFields())) {
								for (const arg of field.args) {
									options.push({
										label: arg.name,
										type: 'property',
										detail: formatType(arg.type),
									});
								}
							}
						}
					}
				}
			}
		} else if (before.trimEnd().endsWith(':')) {
			const allTypes = Object.values(schema.getTypeMap())
				.filter((t) => !t.name.startsWith('__'))
				.map((t) => ({
					label: t.name,
					type: 'type' as const,
					info: t.description ?? undefined,
				}));
			options.push(...allTypes);
		} else if (before.trimEnd().endsWith('on ')) {
			const allTypes = Object.values(schema.getTypeMap())
				.filter((t) => !t.name.startsWith('__'))
				.map((t) => ({
					label: t.name,
					type: 'type' as const,
					info: t.description ?? undefined,
				}));
			options.push(...allTypes);
		} else if (isInsideSelectionSet(before)) {
			const currentType = resolveCurrentType(schema, before);
			if (currentType) {
				options.push(...buildFieldCompletions(currentType, indent));
			} else {
				const queryType = schema.getQueryType();
				if (queryType) {
					options.push(...buildFieldCompletions(queryType, indent));
				}
			}
		} else {
			options.push(...KEYWORDS);
			const allTypes = Object.values(schema.getTypeMap())
				.filter((t) => !t.name.startsWith('__'))
				.map((t) => ({
					label: t.name,
					type: 'type' as const,
					info: t.description ?? undefined,
				}));
			options.push(...allTypes);
			options.push(
				...schema.getDirectives().map((d) => ({
					label: `@${d.name}`,
					type: 'keyword' as const,
					info: d.description ?? undefined,
				})),
			);
		}

		const seen = new Set<string>();
		const unique = options.filter((c) => {
			if (seen.has(c.label)) return false;
			seen.add(c.label);
			return true;
		});

		return { from, options: unique };
	};
}

export { autocompletion };
