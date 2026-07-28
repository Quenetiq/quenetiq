import {
	parse,
	buildSchema,
	type GraphQLSchema,
	type GraphQLType,
	type SelectionSetNode,
	type FieldNode,
	getNamedType,
	isObjectType,
	isListType,
	isEnumType,
	isNonNullType,
} from 'graphql';
import { of } from 'rxjs';
import { delay as rxDelay } from 'rxjs/operators';
import { type GraphqlMiddleware, type GraphqlRequestContext, type GraphQLResult } from '@quenetiq/core';

export interface AutoMockConfig {
	schema?: string;
	mocks?: Record<string, MockResolver>;
	delay?: number;
	passthrough?: boolean;
}

export type MockResolver = (fieldName: string, args: Record<string, unknown>) => unknown;

interface MockContext {
	schema: GraphQLSchema | undefined;
	mocks: Record<string, MockResolver>;
	counters: Map<string, number>;
}

const schemaCache = new Map<string, GraphQLSchema>();

function getOrBuildSchema(sdl: string): GraphQLSchema {
	const cached = schemaCache.get(sdl);
	if (cached) return cached;
	const schema = buildSchema(sdl);
	schemaCache.set(sdl, schema);
	return schema;
}

function nextId(ctx: MockContext, key: string): string {
	const next = (ctx.counters.get(key) ?? 0) + 1;
	ctx.counters.set(key, next);
	return String(next);
}

function mockScalarValue(namedType: ReturnType<typeof getNamedType>, fieldName: string, ctx: MockContext): unknown {
	if (isEnumType(namedType)) {
		const values = namedType.getValues();
		return values.length > 0 ? values[0].value : 'ENUM_VALUE';
	}

	const typeName = namedType.name;
	if (ctx.mocks[typeName]) return ctx.mocks[typeName](fieldName, {});

	switch (typeName) {
	case 'String':
		return `Sample ${fieldName}`;
	case 'Int':
		return Math.floor(Math.random() * 999) + 1;
	case 'Float':
		return parseFloat((Math.random() * 999 + 0.01).toFixed(2));
	case 'Boolean':
		return true;
	case 'ID':
		return nextId(ctx, fieldName);
	default:
		return `mock-${typeName}`;
	}
}

function mockObjectValue(
	typeObj: ReturnType<typeof getNamedType>,
	selectionSet: SelectionSetNode | undefined,
	ctx: MockContext,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	if (!selectionSet) return result;

	for (const selection of selectionSet.selections) {
		if (selection.kind === 'Field') {
			const field = selection as FieldNode;
			const fieldName = field.name.value;
			const alias = field.alias?.value ?? fieldName;

			if (fieldName === '__typename') {
				result[alias] = typeObj.name;
				continue;
			}

			let fieldType: GraphQLType | undefined;
			if (isObjectType(typeObj)) {
				const fieldDef = typeObj.getFields()[fieldName];
				if (fieldDef) fieldType = fieldDef.type;
			}

			result[alias] = mockValue(fieldType, fieldName, field.selectionSet, ctx);
		} else if (selection.kind === 'InlineFragment') {
			const inlineFrag = selection as unknown as {
				typeCondition?: { name: { value: string } };
				selectionSet: SelectionSetNode;
			};
			const typeName = inlineFrag.typeCondition?.name.value;
			if (typeName && ctx.schema) {
				const t = ctx.schema.getType(typeName);
				if (t) Object.assign(result, mockObjectValue(t, inlineFrag.selectionSet, ctx));
			} else {
				const sub = mockValue(undefined, '<fragment>', inlineFrag.selectionSet, ctx);
				if (sub && typeof sub === 'object') Object.assign(result, sub);
			}
		}
	}

	return result;
}

function mockValue(
	type: GraphQLType | undefined,
	fieldName: string,
	selectionSet: SelectionSetNode | undefined,
	ctx: MockContext,
): unknown {
	if (!type) {
		if (fieldName === 'id' || fieldName.endsWith('Id') || fieldName.endsWith('ID')) {
			return nextId(ctx, fieldName);
		}
		if (selectionSet) {
			return mockObjectValue({ name: fieldName } as ReturnType<typeof getNamedType>, selectionSet, ctx);
		}
		return `Sample ${fieldName}`;
	}

	let innerType: GraphQLType = type;
	if (isNonNullType(innerType)) innerType = innerType.ofType;

	if (isListType(innerType)) {
		const itemType = innerType.ofType;
		const count = 2;
		const items: unknown[] = [];
		let itemNamed = itemType;
		if (isNonNullType(itemNamed)) itemNamed = itemNamed.ofType;
		const named = getNamedType(itemNamed);

		for (let i = 0; i < count; i++) {
			items.push(
				isObjectType(named)
					? mockObjectValue(named, selectionSet, ctx)
					: mockScalarValue(named, fieldName, ctx),
			);
		}
		return items;
	}

	const namedType = getNamedType(innerType);
	if (ctx.mocks[namedType.name]) return ctx.mocks[namedType.name](fieldName, {});
	if (isObjectType(namedType)) return mockObjectValue(namedType, selectionSet, ctx);
	return mockScalarValue(namedType, fieldName, ctx);
}

function generateMockData(request: GraphqlRequestContext, config: AutoMockConfig): GraphQLResult<unknown> | null {
	let schema: GraphQLSchema | undefined;
	if (config.schema) {
		try {
			schema = getOrBuildSchema(config.schema);
		} catch {
			/* invalid, proceed without */
		}
	}

	const ctx: MockContext = {
		schema,
		mocks: config.mocks ?? {},
		counters: new Map(),
	};

	try {
		const doc = parse(request.query);
		const def = doc.definitions[0];
		if (!def || def.kind !== 'OperationDefinition') return null;

		let rootType: ReturnType<typeof getNamedType> | undefined;
		if (schema) {
			const name = def.operation === 'mutation' ? 'Mutation' : 'Query';
			const t = schema.getType(name);
			if (t) rootType = t;
		}

		const data = mockObjectValue(
			rootType ?? ({ name: 'Query' } as ReturnType<typeof getNamedType>),
			def.selectionSet,
			ctx,
		);
		return { status: 'success', data: data as Record<string, unknown> };
	} catch {
		return null;
	}
}

export function autoMockMiddleware(config?: AutoMockConfig): GraphqlMiddleware {
	const resolved: AutoMockConfig = {
		schema: config?.schema,
		mocks: config?.mocks,
		delay: config?.delay ?? 0,
		passthrough: config?.passthrough ?? true,
	};

	return (request, next) => {
		if (request.type !== 'query' && request.type !== 'mutation') return next(request);

		const mockResult = generateMockData(request, resolved);

		if (mockResult) {
			let obs$ = of<GraphQLResult<unknown>>(mockResult);
			if (resolved.delay && resolved.delay > 0) {
				obs$ = obs$.pipe(rxDelay(resolved.delay));
			}
			return obs$;
		}

		if (resolved.passthrough) return next(request);

		return of<GraphQLResult<unknown>>({
			status: 'error',
			error: 'Auto-mock: unable to generate mock data. Provide a schema or enable passthrough.',
		});
	};
}
