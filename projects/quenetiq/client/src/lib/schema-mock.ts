import {
	buildSchema,
	buildClientSchema,
	printSchema,
	parse,
	visit,
	visitWithTypeInfo,
	TypeInfo,
	type GraphQLSchema,
	type DocumentNode,
	type GraphQLOutputType,
	type GraphQLObjectType,
	getNamedType,
	isObjectType,
	isScalarType,
	isEnumType,
	isUnionType,
	isListType,
	isNonNullType,
	GraphQLEnumType,
} from 'graphql';

const counter = new Map<string, number>();

function nextId(type: string): number {
	const n = (counter.get(type) ?? 0) + 1;
	counter.set(type, n);
	return n;
}

const scalarMocks: Record<string, () => unknown> = {
	String: () => 'hello world',
	ID: () => `mock-id-${nextId('ID')}`,
	Int: () => 42,
	Float: () => 3.14,
	Boolean: () => true,
};

function mockForType(
	type: GraphQLOutputType,
	schema: GraphQLSchema,
	depth = 0,
	typeMocks?: Record<string, (typeName: string) => unknown>,
): unknown {
	if (isNonNullType(type)) {
		return mockForType(type.ofType, schema, depth, typeMocks);
	}

	if (isListType(type)) {
		const item = mockForType(type.ofType, schema, depth, typeMocks);
		return [item, item];
	}

	const named = getNamedType(type);

	if (isScalarType(named)) {
		const mockFn = typeMocks?.[named.name] ?? scalarMocks[named.name as keyof typeof scalarMocks];
		return mockFn ? mockFn(named.name) : 'mock-value';
	}

	if (isEnumType(named)) {
		const values = (named as GraphQLEnumType).getValues();
		return values[0]?.value ?? 'mock-enum';
	}

	if (isUnionType(named)) {
		const types = named.getTypes();
		if (types.length === 0) return {};
		return mockObjectType(types[0], schema, depth + 1, typeMocks);
	}

	if (isObjectType(named)) {
		return mockObjectType(named as GraphQLObjectType, schema, depth + 1, typeMocks);
	}

	return {};
}

function mockObjectType(
	type: GraphQLObjectType,
	schema: GraphQLSchema,
	depth = 0,
	typeMocks?: Record<string, (typeName: string) => unknown>,
): Record<string, unknown> {
	if (depth > 5) return {};

	const typeName = type.name;
	const customMock = typeMocks?.[typeName];
	if (customMock) {
		const result = customMock(typeName);
		if (result && typeof result === 'object') return result as Record<string, unknown>;
	}

	const result: Record<string, unknown> = {};
	const fields = type.getFields();

	for (const [fieldName, field] of Object.entries(fields)) {
		result[fieldName] = mockForType(field.type, schema, depth, typeMocks);
	}

	if (typeName !== 'Query' && typeName !== 'Mutation' && typeName !== 'Subscription') {
		result.__typename = typeName;
		result.id ??= `mock-${typeName.toLowerCase()}-${nextId(typeName)}`;
	}

	return result;
}

function extractOperationFields(
	schema: GraphQLSchema,
	document: DocumentNode,
	typeMocks?: Record<string, (typeName: string) => unknown>,
): Record<string, unknown> {
	const typeInfo = new TypeInfo(schema);
	const result: Record<string, unknown> = {};

	visit(document, visitWithTypeInfo(typeInfo, {
		Field: {
			enter(node) {
				const parentType = typeInfo.getParentType();
				const fieldDef = typeInfo.getFieldDef();

				if (!fieldDef || !parentType) return;
				if (node.name.value === '__typename') {
					result.__typename = parentType.name;
					return;
				}

				const returnType = fieldDef.type;
				result[node.name.value] = mockForType(returnType, schema, 0, typeMocks);
			},
		},
	}));

	return result;
}

export interface SchemaMockOptions {
	schema: string;
	typeMocks?: Record<string, (typeName: string) => unknown>;
}

export interface SchemaMockResult {
	getType(name: string): string | undefined;
	mockQuery(query: string): Record<string, unknown>;
	mockMutation(query: string): Record<string, unknown>;
	mockType(typeName: string): Record<string, unknown>;
}

export function createSchemaMock(options: SchemaMockOptions): SchemaMockResult {
	const schema = buildSchema(options.schema);
	const typeMocks = options.typeMocks;

	return {
		getType(name: string): string | undefined {
			const type = schema.getType(name);
			return type?.description ?? undefined;
		},

		mockQuery(query: string): Record<string, unknown> {
			const doc = parse(query);
			return extractOperationFields(schema, doc, typeMocks);
		},

		mockMutation(query: string): Record<string, unknown> {
			return this.mockQuery(query);
		},

		mockType(typeName: string): Record<string, unknown> {
			const type = schema.getType(typeName);
			if (!type || !isObjectType(type)) return {};
			return mockObjectType(type as GraphQLObjectType, schema, 0, typeMocks);
		},
	};
}

export function createSchemaFromIntrospection(introspectionResult: {
	data: { __schema: Record<string, unknown> };
}): string {
	const schema = buildClientSchema(introspectionResult.data as never);
	return printSchema(schema);
}
