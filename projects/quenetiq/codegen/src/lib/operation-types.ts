import { parse, type DocumentNode, type OperationDefinitionNode, type VariableDefinitionNode } from 'graphql';

export interface OperationInfo {
	name: string;
	type: 'query' | 'mutation' | 'subscription';
	variables: { name: string; type: string }[];
	fields: string[];
}

/**
 * Extract operation info from a GraphQL document string.
 */
export function parseOperation(document: string): OperationInfo | null {
	let doc: DocumentNode;
	try {
		doc = parse(document);
	} catch {
		return null;
	}

	const def = doc.definitions.find((d) => d.kind === 'OperationDefinition') as OperationDefinitionNode | undefined;

	if (!def) return null;

	const name = def.name?.value;
	if (!name) return null;

	const variables = (def.variableDefinitions ?? []).map((v: VariableDefinitionNode) => {
		const varType = v.type as { kind: string; name?: { value: string }; type?: unknown };
		const typeName = varType.name?.value ?? serializeTypeRef(v.type);
		return { name: v.variable.name.value, type: typeName };
	});

	return {
		name,
		type: def.operation as 'query' | 'mutation' | 'subscription',
		variables,
		fields: [],
	};
}

function serializeTypeRef(typeRef: unknown): string {
	let current = typeRef as Record<string, unknown> | null;
	let result = '';
	while (current) {
		if (current.kind === 'NonNullType') {
			result += '!';
			current = current.type as Record<string, unknown> | null;
		} else if (current.kind === 'ListType') {
			result = `[${result}`;
			current = current.type as Record<string, unknown> | null;
		} else if (current.name) {
			result = (current.name as { value: string }).value + result;
			break;
		} else {
			break;
		}
	}
	return result;
}

export interface TypedOperationConfig {
	operationResultPrefix?: string;
	operationResultSuffix?: string;
}

/**
 * Generate TypeScript code for typed operations.
 * Each operation gets an export that returns a TypedDocumentNode.
 */
export function generateOperationTypes(operations: OperationInfo[], config?: TypedOperationConfig): string {
	const prefix = config?.operationResultPrefix ?? '';
	const suffix = config?.operationResultSuffix ?? '';

	const lines: string[] = [
		'// Auto-generated operation types by @quenetiq/codegen. DO NOT EDIT.\n',
		'import { gql, type TypedDocumentNode } from "@quenetiq/core";\n',
	];

	for (const op of operations) {
		const resultTypeName = `${prefix}${op.name}${suffix}` || `${op.name}Result`;
		const varTypeName = `${op.name}Variables`;

		// Variables interface
		if (op.variables.length > 0) {
			lines.push(`export interface ${varTypeName} {`);
			for (const v of op.variables) {
				lines.push(`  ${v.name}: ${mapGraphqlTypeToTs(v.type)};`);
			}
			lines.push('}\n');
		}

		// Result type
		lines.push(`export interface ${resultTypeName} {`);
		// We can't know nested fields without full schema, so use generic
		lines.push('  [key: string]: unknown;');
		lines.push('}\n');

		// Typed document
		const varGeneric = op.variables.length > 0 ? varTypeName : 'Record<string, never>';
		lines.push(`export const ${op.name}: TypedDocumentNode<${resultTypeName}, ${varGeneric}> =`);
		lines.push(`  gql\`${'  '}${op.type} ${op.name} { ... }\` as TypedDocumentNode<${resultTypeName}, ${varGeneric}>;`);
		lines.push('');
	}

	return lines.join('\n');
}

function mapGraphqlTypeToTs(gqlType: string): string {
	const base = gqlType.replace(/[!\]\[]/g, '');
	const isArray = gqlType.startsWith('[');
	const isNonNull = !gqlType.endsWith('!');

	const scalarMap: Record<string, string> = {
		String: 'string',
		Int: 'number',
		Float: 'number',
		Boolean: 'boolean',
		ID: 'string',
	};

	let ts = scalarMap[base] || base;
	if (isArray) ts = `${ts}[]`;
	return isNonNull ? `${ts} | null | undefined` : ts;
}
